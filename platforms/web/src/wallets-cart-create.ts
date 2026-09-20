/**
 * Kit-owned Storefront API `cartCreate` for the zero-Hydrogen product
 * default. Creates a cart from current variant-id / selling-plan-id
 * using the configured public Storefront access token. The resulting
 * cart GID is kept private — never reflected or returned to the merchant.
 */

// Keep the browser-side default aligned with Checkout Kit's supported
// Storefront API version used by the native SDKs and web documentation.
const STOREFRONT_API_VERSION = "2026-04";

const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface CartCreateOptions {
  storeDomain: string;
  accessToken: string;
  variantId: string;
  sellingPlanId?: string;
  signal?: AbortSignal;
}

interface CartCreateResponse {
  data?: {
    cartCreate?: {
      cart?: { id: string };
      userErrors?: Array<{ field: string[]; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export type CartCreateFetcher = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<CartCreateResponse> }>;

/**
 * Call the Storefront API `cartCreate` mutation. Returns the cart GID.
 * Fails closed: throws on any error so the caller can surface it as a
 * wallet-level error.
 */
export async function storefrontCartCreate(
  options: CartCreateOptions,
  fetcher: CartCreateFetcher = fetch,
): Promise<string> {
  const { storeDomain, accessToken, variantId, sellingPlanId, signal } = options;

  if (!storeDomain) throw new Error("[checkout-kit] storeDomain is required for cartCreate.");
  if (!accessToken) throw new Error("[checkout-kit] accessToken is required for cartCreate.");
  if (!variantId) throw new Error("[checkout-kit] variantId is required for cartCreate.");

  const host = storeDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const url = `https://${host}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  const merchandiseId = variantId.startsWith("gid://")
    ? variantId
    : `gid://shopify/ProductVariant/${variantId}`;

  const line: Record<string, unknown> = { merchandiseId, quantity: 1 };
  if (sellingPlanId) {
    line.sellingPlanId = sellingPlanId.startsWith("gid://")
      ? sellingPlanId
      : `gid://shopify/SellingPlan/${sellingPlanId}`;
  }

  const lines = [line];

  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": accessToken,
    },
    body: JSON.stringify({
      query: CART_CREATE_MUTATION,
      variables: { input: { lines } },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`[checkout-kit] cartCreate failed (HTTP ${response.status}).`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(`[checkout-kit] cartCreate: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  const userErrors = json.data?.cartCreate?.userErrors;
  if (userErrors?.length) {
    throw new Error(
      `[checkout-kit] cartCreate: ${userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ")}`,
    );
  }

  const cartId = json.data?.cartCreate?.cart?.id;
  if (!cartId) {
    throw new Error("[checkout-kit] cartCreate succeeded but returned no cart ID.");
  }

  return cartId;
}
