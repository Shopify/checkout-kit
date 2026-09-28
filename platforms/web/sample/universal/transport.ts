import type { CartLine } from "../cart";
import { isConfiguredContinuationUrl } from "./browser-policy";
import { isCartGid, SAMPLE_API_PATHS, type BuyerCountry, type CheckoutEnvironment } from "./policy";
import type { SampleApiErrorCode } from "./server";

export interface CreatedCart {
  cartId: string;
  currencyCode: string;
}

export interface PreparationTransport {
  createCart(
    shop: { domain: string; lines: CartLine[] },
    environment: CheckoutEnvironment,
    countryCode: BuyerCountry,
    signal: AbortSignal,
  ): Promise<CreatedCart>;
  createSession(
    cartIds: string[],
    environment: CheckoutEnvironment,
    signal: AbortSignal,
  ): Promise<string>;
}

export class SampleTransportError extends Error {
  constructor(readonly code: SampleApiErrorCode) {
    super(code);
    this.name = "SampleTransportError";
  }
}

const ERROR_CODES = new Set<SampleApiErrorCode>([
  "invalid_request",
  "shop_not_allowed",
  "upstream_unavailable",
  "upstream_redirect",
  "upstream_rejected",
  "upstream_invalid_response",
  "cart_rejected",
  "session_rejected",
  "configuration_required",
  "rate_limited",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function postJson(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new SampleTransportError("upstream_unavailable");
  }

  let data: Record<string, unknown> | null;
  try {
    data = record(await response.json());
  } catch {
    data = null;
  }
  if (!response.ok) {
    const code = data?.["error"];
    throw new SampleTransportError(
      typeof code === "string" && ERROR_CODES.has(code as SampleApiErrorCode)
        ? (code as SampleApiErrorCode)
        : "upstream_rejected",
    );
  }
  if (!data) throw new SampleTransportError("upstream_invalid_response");
  return data;
}

export const samplePreparationTransport: PreparationTransport = {
  async createCart(shop, environment, countryCode, signal) {
    const data = await postJson(
      SAMPLE_API_PATHS.cart,
      { domain: shop.domain, lines: shop.lines, environment, countryCode },
      signal,
    );
    const cartId = data["cartId"];
    const currencyCode = data["currencyCode"];
    if (
      !isCartGid(cartId) ||
      typeof currencyCode !== "string" ||
      !/^[A-Z]{3}$/.test(currencyCode)
    ) {
      throw new SampleTransportError("upstream_invalid_response");
    }
    return { cartId, currencyCode };
  },
  async createSession(cartIds, environment, signal) {
    const data = await postJson(SAMPLE_API_PATHS.session, { cartIds, environment }, signal);
    const continueUrl = data["continueUrl"];
    if (!isConfiguredContinuationUrl(continueUrl, environment)) {
      throw new SampleTransportError("upstream_invalid_response");
    }
    return continueUrl;
  },
};

export function describeTransportError(error: unknown): string {
  if (!(error instanceof SampleTransportError)) {
    return "The request could not be completed. Check the local sample server and try again.";
  }
  switch (error.code) {
    case "shop_not_allowed":
      return "This shop is not approved for the selected environment. Configure it as an approved test shop or choose another domain.";
    case "cart_rejected":
      return "The shop rejected these cart lines. Refresh its products and try again.";
    case "session_rejected":
      return "The selected carts could not create a checkout session. Regenerate them and try again.";
    case "configuration_required":
      return "Configure the session creation endpoint for the selected environment in the root .env or .env.local, then restart the sample server.";
    case "rate_limited":
      return "Checkout creation is rate limited. Wait a moment and try again.";
    case "upstream_redirect":
      return "A shop or checkout endpoint redirected unexpectedly. Check access and try again.";
    case "upstream_unavailable":
      return "A Shopify endpoint is unavailable. Check your network or VPN and try again.";
    case "invalid_request":
      return "The selected cart data is invalid. Review the shops and products, then try again.";
    default:
      return "The response could not be used to create a checkout. Try again.";
  }
}
