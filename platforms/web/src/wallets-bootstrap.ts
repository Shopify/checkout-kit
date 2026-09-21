import type {
  WalletBootstrap,
  WalletConfig,
  WalletPurchaseContext,
  VariantParams,
} from "./wallets.types";

export interface FetchWalletConfigsRequest {
  storeDomain: string;
  accessToken: string;
  country: string;
  language: string;
  flow: "cart" | "product";
  cartId?: string;
  variantId?: string;
  sellingPlanId?: string;
  currency?: string;
}

/** Shape returned by the Core `POST /wallets/configs` bootstrap endpoint. */
interface WalletConfigsResponse {
  shopId?: string;
  presentmentCurrency?: string;
  walletConfigs?: WalletConfig[];
  recommendedWallet?: WalletConfig | null;
  fallbackWallet?: WalletConfig | null;
  flags?: string[];
  purchaseContext?: WalletPurchaseContext | null;
  variantConfigs?: Array<{ id: string; requiresShipping: boolean }>;
}

export type BootstrapFetcher = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<WalletConfigsResponse> }>;

/**
 * Bootstraps the wallet configuration from `POST /wallets/configs`.
 *
 * The local prototype authenticates the public Storefront token and permits
 * only its configured Hydrogen origin. The token is already browser-safe for
 * individually authorized Storefront operations.
 */
export async function fetchWalletConfigs(
  request: FetchWalletConfigsRequest,
  fetcher: BootstrapFetcher = fetch,
): Promise<WalletBootstrap> {
  const host = normalizeHost(request.storeDomain);
  const url = `https://${host}/wallets/configs`;

  if (!request.accessToken) {
    throw new Error("[checkout-kit] accessToken is required for wallet bootstrap");
  }

  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": request.accessToken,
    },
    body: JSON.stringify(buildPayload(request)),
  });

  if (!response.ok) {
    throw new Error(`[checkout-kit] wallet bootstrap failed (HTTP ${response.status})`);
  }

  return mapResponse(await response.json());
}

function buildPayload(request: FetchWalletConfigsRequest): Record<string, unknown> {
  const common: Record<string, unknown> = {
    country: request.country,
    currency: request.currency,
    locale: request.language,
  };

  if (request.flow === "cart") {
    return { type: "cart", identifier: request.cartId, ...common };
  }

  return {
    type: "product",
    identifier: request.variantId,
    selling_plan_id: request.sellingPlanId,
    ...common,
  };
}

function mapResponse(data: WalletConfigsResponse): WalletBootstrap {
  return {
    shopId: data.shopId ?? "",
    presentmentCurrency: data.presentmentCurrency,
    walletConfigs: data.walletConfigs ?? [],
    recommendedWallet: data.recommendedWallet ?? null,
    fallbackWallet: data.fallbackWallet ?? null,
    purchaseContext: mapPurchaseContext(data.purchaseContext),
    // Use string ids (avoid Number(gid) — the PR bug).
    variantParams: (data.variantConfigs ?? []).map(
      (v): VariantParams => ({
        id: String(v.id),
        requiresShipping: v.requiresShipping,
      }),
    ),
    enabledFlags: data.flags ?? [],
  };
}

function mapPurchaseContext(
  context: WalletPurchaseContext | null | undefined,
): WalletPurchaseContext | undefined {
  if (context == null) return undefined;
  if (
    typeof context.requiresShipping !== "boolean" ||
    typeof context.hasSellingPlan !== "boolean"
  ) {
    throw new Error("[checkout-kit] wallet bootstrap returned invalid purchase context");
  }

  return context;
}

function normalizeHost(storeDomain: string): string {
  return storeDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
