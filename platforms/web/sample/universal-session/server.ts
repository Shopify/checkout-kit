import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import {
  canonicalBareDomain,
  CHECKOUT_ENVIRONMENTS,
  isAllowedShopDomain,
  isBuyerCountry,
  isCheckoutEnvironment,
  isContinuationUrl,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  MAX_SESSION_STORES,
  SAMPLE_API_PATHS,
  STOREFRONT_API_VERSION,
  type BuyerCountry,
  type CheckoutEnvironment,
  type SampleConfiguration,
  type SessionFailureCode,
  type SessionStage,
} from "./api";
import { loadSampleEnvironment, type SampleEnvironment } from "./environment";

// The largest valid session request (MAX_SESSION_STORES stores of MAX_CART_LINES
// lines, with the longest domains, variant IDs, and quantities) is about 43 KB.
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
const VARIANT_ID = /^[1-9][0-9]{0,19}$/;

const CURRENCY_PREVIEW = `query UniversalSessionSampleCurrency($country: CountryCode!) @inContext(country: $country) {
  products(first: 1) { nodes { priceRange { minVariantPrice { currencyCode } } } }
}`;

// Without a buyer country, the storefront's default market decides the currency.
const DEFAULT_MARKET_CURRENCY_PREVIEW = `query UniversalSessionSampleDefaultCurrency {
  products(first: 1) { nodes { priceRange { minVariantPrice { currencyCode } } } }
}`;

const CART_FIELDS = `cart { id cost { totalAmount { currencyCode } } } userErrors { code field }`;
const CART_CREATE = `mutation UniversalSessionSampleCartCreate($input: CartInput!) {
  cartCreate(input: $input) { ${CART_FIELDS} }
}`;
const CART_CREATE_IN_COUNTRY = `mutation UniversalSessionSampleCartCreate($input: CartInput!, $country: CountryCode!) @inContext(country: $country) {
  cartCreate(input: $input) { ${CART_FIELDS} }
}`;

export interface SessionDestination {
  createUrl: string;
  continuationHost: string;
}

export interface SampleServerOptions {
  storefrontDomain?: string;
  /** Configured storefronts to seed the stores list. */
  storeDomains?: string[];
  /** Exact domains allowed in addition to production `*.myshopify.com` shops. */
  allowedShopDomains: ReadonlySet<string>;
  sessions: Partial<Record<CheckoutEnvironment, SessionDestination>>;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

export interface SampleApiResult {
  status: number;
  payload: Record<string, unknown>;
}

interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

function failure(status: number, error: SessionFailureCode, stage?: SessionStage): SampleApiResult {
  return { status, payload: stage ? { error, stage } : { error } };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("Upstream response exceeds the sample limit");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing upstream response body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error("Upstream response exceeds the sample limit");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8")) as unknown;
}

function responseFailure(response: Response, stage: SessionStage): SampleApiResult {
  if (response.status >= 300 && response.status < 400) {
    return failure(502, "upstream_redirect", stage);
  }
  if (response.status === 429) return failure(429, "rate_limited", stage);
  if (stage === "cart" && response.status === 422) return failure(422, "cart_rejected", stage);
  if (stage === "session") {
    if (response.status === 400 || response.status === 401) {
      return failure(422, "session_rejected", stage);
    }
    if (response.status === 403) return failure(403, "session_access_denied", stage);
    if (response.status === 422) return failure(422, "session_ineligible", stage);
    if (response.status >= 500) return failure(502, "upstream_unavailable", stage);
  }
  return failure(502, "upstream_rejected", stage);
}

async function fetchUpstream(
  url: string,
  body: unknown,
  options: SampleServerOptions,
): Promise<Response | null> {
  try {
    return await (options.fetcher ?? fetch)(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      redirect: "manual",
      cache: "no-store",
      signal: options.signal,
    });
  } catch {
    return null;
  }
}

function cartLines(value: unknown): CartLineInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CART_LINES) return null;
  const lines: CartLineInput[] = [];
  const seen = new Set<string>();
  for (const line of value) {
    const entry = record(line);
    const variantId = entry?.["variantId"];
    const quantity = entry?.["quantity"];
    if (
      typeof variantId !== "string" ||
      !VARIANT_ID.test(variantId) ||
      seen.has(variantId) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_LINE_QUANTITY
    ) {
      return null;
    }
    seen.add(variantId);
    lines.push({ merchandiseId: `gid://shopify/ProductVariant/${variantId}`, quantity });
  }
  return lines;
}

/** Keep the secret-bearing cart GID opaque; this only checks its public shape. */
function isCartGid(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "gid:" &&
      url.hostname === "shopify" &&
      /^\/Cart\/[^/?#]+$/.test(url.pathname) &&
      !url.hash &&
      url.searchParams.getAll("key").length === 1 &&
      Boolean(url.searchParams.get("key"))
    );
  } catch {
    return false;
  }
}

type CartOutcome = { cartId: string; currencyCode: string } | { failure: SampleApiResult };

async function createCart(
  domain: string,
  lines: CartLineInput[],
  countryCode: BuyerCountry | undefined,
  options: SampleServerOptions,
): Promise<CartOutcome> {
  const response = await fetchUpstream(
    `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    countryCode
      ? {
          query: CART_CREATE_IN_COUNTRY,
          variables: { country: countryCode, input: { buyerIdentity: { countryCode }, lines } },
        }
      : { query: CART_CREATE, variables: { input: { lines } } },
    options,
  );
  if (!response) return { failure: failure(502, "upstream_unavailable", "cart") };
  if (!response.ok) return { failure: responseFailure(response, "cart") };

  try {
    const data = record(await readBoundedJson(response));
    const create = record(record(data?.["data"])?.["cartCreate"]);
    if (Array.isArray(data?.["errors"]) && data["errors"].length > 0) {
      return { failure: failure(422, "cart_rejected", "cart") };
    }
    const userErrors = create?.["userErrors"];
    if (Array.isArray(userErrors) && userErrors.length > 0) {
      // Map known reasons without forwarding merchant messages or field values.
      const sellingPlan = userErrors.some(
        (error) => record(error)?.["code"] === "VARIANT_REQUIRES_SELLING_PLAN",
      );
      return {
        failure: failure(422, sellingPlan ? "cart_selling_plan_required" : "cart_rejected", "cart"),
      };
    }
    const cart = record(create?.["cart"]);
    const currencyCode = record(record(cart?.["cost"])?.["totalAmount"])?.["currencyCode"];
    if (
      !isCartGid(cart?.["id"]) ||
      typeof currencyCode !== "string" ||
      !/^[A-Z]{3}$/.test(currencyCode)
    ) {
      return { failure: failure(502, "upstream_invalid_response", "cart") };
    }
    return { cartId: cart["id"], currencyCode };
  } catch {
    return { failure: failure(502, "upstream_invalid_response", "cart") };
  }
}

async function currencyRequest(
  payload: Record<string, unknown>,
  options: SampleServerOptions,
): Promise<SampleApiResult> {
  const environment = payload["environment"];
  const countryCode = payload["countryCode"];
  const domain = canonicalBareDomain(payload["domain"]);
  if (
    !isCheckoutEnvironment(environment) ||
    !domain ||
    (countryCode !== undefined && !isBuyerCountry(countryCode))
  ) {
    return failure(400, "invalid_request");
  }
  if (!isAllowedShopDomain(domain, environment, options.allowedShopDomains)) {
    return failure(403, "shop_not_allowed", "cart");
  }

  const response = await fetchUpstream(
    `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    countryCode
      ? { query: CURRENCY_PREVIEW, variables: { country: countryCode } }
      : { query: DEFAULT_MARKET_CURRENCY_PREVIEW },
    options,
  );
  if (!response) return failure(502, "upstream_unavailable", "cart");
  if (!response.ok) return responseFailure(response, "cart");

  try {
    const data = record(await readBoundedJson(response));
    const nodes = record(record(data?.["data"])?.["products"])?.["nodes"];
    const product = Array.isArray(nodes) ? record(nodes[0]) : null;
    const currencyCode = record(record(product?.["priceRange"])?.["minVariantPrice"])?.[
      "currencyCode"
    ];
    if (
      (Array.isArray(data?.["errors"]) && data["errors"].length > 0) ||
      typeof currencyCode !== "string" ||
      !/^[A-Z]{3}$/.test(currencyCode)
    ) {
      return failure(502, "upstream_invalid_response", "cart");
    }
    return { status: 200, payload: { currencyCode } };
  } catch {
    return failure(502, "upstream_invalid_response", "cart");
  }
}

interface StoreRequest {
  domain: string;
  lines: CartLineInput[];
}

function storeRequests(value: unknown): StoreRequest[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SESSION_STORES) {
    return null;
  }
  const stores: StoreRequest[] = [];
  const domains = new Set<string>();
  for (const entry of value) {
    const storeEntry = record(entry);
    const domain = canonicalBareDomain(storeEntry?.["domain"]);
    const lines = cartLines(storeEntry?.["lines"]);
    if (!domain || !lines || domains.has(domain)) return null;
    domains.add(domain);
    stores.push({ domain, lines });
  }
  return stores;
}

async function sessionRequest(
  payload: Record<string, unknown>,
  options: SampleServerOptions,
): Promise<SampleApiResult> {
  const environment = payload["environment"];
  const countryCode = payload["countryCode"];
  const stores = storeRequests(payload["stores"]);
  if (
    !isCheckoutEnvironment(environment) ||
    !stores ||
    (countryCode !== undefined && !isBuyerCountry(countryCode))
  ) {
    return failure(400, "invalid_request");
  }

  // Validate all domains before creating any carts.
  for (const store of stores) {
    if (!isAllowedShopDomain(store.domain, environment, options.allowedShopDomains)) {
      return {
        status: 403,
        payload: { error: "shop_not_allowed", stage: "cart", domain: store.domain },
      };
    }
  }

  // Check the destination first, so a missing setting never leaves unused carts.
  const destination = options.sessions[environment];
  if (!destination) return failure(503, "configuration_required", "session");

  // Create all carts concurrently.
  const cartResults = await Promise.all(
    stores.map((store) => createCart(store.domain, store.lines, countryCode, options)),
  );

  // On the first failure, return it with the failing domain.
  for (let i = 0; i < cartResults.length; i++) {
    const result = cartResults[i];
    const store = stores[i];
    if (result && "failure" in result && store) {
      return {
        ...result.failure,
        payload: { ...result.failure.payload, domain: store.domain },
      };
    }
  }

  const carts = cartResults.filter(
    (r): r is { cartId: string; currencyCode: string } => "cartId" in r,
  );

  // Check for currency mismatch.
  const currencies = new Set(carts.map((cart) => cart.currencyCode));
  if (currencies.size > 1) {
    return {
      status: 422,
      payload: {
        error: "currency_mismatch",
        stage: "cart",
        currencies: stores.map((store, i) => {
          const cart = carts[i];
          return {
            domain: store.domain,
            currencyCode: cart?.currencyCode ?? "",
          };
        }),
      },
    };
  }

  const response = await fetchUpstream(
    destination.createUrl,
    { cart_ids: carts.map((cart) => cart.cartId) },
    options,
  );
  if (!response) return failure(502, "upstream_unavailable", "session");
  if (response.status !== 201) return responseFailure(response, "session");

  try {
    const data = record(await readBoundedJson(response));
    const continueUrl = data?.["continue_url"];
    if (!isContinuationUrl(continueUrl, environment, destination.continuationHost)) {
      return failure(502, "upstream_invalid_response", "session");
    }
    const firstCart = carts[0];
    if (!firstCart) return failure(502, "upstream_invalid_response", "session");
    return { status: 200, payload: { continueUrl, currencyCode: firstCart.currencyCode } };
  } catch {
    return failure(502, "upstream_invalid_response", "session");
  }
}

export async function handleSampleApiRequest(
  path: string,
  payload: unknown,
  options: SampleServerOptions,
): Promise<SampleApiResult> {
  const body = record(payload);
  if (!body) return failure(400, "invalid_request");
  switch (path) {
    case SAMPLE_API_PATHS.configuration: {
      const storeDomains = options.storeDomains ?? [];
      const configuration: SampleConfiguration = {
        ...(options.storefrontDomain ? { storefrontDomain: options.storefrontDomain } : {}),
        storeDomains: storeDomains.slice(0, MAX_SESSION_STORES),
        environments: CHECKOUT_ENVIRONMENTS.filter((environment) => options.sessions[environment]),
      };
      return { status: 200, payload: { ...configuration } };
    }
    case SAMPLE_API_PATHS.currency:
      return currencyRequest(body, options);
    case SAMPLE_API_PATHS.session:
      return sessionRequest(body, options);
    default:
      return failure(404, "invalid_request");
  }
}

function configuredDomains(raw: string | undefined, setting: string): string[] {
  const domains: string[] = [];
  for (const entry of raw?.split(",") ?? []) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const domain = canonicalBareDomain(trimmed);
    // Name the setting, never the configured value.
    if (!domain) throw new Error(`${setting} contains an invalid domain.`);
    domains.push(domain);
  }
  return domains;
}

function configuredCreateUrl(value: string | undefined, setting: string, host?: string): string {
  try {
    const url = new URL(value ?? "");
    if (
      url.protocol === "https:" &&
      canonicalBareDomain(url.hostname) &&
      (!host || url.hostname === host) &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash
    ) {
      return url.href;
    }
  } catch {
    // Report the setting, never the configured value.
  }
  throw new Error(
    `Configure ${setting} as an HTTPS endpoint${host ? ` on ${host}` : ""} without credentials or query parameters.`,
  );
}

/** Reads the sample's settings. Throws, naming the setting, for an invalid value. */
export function configuredSampleOptions(environment: SampleEnvironment): SampleServerOptions {
  // The first configured shop is the page's default storefront. Every configured
  // shop is allowed, so local development shops work without another setting.
  const shopDomains = [
    ...configuredDomains(environment.STOREFRONT_DOMAIN, "STOREFRONT_DOMAIN"),
    ...configuredDomains(environment.CHECKOUT_KIT_UC_SHOP_DOMAINS, "CHECKOUT_KIT_UC_SHOP_DOMAINS"),
  ];
  const [storefrontDomain] = shopDomains;
  const allowedShopDomains = new Set([
    ...shopDomains,
    ...configuredDomains(
      environment.CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS,
      "CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS",
    ),
  ]);

  const sessions: SampleServerOptions["sessions"] = {};
  if (environment.CHECKOUT_KIT_UC_SESSION_CREATE_URL) {
    sessions.production = {
      createUrl: configuredCreateUrl(
        environment.CHECKOUT_KIT_UC_SESSION_CREATE_URL,
        "CHECKOUT_KIT_UC_SESSION_CREATE_URL",
        "shop.app",
      ),
      continuationHost: "shop.app",
    };
  }
  const developmentUrl = environment.CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL;
  const developmentHost = environment.VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST;
  if (developmentUrl || developmentHost) {
    const continuationHost = canonicalBareDomain(developmentHost);
    if (!developmentUrl || !continuationHost) {
      throw new Error(
        "Configure both CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL and VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST.",
      );
    }
    sessions.development = {
      createUrl: configuredCreateUrl(
        developmentUrl,
        "CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL",
      ),
      continuationHost,
    };
  }

  // De-duplicate shopDomains while preserving order.
  const seen = new Set<string>();
  const storeDomains = shopDomains.filter((domain) => {
    if (seen.has(domain)) return false;
    seen.add(domain);
    return true;
  });

  return {
    ...(storefrontDomain ? { storefrontDomain } : {}),
    storeDomains,
    allowedShopDomains,
    sessions,
  };
}

class PayloadTooLarge extends Error {}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const part of request) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) throw new PayloadTooLarge();
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(response: ServerResponse, result: SampleApiResult): void {
  if (response.destroyed || response.writableEnded) return;
  response.statusCode = result.status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(result.payload));
}

/** Only answer the page itself, served from a loopback host. */
function sameOrigin(request: IncomingMessage): boolean {
  const host = request.headers.host;
  if (!host || !/^(?:127\.0\.0\.1|localhost|\[::1\])(?::[0-9]+)?$/i.test(host)) {
    return false;
  }
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host === host;
  } catch {
    return false;
  }
}

const API_PATHS: ReadonlySet<string> = new Set(Object.values(SAMPLE_API_PATHS));

export function sampleMiddleware(options: SampleServerOptions) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!API_PATHS.has(url.pathname)) {
      next();
      return;
    }
    if (url.search || request.method !== "POST") {
      sendJson(response, failure(405, "invalid_request"));
      return;
    }
    if (!sameOrigin(request)) {
      sendJson(response, failure(403, "invalid_request"));
      return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) {
      sendJson(response, failure(415, "invalid_request"));
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    response.once("close", () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const body = await readJsonBody(request);
      sendJson(
        response,
        await handleSampleApiRequest(url.pathname, body, { ...options, signal: controller.signal }),
      );
    } catch (error) {
      sendJson(response, failure(error instanceof PayloadTooLarge ? 413 : 400, "invalid_request"));
    } finally {
      clearTimeout(timeout);
    }
  };
}

/** The Universal session adapter only exists in the local Vite dev and preview servers. */
export function universalSessionSampleApiPlugin(environmentRoot: string): Plugin {
  const middleware = () =>
    sampleMiddleware(configuredSampleOptions(loadSampleEnvironment(environmentRoot)));
  return {
    name: "checkout-kit-universal-session-sample-api",
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}
