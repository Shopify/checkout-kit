export type CheckoutEnvironment = "production" | "development";

export const BUYER_COUNTRIES = [
  { code: "CA", label: "Canada (CAD)" },
  { code: "US", label: "United States (USD)" },
  { code: "DE", label: "Germany (EUR)" },
  { code: "GB", label: "United Kingdom (GBP)" },
  { code: "AU", label: "Australia (AUD)" },
  { code: "NZ", label: "New Zealand (NZD)" },
  { code: "JP", label: "Japan (JPY)" },
] as const;

export type BuyerCountry = (typeof BUYER_COUNTRIES)[number]["code"];

export const DEFAULT_BUYER_COUNTRY: BuyerCountry = "CA";
export const STOREFRONT_API_VERSION = "2026-07";
export const MAX_SESSION_CARTS = 15;
export const MAX_CART_LINES = 50;

export const SAMPLE_API_PATHS = {
  configuration: "/__checkout-kit-universal/configuration",
  catalog: "/__checkout-kit-universal/catalog",
  cart: "/__checkout-kit-universal/cart",
  session: "/__checkout-kit-universal/session",
} as const;

const PRODUCTION_CONTINUATION_HOST = "shop.app";

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN_SUFFIX = /^[a-z]{2,}$/;
const PRODUCTION_SHOP_DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;

export function isCheckoutEnvironment(value: unknown): value is CheckoutEnvironment {
  return value === "production" || value === "development";
}

export function isBuyerCountry(value: unknown): value is BuyerCountry {
  return BUYER_COUNTRIES.some((country) => country.code === value);
}

/** Requests to the local adapter use a canonical bare hostname, never a URL. */
export function canonicalBareDomain(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 253 || value !== value.trim()) return null;
  const domain = value.toLowerCase();
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    !labels.every((label) => DOMAIN_LABEL.test(label)) ||
    !DOMAIN_SUFFIX.test(labels[labels.length - 1] ?? "")
  ) {
    return null;
  }
  return domain;
}

export function configuredShopDomains(
  raw: string | undefined,
  setting = "CHECKOUT_KIT_UC_ALLOWED_SHOP_DOMAINS",
): ReadonlySet<string> {
  const domains = new Set<string>();
  for (const entry of raw?.split(",") ?? []) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const domain = canonicalBareDomain(trimmed);
    if (!domain) {
      throw new Error(`${setting} contains an invalid domain.`);
    }
    domains.add(domain);
  }
  return domains;
}

export function isAllowedShopDomain(
  value: unknown,
  environment: CheckoutEnvironment | "either",
  customDomains: ReadonlySet<string>,
): value is string {
  const domain = canonicalBareDomain(value);
  if (!domain) return false;
  if (customDomains.has(domain)) return true;
  // Local development shop domains are explicitly configured, never embedded
  // in a browser-shipped sample module.
  return environment !== "development" && PRODUCTION_SHOP_DOMAIN.test(domain);
}

/** Keep the full secret-bearing Cart GID opaque; this only checks its public shape. */
export function isCartGid(value: unknown): value is string {
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

/** Accept only the expected Checkout continuation on the selected Shopify host. */
export function isContinuationUrl(
  value: unknown,
  environment: CheckoutEnvironment,
  developmentHost?: string,
): value is string {
  if (typeof value !== "string" || value.length > 8192) return false;
  const expectedHost =
    environment === "production"
      ? PRODUCTION_CONTINUATION_HOST
      : canonicalBareDomain(developmentHost);
  if (!expectedHost) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === expectedHost &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      /^\/checkouts\/uc\/[a-zA-Z0-9_-]+$/.test(url.pathname) &&
      url.searchParams.getAll("key").length === 1 &&
      Boolean(url.searchParams.get("key"))
    );
  } catch {
    return false;
  }
}
