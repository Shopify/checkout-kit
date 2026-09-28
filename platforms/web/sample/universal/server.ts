import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import type { SampleConfiguration } from "./configuration";
import { loadSampleEnvironment, type SampleEnvironment } from "./environment";
import {
  canonicalBareDomain,
  configuredShopDomains,
  isAllowedShopDomain,
  isBuyerCountry,
  isCartGid,
  isCheckoutEnvironment,
  isContinuationUrl,
  MAX_CART_LINES,
  MAX_SESSION_CARTS,
  SAMPLE_API_PATHS,
  STOREFRONT_API_VERSION,
} from "./policy";

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_CATALOG_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_MUTATION_RESPONSE_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
const VARIANT_ID = /^[1-9][0-9]{0,19}$/;

const CART_CREATE = `mutation CheckoutKitSampleCartCreate($input: CartInput!, $country: CountryCode!) @inContext(country: $country) {
  cartCreate(input: $input) {
    cart {
      id
      cost { totalAmount { currencyCode } }
    }
    userErrors { message }
  }
}`;

export type SampleApiErrorCode =
  | "invalid_request"
  | "shop_not_allowed"
  | "upstream_unavailable"
  | "upstream_redirect"
  | "upstream_rejected"
  | "upstream_invalid_response"
  | "cart_rejected"
  | "session_rejected"
  | "configuration_required"
  | "rate_limited";

export interface SampleApiResult {
  status: number;
  payload: Record<string, unknown>;
}

interface SampleApiOptions {
  allowedShopDomains: ReadonlySet<string>;
  shopDomains?: readonly string[];
  productionSession?: DevelopmentSessionConfig | null;
  developmentSession?: DevelopmentSessionConfig | null;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

export interface DevelopmentSessionConfig {
  createUrl: string;
  continuationHost: string;
}

function invalidDevelopmentConfiguration(): Error {
  return new Error(
    "Configure both CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL and VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST as valid checkout destinations.",
  );
}

function configuredSessionCreateUrl(value: string | undefined, production = false): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      canonicalBareDomain(url.hostname) &&
      (!production || url.hostname === "shop.app") &&
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
    production
      ? "Configure CHECKOUT_KIT_UC_SESSION_CREATE_URL as an HTTPS endpoint on shop.app without credentials or query parameters."
      : "Configure the development session creation URL as a trusted HTTPS endpoint without credentials or query parameters.",
  );
}

/** Keep local checkout destinations in server configuration, not the exported sample source. */
export function configuredDevelopmentSession(
  createUrl: string | undefined,
  continuationHost: string | undefined,
): DevelopmentSessionConfig | null {
  if (!createUrl && !continuationHost) return null;
  if (!createUrl || !continuationHost) throw invalidDevelopmentConfiguration();

  let url: string | null;
  try {
    url = configuredSessionCreateUrl(createUrl);
  } catch {
    throw invalidDevelopmentConfiguration();
  }
  const host = canonicalBareDomain(continuationHost);
  if (!url || !host) {
    throw invalidDevelopmentConfiguration();
  }
  return { createUrl: url, continuationHost: host };
}

function failure(status: number, error: SampleApiErrorCode): SampleApiResult {
  return { status, payload: { error } };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > maxBytes) {
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
      if (bytes > maxBytes) throw new Error("Upstream response exceeds the sample limit");
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

function responseFailure(
  response: Response,
  kind: "cart" | "session" | "catalog",
): SampleApiResult {
  if (response.status >= 300 && response.status < 400) return failure(502, "upstream_redirect");
  if (response.status === 429) return failure(429, "rate_limited");
  if (kind === "cart" && response.status === 422) return failure(422, "cart_rejected");
  if (kind === "session" && (response.status === 400 || response.status === 401)) {
    return failure(422, "session_rejected");
  }
  return failure(502, "upstream_rejected");
}

async function fetchUpstream(
  url: string,
  init: RequestInit,
  options: SampleApiOptions,
): Promise<Response | null> {
  try {
    return await (options.fetcher ?? fetch)(url, {
      ...init,
      redirect: "manual",
      cache: "no-store",
      signal: options.signal,
    });
  } catch {
    return null;
  }
}

async function catalogRequest(
  payload: Record<string, unknown>,
  options: SampleApiOptions,
): Promise<SampleApiResult> {
  const domain = canonicalBareDomain(payload["domain"]);
  if (!domain) return failure(400, "invalid_request");
  if (!isAllowedShopDomain(domain, "either", options.allowedShopDomains)) {
    return failure(403, "shop_not_allowed");
  }

  const response = await fetchUpstream(
    `https://${domain}/products.json?limit=20`,
    { method: "GET", headers: { Accept: "application/json" } },
    options,
  );
  if (!response) return failure(502, "upstream_unavailable");
  if (!response.ok) return responseFailure(response, "catalog");

  try {
    const data = record(await readBoundedJson(response, MAX_CATALOG_RESPONSE_BYTES));
    if (!Array.isArray(data?.["products"])) return failure(502, "upstream_invalid_response");
    return { status: 200, payload: { products: data["products"] } };
  } catch {
    return failure(502, "upstream_invalid_response");
  }
}

function cartLines(value: unknown): { merchandiseId: string; quantity: number }[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CART_LINES) return null;
  const lines: { merchandiseId: string; quantity: number }[] = [];
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
      quantity > 999
    ) {
      return null;
    }
    seen.add(variantId);
    lines.push({ merchandiseId: `gid://shopify/ProductVariant/${variantId}`, quantity });
  }
  return lines;
}

async function cartRequest(
  payload: Record<string, unknown>,
  options: SampleApiOptions,
): Promise<SampleApiResult> {
  const environment = payload["environment"];
  const countryCode = payload["countryCode"];
  const domain = canonicalBareDomain(payload["domain"]);
  const lines = cartLines(payload["lines"]);
  if (!isCheckoutEnvironment(environment) || !isBuyerCountry(countryCode) || !domain || !lines) {
    return failure(400, "invalid_request");
  }
  if (!isAllowedShopDomain(domain, environment, options.allowedShopDomains)) {
    return failure(403, "shop_not_allowed");
  }

  const response = await fetchUpstream(
    `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: CART_CREATE,
        variables: { country: countryCode, input: { buyerIdentity: { countryCode }, lines } },
      }),
    },
    options,
  );
  if (!response) return failure(502, "upstream_unavailable");
  if (!response.ok) return responseFailure(response, "cart");

  try {
    const data = record(await readBoundedJson(response, MAX_MUTATION_RESPONSE_BYTES));
    const create = record(record(data?.["data"])?.["cartCreate"]);
    const cart = record(create?.["cart"]);
    const amount = record(record(cart?.["cost"])?.["totalAmount"]);
    const currencyCode = amount?.["currencyCode"];
    if (
      (Array.isArray(data?.["errors"]) && data["errors"].length > 0) ||
      (Array.isArray(create?.["userErrors"]) && create["userErrors"].length > 0)
    ) {
      return failure(422, "cart_rejected");
    }
    if (
      !isCartGid(cart?.["id"]) ||
      typeof currencyCode !== "string" ||
      !/^[A-Z]{3}$/.test(currencyCode)
    ) {
      return failure(502, "upstream_invalid_response");
    }
    return { status: 200, payload: { cartId: cart["id"], currencyCode } };
  } catch {
    return failure(502, "upstream_invalid_response");
  }
}

async function sessionRequest(
  payload: Record<string, unknown>,
  options: SampleApiOptions,
): Promise<SampleApiResult> {
  const environment = payload["environment"];
  const ids = payload["cartIds"];
  if (
    !isCheckoutEnvironment(environment) ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_SESSION_CARTS ||
    !ids.every(isCartGid) ||
    new Set(ids).size !== ids.length
  ) {
    return failure(400, "invalid_request");
  }

  const destination =
    environment === "production" ? options.productionSession : options.developmentSession;
  if (!destination) return failure(503, "configuration_required");

  const response = await fetchUpstream(
    destination.createUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ cart_ids: ids }),
    },
    options,
  );
  if (!response) return failure(502, "upstream_unavailable");
  if (response.status !== 201) return responseFailure(response, "session");

  try {
    const data = record(await readBoundedJson(response, MAX_MUTATION_RESPONSE_BYTES));
    const continueUrl = data?.["continue_url"];
    if (!isContinuationUrl(continueUrl, environment, destination.continuationHost)) {
      return failure(502, "upstream_invalid_response");
    }
    return { status: 200, payload: { continueUrl } };
  } catch {
    return failure(502, "upstream_invalid_response");
  }
}

export async function handleSampleApiRequest(
  path: string,
  payload: unknown,
  options: SampleApiOptions,
): Promise<SampleApiResult> {
  const body = record(payload);
  if (!body) return failure(400, "invalid_request");
  switch (path) {
    case SAMPLE_API_PATHS.configuration: {
      const configuration: SampleConfiguration = {
        shopDomains: [...(options.shopDomains ?? [])],
        ...(options.developmentSession
          ? { developmentContinuationHost: options.developmentSession.continuationHost }
          : {}),
      };
      return { status: 200, payload: { ...configuration } };
    }
    case SAMPLE_API_PATHS.catalog:
      return catalogRequest(body, options);
    case SAMPLE_API_PATHS.cart:
      return cartRequest(body, options);
    case SAMPLE_API_PATHS.session:
      return sessionRequest(body, options);
    default:
      return failure(404, "invalid_request");
  }
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

function sampleMiddleware(options: SampleApiOptions) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (
      !Object.values(SAMPLE_API_PATHS).includes(
        url.pathname as (typeof SAMPLE_API_PATHS)[keyof typeof SAMPLE_API_PATHS],
      )
    ) {
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
      const result = await handleSampleApiRequest(url.pathname, body, {
        ...options,
        signal: controller.signal,
      });
      sendJson(response, result);
    } catch (error) {
      sendJson(response, failure(error instanceof PayloadTooLarge ? 413 : 400, "invalid_request"));
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function configuredSampleOptions(environment: SampleEnvironment): SampleApiOptions {
  const shopDomains = [
    ...configuredShopDomains(
      environment.CHECKOUT_KIT_UC_SHOP_DOMAINS ?? environment.STOREFRONT_DOMAIN,
      "CHECKOUT_KIT_UC_SHOP_DOMAINS or STOREFRONT_DOMAIN",
    ),
  ];
  if (shopDomains.length > MAX_SESSION_CARTS) {
    throw new Error(`Configure at most ${MAX_SESSION_CARTS} initial sample shops.`);
  }
  const allowedShopDomains = configuredShopDomains(
    environment.CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS,
  );
  const developmentSession = configuredDevelopmentSession(
    environment.CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL,
    environment.VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST,
  );
  const productionCreateUrl = configuredSessionCreateUrl(
    environment.CHECKOUT_KIT_UC_SESSION_CREATE_URL,
    true,
  );
  return {
    shopDomains,
    allowedShopDomains: new Set([...allowedShopDomains, ...shopDomains]),
    developmentSession,
    productionSession: productionCreateUrl
      ? { createUrl: productionCreateUrl, continuationHost: "shop.app" }
      : null,
  };
}

/** This adapter only exists in the local sample's Vite dev and preview servers. */
export function universalSampleApiPlugin(environmentRoot: string): Plugin {
  const middleware = () =>
    sampleMiddleware(configuredSampleOptions(loadSampleEnvironment(environmentRoot)));
  return {
    name: "checkout-kit-universal-sample-api",
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}
