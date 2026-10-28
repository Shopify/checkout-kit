// Shared by sample pages and the local sample server. Nothing here reads
// configuration: session endpoints and allowed shops stay on the server.

export type CheckoutEnvironment = "production" | "development";

export const CHECKOUT_ENVIRONMENTS: readonly CheckoutEnvironment[] = ["production", "development"];

export const BUYER_COUNTRIES = [
  { code: "CA", label: "Canada" },
  { code: "US", label: "United States" },
  { code: "DE", label: "Germany" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "JP", label: "Japan" },
] as const;

export type BuyerCountry = (typeof BUYER_COUNTRIES)[number]["code"];

export const STOREFRONT_API_VERSION = "2026-07";
export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 999;
export const MAX_SESSION_STORES = 15;

export const SAMPLE_API_PATHS = {
  configuration: "/__checkout-kit-universal-session/configuration",
  currency: "/__checkout-kit-universal-session/currency",
  session: "/__checkout-kit-universal-session/session",
} as const;

/** What the page may learn about the server's configuration. */
export interface SampleConfiguration {
  /** The configured default storefront, if any. */
  storefrontDomain?: string;
  /** Configured storefronts to seed the stores list, at most MAX_SESSION_STORES. */
  storeDomains: string[];
  /** Environments whose session creation endpoint is configured. */
  environments: CheckoutEnvironment[];
}

export interface SessionRequestLine {
  variantId: string;
  quantity: number;
}

export interface SessionRequestStore {
  domain: string;
  lines: SessionRequestLine[];
}

export interface SessionRequest {
  environment: CheckoutEnvironment;
  /** Omit to use the storefront's default market. */
  countryCode?: BuyerCountry;
  stores: SessionRequestStore[];
}

export interface CurrencyRequest {
  environment: CheckoutEnvironment;
  domain: string;
  /** Omit to use the storefront's default market. */
  countryCode?: BuyerCountry;
}

/** The step that failed: creating the Storefront cart, or the session from it. */
export type SessionStage = "cart" | "session";

export type SessionFailureCode =
  | "invalid_request"
  | "shop_not_allowed"
  | "configuration_required"
  | "rate_limited"
  | "upstream_unavailable"
  | "upstream_redirect"
  | "upstream_rejected"
  | "upstream_invalid_response"
  | "cart_rejected"
  | "cart_selling_plan_required"
  | "currency_mismatch"
  | "session_rejected"
  | "session_access_denied"
  | "session_ineligible";

const SESSION_FAILURE_CODES: ReadonlySet<string> = new Set<SessionFailureCode>([
  "invalid_request",
  "shop_not_allowed",
  "configuration_required",
  "rate_limited",
  "upstream_unavailable",
  "upstream_redirect",
  "upstream_rejected",
  "upstream_invalid_response",
  "cart_rejected",
  "cart_selling_plan_required",
  "currency_mismatch",
  "session_rejected",
  "session_access_denied",
  "session_ineligible",
]);

export function isSessionFailureCode(value: unknown): value is SessionFailureCode {
  return typeof value === "string" && SESSION_FAILURE_CODES.has(value);
}

export function isSessionStage(value: unknown): value is SessionStage {
  return value === "cart" || value === "session";
}

export function isCheckoutEnvironment(value: unknown): value is CheckoutEnvironment {
  return value === "production" || value === "development";
}

export function isBuyerCountry(value: unknown): value is BuyerCountry {
  return BUYER_COUNTRIES.some((country) => country.code === value);
}

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN_SUFFIX = /^[a-z]{2,}$/;
const PRODUCTION_SHOP_DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
const PRODUCTION_CONTINUATION_HOST = "shop.app";
const CONTINUATION_PATH = /^\/checkouts\/uc\/[a-zA-Z0-9_-]+$/;

/** Requests to the local server use a canonical bare hostname, never a URL. */
export function canonicalBareDomain(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 253 || value !== value.trim()) return null;
  const domain = value.toLowerCase();
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    !labels.every((label) => DOMAIN_LABEL.test(label)) ||
    !DOMAIN_SUFFIX.test(labels.at(-1) ?? "")
  ) {
    return null;
  }
  return domain;
}

/**
 * Production accepts any `<shop>.myshopify.com` domain. Every other domain, and
 * every local development shop, must be configured on the server.
 */
export function isAllowedShopDomain(
  value: unknown,
  environment: CheckoutEnvironment,
  configuredDomains: ReadonlySet<string>,
): value is string {
  const domain = canonicalBareDomain(value);
  if (!domain) return false;
  if (configuredDomains.has(domain)) return true;
  return environment === "production" && PRODUCTION_SHOP_DOMAIN.test(domain);
}

function parseHttpsUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function hasContinuationShape(url: URL): boolean {
  return (
    !url.port &&
    !url.hash &&
    CONTINUATION_PATH.test(url.pathname) &&
    url.searchParams.getAll("key").length === 1 &&
    Boolean(url.searchParams.get("key"))
  );
}

/** A Universal session URL, on the trusted host for its environment. */
export function isContinuationUrl(
  value: unknown,
  environment: CheckoutEnvironment,
  developmentHost?: string,
): value is string {
  const url = parseHttpsUrl(value);
  const expectedHost =
    environment === "production"
      ? PRODUCTION_CONTINUATION_HOST
      : canonicalBareDomain(developmentHost);
  return Boolean(url && expectedHost && url.hostname === expectedHost && hasContinuationShape(url));
}

export type PastedSourceStatus = "empty" | "invalid" | "unexpected" | "valid";

/**
 * Classifies a pasted source. The elements open any HTTPS URL, so `unexpected`
 * is only a hint that the URL does not look like a Universal session URL.
 */
export function classifyPastedSource(value: string): PastedSourceStatus {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  const url = parseHttpsUrl(trimmed);
  if (!url) return "invalid";
  return hasContinuationShape(url) ? "valid" : "unexpected";
}
