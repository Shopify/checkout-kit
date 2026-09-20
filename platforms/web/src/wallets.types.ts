// Types for the accelerated checkout buttons component.
// Follows the same conventions as checkout.types.ts — see
// https://github.com/Shopify/ui-api-design/tree/main/codex

import type { LogLevel } from "./logger";

export type { LogLevel };

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export type WalletsLayout = "horizontal" | "vertical";

/* ------------------------------------------------------------------ */
/*  Purchase flow                                                      */
/* ------------------------------------------------------------------ */

/** Exactly one flow is active per element instance. */
export type PurchaseFlow = "cart" | "product";

/**
 * Immutable snapshot of the accepted purchase, handed to
 * {@link CreateCartFunction} so the merchant can create/resolve the cart
 * against the exact context Kit is acting on.
 */
export interface PurchaseSnapshot {
  readonly storeDomain: string;
  readonly country: string;
  readonly language: string;
  readonly currency?: string;
  readonly variantId?: string;
  readonly sellingPlanId?: string;
}

/* ------------------------------------------------------------------ */
/*  Cart creation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Request passed to {@link CreateCartFunction}. Contains an immutable
 * purchase snapshot, the selected wallet, and a cancellation signal.
 */
export interface CreateCartRequest {
  readonly purchase: PurchaseSnapshot;
  /** The wallet the buyer is attempting (e.g. `shop_pay`, `apple_pay`). */
  readonly wallet: string;
  /** Aborted when the purchase changes or the element is torn down. */
  readonly signal: AbortSignal;
}

/**
 * Merchant-supplied cart creation override. When set on the element's
 * `createCart` property, Kit invokes it during an accepted wallet
 * interaction instead of the default runtime-owned cart path.
 *
 * Must return a Shopify cart GID.
 */
export type CreateCartFunction = (request: CreateCartRequest) => Promise<string>;

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

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

export type WalletAvailability =
  | { state: "loading" }
  | {
      state: "ready";
      rendered: ReadonlyArray<string>;
      failed: ReadonlyArray<string>;
    }
  | {
      state: "unavailable";
      reason: "no_wallet" | "setup_error";
      failed: ReadonlyArray<string>;
    };

/* ------------------------------------------------------------------ */
/*  Configure input (stable bootstrap scalars only)                    */
/* ------------------------------------------------------------------ */

/**
 * Inputs accepted by `configure()`. Contains only stable, replay-safe
 * bootstrap scalars. Callbacks / functions are set via dedicated
 * writable properties (`createCart`), not through `configure()`.
 */
export interface WalletConfigureInput {
  storeDomain?: string;
  country?: string;
  language?: string;
  currency?: string;
  walletCount?: number;
  layout?: WalletsLayout;
  accessToken?: string;
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

export interface WalletConfig {
  name: string;
  wallet_params: Record<string, unknown>;
}

export interface VariantParams {
  id: string;
  requiresShipping: boolean;
}

export interface WalletBootstrap {
  shopId: string;
  presentmentCurrency?: string;
  walletConfigs: WalletConfig[];
  recommendedWallet: WalletConfig | null;
  fallbackWallet: WalletConfig | null;
  variantParams: VariantParams[];
  enabledFlags: string[];
}

/* ------------------------------------------------------------------ */
/*  Child render outcome (PW must implement)                           */
/* ------------------------------------------------------------------ */

/**
 * Outcome the PW child element reports back to Kit once its wallets
 * have resolved. PW dispatches a private `__wallets_child_outcome`
 * CustomEvent with this detail, or calls the `onOutcome` handler
 * Kit sets on the child.
 */
export interface ChildRenderOutcome {
  /** Wallets that rendered successfully. */
  rendered: string[];
  /** Wallets that failed to load/render. */
  failed: string[];
}

/* ------------------------------------------------------------------ */
/*  Portable Wallets runtime boundary                                  */
/* ------------------------------------------------------------------ */

export interface WalletChild extends HTMLElement {
  setCheckoutClient(client: unknown): void;
  setDatasource(datasource: unknown): void;
  setSurfaceAdapter(adapter: unknown): void;
  setTopLevelErrorHandler(handler: (code: string, message: string) => void): void;
  /**
   * Kit sets this handler before appending the child. PW calls it once
   * its wallets resolve (render or fail). Kit does NOT report `ready`
   * until this fires.
   */
  setRenderOutcomeHandler(handler: (outcome: ChildRenderOutcome) => void): void;
  checkoutChanged(change: { type: string }): void;
}

export interface WalletRuntime {
  /**
   * Lazy-load the PW runtime. Called ONLY after all initialization
   * gates pass (connected, valid config, bootstrap succeeds with
   * candidates). Must not be called merely by importing wallets.js
   * or while configuration is incomplete.
   */
  ensureLoaded(): Promise<void>;

  createChild(mode: "single" | "multi"): WalletChild;

  createCheckoutClient(options: {
    storeDomain: string;
    accessToken: string;
    country: string;
    language: string;
    onTerminalError: (code: string, message?: string) => void;
  }): unknown;

  createDatasource(options: {
    checkoutClient: unknown;
    /** Synchronous cart-id source for the existing-cart flow. */
    resolveCartId?: () => string | null;
    /**
     * Async cart supplier invoked at wallet activation. Kit builds this
     * from its activation resolver (product cartCreate or /api/cart).
     * PW's datasource calls it instead of its own cart creation.
     */
    createCart?: (wallet: string) => Promise<string>;
  }): unknown;

  createSurfaceAdapter(cartTokenSource: () => string | null): unknown;

  /**
   * Runtime-owned cart resolver for the existing-cart flow. Fetches the
   * cart ID from the same-origin `/api/cart` endpoint (Hydrogen/Oxygen
   * convention: `GET /api/cart` → `{cart: {id}}`).
   * Called fresh at each wallet activation, not cached.
   */
  resolveCurrentCart(): Promise<string | null>;
}

/* ------------------------------------------------------------------ */
/*  DOM events                                                         */
/* ------------------------------------------------------------------ */

export interface ExpressCheckoutsRenderEventDetail {
  availability: WalletAvailability;
}

export interface ExpressCheckoutsErrorEventDetail {
  error: WalletDisplayError;
}

/* ------------------------------------------------------------------ */
/*  Attribute / property interfaces                                    */
/* ------------------------------------------------------------------ */

export interface WalletsAttributes {
  "store-domain"?: string;
  "access-token"?: string;
  country?: string;
  language?: string;
  "variant-id"?: string;
  "selling-plan-id"?: string;
  "wallet-count"?: number;
  layout?: WalletsLayout | string;
  "log-level"?: LogLevel;
}

export interface WalletsProperties {
  storeDomain?: string;
  country?: string;
  language?: string;
  variantId?: string;
  sellingPlanId?: string;
  walletCount?: number;
  layout?: WalletsLayout | string;
  logLevel?: LogLevel;

  /** Programmatic configuration patch (stable scalars only). */
  configure?(input: WalletConfigureInput): void;
  /** Merchant cart-creation override (buy-now flow). */
  createCart?: CreateCartFunction;
  /** Signal that the underlying cart changed (same id). */
  cartUpdated?(): void;

  readonly availability?: WalletAvailability;
  readonly error?: WalletDisplayError | null;
}
