import { normalizeStorefrontDomain, type CartLine } from "./cart";

const STOREFRONT_API_VERSION = "2025-04";

const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CreateCart($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
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

interface GraphQLError {
  message: string;
}

interface UserError {
  field: string[];
  message: string;
}

interface CartCreateResponse {
  data?: {
    cartCreate?: {
      cart?: { id: string };
      userErrors?: UserError[];
    };
  };
  errors?: GraphQLError[];
}

export type StorefrontCartResult = { cartId: string };

type CartCreateFetcher = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<CartCreateResponse> }>;

function toMerchandiseGid(variantId: string): string {
  if (variantId.startsWith("gid://")) return variantId;
  return `gid://shopify/ProductVariant/${variantId}`;
}

export async function createStorefrontCart(
  domain: string,
  accessToken: string,
  lines: readonly CartLine[],
  fetcher: CartCreateFetcher = fetch,
): Promise<StorefrontCartResult> {
  const normalized = normalizeStorefrontDomain(domain);
  if (!normalized) {
    throw new Error("Enter a storefront domain before creating a cart.");
  }
  if (!accessToken) {
    throw new Error("Enter a Storefront access token before creating a cart.");
  }
  if (lines.length === 0) {
    throw new Error("Add at least one product before creating a cart.");
  }

  const url = `https://${normalized}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  let response: Awaited<ReturnType<CartCreateFetcher>>;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: CART_CREATE_MUTATION,
        variables: {
          lines: lines.map((line) => ({
            merchandiseId: toMerchandiseGid(line.variantId),
            quantity: line.quantity,
          })),
        },
      }),
    });
  } catch (error) {
    throw new Error(
      `Could not reach the Storefront API at ${url}. Confirm the domain is correct and reachable.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Storefront API request failed (HTTP ${response.status}). Confirm the access token is valid.`,
    );
  }

  const json = await response.json();

  if (json.errors?.length) {
    const messages = json.errors.map((e) => e.message).join("; ");
    throw new Error(`Storefront API error: ${messages}`);
  }

  const userErrors = json.data?.cartCreate?.userErrors;
  if (userErrors?.length) {
    const messages = userErrors.map((e) => `${e.field.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Cart could not be created: ${messages}`);
  }

  const cartId = json.data?.cartCreate?.cart?.id;
  if (!cartId) {
    throw new Error("cartCreate succeeded but returned no cart ID.");
  }

  return { cartId };
}
