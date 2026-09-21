export type WalletLayout = "horizontal" | "vertical";

/**
 * Opaque existing-cart reference. Keep it out of markup, URLs, logs, events,
 * and telemetry. Its transport-specific representation is not part of this API.
 */
export type CartIdentifier = string;

export type KnownWalletErrorCode =
  | "merchandise_unavailable"
  | "cart_validation_rejected"
  | "purchase_configuration_invalid"
  | "wallet_provider_unavailable"
  | "unexpected_error";

export interface WalletDisplayError {
  phase: "initialization" | "interaction";
  code: KnownWalletErrorCode | (string & {});
  message?: string;
}

export interface WalletCallbacks {
  ready?(): void;
  error?(error: WalletDisplayError | null): void;
}

export interface WalletPurchaseSnapshot {
  readonly storeDomain?: string;
  readonly country?: string;
  readonly locale?: string;
  readonly currency?: string;
  readonly cartId?: CartIdentifier;
  readonly variantId?: string;
  readonly sellingPlanId?: string;
}

export interface GetCartRequest {
  readonly purchase: Readonly<WalletPurchaseSnapshot>;
  readonly wallet: string;
  readonly signal: AbortSignal;
}

/**
 * Creates a cart for an accepted Buy Now wallet interaction and returns the
 * identifier Checkout Kit should use for that cart.
 */
export type GetCart = (request: GetCartRequest) => Promise<CartIdentifier>;

/**
 * A replay-safe patch accepted by `configure()`. Omitted members preserve
 * their current values; an explicitly supplied `undefined` clears a member.
 */
export interface WalletConfiguration {
  storeDomain?: string;
  country?: string;
  locale?: string;
  currency?: string;
  cartId?: CartIdentifier;
  variantId?: string;
  sellingPlanId?: string;
  walletCount?: number;
  layout?: WalletLayout;
  getCart?: GetCart;
  callbacks?: WalletCallbacks;
}

export interface WalletsAttributes {
  "store-domain"?: string;
  country?: string;
  locale?: string;
  currency?: string;
  "variant-id"?: string;
  "selling-plan-id"?: string;
  "wallet-count"?: number;
  layout?: WalletLayout;
}

export interface WalletsProperties {
  storeDomain?: string;
  country?: string;
  locale?: string;
  currency?: string;
  cartId?: CartIdentifier;
  variantId?: string;
  sellingPlanId?: string;
  walletCount: number;
  layout?: WalletLayout;
  getCart?: GetCart;
  callbacks?: WalletCallbacks;
  configure(configuration: WalletConfiguration): void;
}
