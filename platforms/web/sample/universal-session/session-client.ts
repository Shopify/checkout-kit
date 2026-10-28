import {
  canonicalBareDomain,
  isCheckoutEnvironment,
  isSessionFailureCode,
  isSessionStage,
  SAMPLE_API_PATHS,
  type CheckoutEnvironment,
  type SampleConfiguration,
  type SessionFailureCode,
  type SessionRequest,
  type SessionStage,
} from "./api";

type Fetcher = typeof fetch;

export type SessionOutcome =
  | { ok: true; continueUrl: string; currencyCode: string }
  | {
      ok: false;
      code: SessionFailureCode | "server_unavailable";
      stage?: SessionStage;
      domain?: string;
      currencies?: Array<{ domain: string; currencyCode: string }>;
    };

function post(path: string, body: unknown, fetcher: Fetcher, signal?: AbortSignal) {
  return fetcher(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
}

/** Loads the fields the page needs. Session endpoints never leave the server. */
export async function loadSampleConfiguration(
  fetcher: Fetcher = fetch,
): Promise<SampleConfiguration> {
  const response = await post(
    SAMPLE_API_PATHS.configuration,
    {},
    fetcher,
    AbortSignal.timeout(5000),
  );
  if (!response.ok) throw new Error("Sample configuration is unavailable.");
  const data: unknown = await response.json();
  const { storefrontDomain, storeDomains, environments } = (data ?? {}) as Record<string, unknown>;
  if (
    !Array.isArray(environments) ||
    !environments.every(isCheckoutEnvironment) ||
    (storefrontDomain !== undefined &&
      canonicalBareDomain(storefrontDomain) !== storefrontDomain) ||
    !Array.isArray(storeDomains) ||
    !storeDomains.every(
      (domain): domain is string =>
        typeof domain === "string" && canonicalBareDomain(domain) === domain,
    )
  ) {
    throw new Error("Invalid sample configuration.");
  }
  return {
    ...(typeof storefrontDomain === "string" ? { storefrontDomain } : {}),
    storeDomains: storeDomains as string[],
    environments: [...new Set(environments as CheckoutEnvironment[])],
  };
}

/** Asks the local server to create Storefront carts, then a Universal session from them. */
export async function requestUniversalSession(
  request: SessionRequest,
  { fetcher = fetch, signal }: { fetcher?: Fetcher; signal?: AbortSignal } = {},
): Promise<SessionOutcome> {
  let response: Response;
  let data: Record<string, unknown>;
  try {
    response = await post(SAMPLE_API_PATHS.session, request, fetcher, signal);
    data = ((await response.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return { ok: false, code: "server_unavailable" };
  }

  const { continueUrl, currencyCode, error, stage, domain, currencies } = data;
  if (response.ok && typeof continueUrl === "string" && typeof currencyCode === "string") {
    return { ok: true, continueUrl, currencyCode };
  }
  return {
    ok: false,
    code: isSessionFailureCode(error) ? error : "upstream_invalid_response",
    ...(isSessionStage(stage) ? { stage } : {}),
    ...(typeof domain === "string" ? { domain } : {}),
    ...(Array.isArray(currencies) ? { currencies } : {}),
  };
}

/** Asks the local server to preview the currency for a storefront and buyer country. */
export async function loadSampleCurrency(
  request: { environment: CheckoutEnvironment; domain: string; countryCode?: string },
  signal?: AbortSignal,
): Promise<string> {
  const response = await post(SAMPLE_API_PATHS.currency, request, fetch, signal);
  if (!response.ok) {
    throw new Error(`Currency preview failed with status ${response.status}.`);
  }
  const data = ((await response.json()) ?? {}) as Record<string, unknown>;
  const currencyCode = data["currencyCode"];
  if (typeof currencyCode !== "string" || !/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("Invalid currency response.");
  }
  return currencyCode;
}

/** A safe, actionable description. Never includes upstream messages or identifiers. */
export function describeSessionFailure(
  outcome: Extract<SessionOutcome, { ok: false }>,
  environment: CheckoutEnvironment,
): string {
  const service = outcome.stage === "session" ? "The session service" : "The storefront";
  const domainSuffix = outcome.domain ? ` (${outcome.domain})` : "";
  switch (outcome.code) {
    case "server_unavailable":
      return "The local sample server did not answer. Start it with pnpm sample, then try again.";
    case "invalid_request":
      return "The sample server rejected the request. Reload the page and try again.";
    case "shop_not_allowed":
      return environment === "production"
        ? `Production sessions accept <shop>.myshopify.com storefronts. Add other domains to CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS and restart the sample.${domainSuffix}`
        : `Local development storefronts must be configured. Add the domain to STOREFRONT_DOMAIN or CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS and restart the sample.${domainSuffix}`;
    case "configuration_required":
      return environment === "production"
        ? "Production session creation is not configured. Set CHECKOUT_KIT_UC_SESSION_CREATE_URL in sample/universal-session/.env.local and restart the sample."
        : "Local development session creation is not configured. Set CHECKOUT_KIT_UC_DEVELOPMENT_SESSION_CREATE_URL and VITE_CHECKOUT_KIT_UC_DEVELOPMENT_CONTINUATION_HOST in sample/universal-session/.env.local and restart the sample.";
    case "rate_limited":
      return `${service} is rate limiting requests. Wait a moment, then prepare again. (rate_limited)${domainSuffix}`;
    case "upstream_unavailable":
      return `${service} could not be reached. Check your connection, then prepare again. (upstream_unavailable)${domainSuffix}`;
    case "upstream_redirect":
      return `${service} redirected the request. Check the configured domain or endpoint. (upstream_redirect)${domainSuffix}`;
    case "upstream_rejected":
      return `${service} rejected the request. (upstream_rejected)${domainSuffix}`;
    case "upstream_invalid_response":
      return `${service} returned an unexpected response. (upstream_invalid_response)${domainSuffix}`;
    case "cart_rejected":
      return `The storefront could not create a cart from these items. Check that they are still available. (cart_rejected)${domainSuffix}`;
    case "cart_selling_plan_required":
      return `A product in the cart is sold only as a subscription, which this sample does not support. Remove it, then prepare again. (cart_selling_plan_required)${domainSuffix}`;
    case "currency_mismatch": {
      const pairs =
        outcome.currencies?.map((c) => `${c.domain}: ${c.currencyCode}`).join(", ") ?? "";
      return `The stores use different currencies (${pairs}). Choose a buyer country that every store supports.`;
    }
    case "session_rejected":
      return "The session service rejected the cart. Prepare again to create a fresh cart. (session_rejected)";
    case "session_access_denied":
      return "The session service denied access. Check that you can create sessions in this environment. (session_access_denied)";
    case "session_ineligible":
      return "The cart cannot start a Universal session; it may already have a completed or processing checkout. (session_ineligible)";
  }
}
