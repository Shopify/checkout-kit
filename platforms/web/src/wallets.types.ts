// Types for the accelerated checkout buttons component.
// Follows the same conventions as checkout.types.ts — see
// https://github.com/Shopify/ui-api-design/tree/main/codex

import type { LogLevel } from "./logger";

export type { LogLevel };

export type WalletsLayout = "horizontal" | "vertical";

export interface WalletsAttributes {
  "store-domain"?: string;
  country?: string;
  language?: string;
  "cart-id"?: string;
  "variant-id"?: string;
  "selling-plan-id"?: string;
  "wallet-count"?: number;
  layout?: WalletsLayout | string;
  "log-level"?: LogLevel;
}

export interface WalletsProperties {
  /**
   * The storefront domain (e.g. `your-store.myshopify.com`).
   * Reflected to the `store-domain` attribute.
   */
  storeDomain?: string;

  /**
   * Two-letter country code (e.g. `US`, `CA`).
   * Reflected to the `country` attribute.
   */
  country?: string;

  /**
   * BCP-47 language tag (e.g. `en`, `fr`).
   * Reflected to the `language` attribute.
   */
  language?: string;

  /**
   * Shopify cart GID for an existing-cart purchase flow.
   * Reflected to the `cart-id` attribute.
   */
  cartId?: string;

  /**
   * Product variant GID for a buy-now purchase flow.
   * Reflected to the `variant-id` attribute.
   */
  variantId?: string;

  /**
   * Optional selling plan GID (buy-now flow only).
   * Reflected to the `selling-plan-id` attribute.
   */
  sellingPlanId?: string;

  /**
   * Maximum number of wallet buttons to render. `0` means show all available.
   * Reflected to the `wallet-count` attribute.
   */
  walletCount?: number;

  /**
   * Button layout direction. Defaults to `'horizontal'`.
   * Reflected to the `layout` attribute.
   */
  layout?: WalletsLayout | string;

  /**
   * Console logging verbosity. Ordered as a threshold — `debug` is the most
   * verbose and `none` silences everything. Defaults to `'error'`.
   * Reflected to the `log-level` attribute.
   */
  logLevel?: LogLevel;
}
