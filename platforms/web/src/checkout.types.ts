// Public component types and the internal protocol message map. Checkout Kit
// owns the top-level snapshots and events; nested checkout domain models reuse
// the shared protocol package's camelCase types.

import type {
  Checkout as ProtocolCheckout,
  ReadyRequest,
  ErrorResponse,
} from "@shopify/checkout-kit-protocol";

import type { LogLevel } from "./logger";

export type { LogLevel };
export type { Checkout } from "./models/checkout";
export type { CheckoutError, CheckoutErrorCode } from "./models/error";

// This component should follow the custom element conventions set out here:
// https://github.com/Shopify/ui-api-design/tree/main/codex. In particular,
// take note of the following:
//
// - Follow the web platform's convention for naming wherever possible
//   (e.g.: casing of attriute, property, and event names)
// - Follow the web platform's conventions on reflecting attributes to properties,
//   and on the default values of properties
// - Follow the web platform's convention for preferring properties on an
//   element over properties on events
// - For events that require more complex handling, follow patterns established
//   in more modern web APIs, like `FetchEvent.respondWith()` and
//   `ExtendableEvent.waitUntil()`.
// - For imperative methods, try to take inspiration from other element
//   methods, like `HTMLDialogElement.showModal()` and `HTMLDialogElement.close()`

// Documentation-safe types:

export type CheckoutTarget = "auto" | "popup" | "inline" | "_blank";
export type CheckoutAppearance = "app:light" | "app:dark" | "app:automatic" | "storefront";

export interface CheckoutAttributes {
  src?: string;
  target?: CheckoutTarget | string;
  appearance?: CheckoutAppearance | string;
  "log-level"?: LogLevel;
  telemetry?: boolean | "true" | "false";
  /**
   * Space/comma-separated list of extra trusted message origin patterns. Each
   * entry may be an exact origin (`https://example.com`), a wildcard subdomain
   * (`https://*.example.com`), or `*` to disable origin validation.
   */
  "allowed-origins"?: string;
}

/** Payload passed to {@link CheckoutProperties.onMessageRejected}. */
export interface MessageRejectedDetail {
  /** Origin of the dropped `MessageEvent`. */
  origin: string;
  /** Raw `event.data` of the dropped message. Treat as untrusted. */
  data: unknown;
  /** Human-readable reason the message was dropped. */
  reason: string;
}

export interface CheckoutMethods {
  /**
   * Opens checkout in the selected target. Inline mounts automatically when connected;
   * `open()` reopens a closed inline session and does not reload an active effective URL.
   * A disconnected inline element does not mount until connected.
   */
  open?: () => void;

  /**
   * Closes the active window or removes the inline iframe, preserving the latest checkout/error.
   * Repeated close is a no-op. Inline stays closed until open, a changed source/appearance,
   * re-entry into inline, or reconnection.
   */
  close?: () => void;
}

export interface CheckoutProperties {
  /**
   * The URL of the checkout to load. This will typically come from the `cart.checkoutUrl` field in
   * Shopify’s Storefront API, but could also be a cart permalink or other valid checkout URL.
   *
   * This property is automatically reflected to the `src` attribute, so you can use the `src` attribute
   * or this property interchangeably.
   */
  src?: string;

  /**
   * The mode in which to display the checkout when opened. Defaults to `'auto'`.
   * - `'popup'`: Opens checkout in a popup window
   * - `'inline'`: Automatically embeds checkout in a host-sized iframe. Supply a definite
   *   host or parent-container height; framing remains subject to checkout's CSP.
   * - `'_blank' | `'auto'`: Opens checkout in a new tab (default)
   * - `string`: Opens checkout in a new named window, except the reserved targets above
   *
   * Inline source/appearance changes start a fresh session; invalid or removed sources,
   * target changes, and disconnection close it. Completion leaves the receipt visible.
   *
   * For more details on window targets, see the [`Window.open()` `target` parameter](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target)
   *
   * This property is automatically reflected to the `target` attribute, so you can use the `target` attribute
   * or this property interchangeably.
   */
  target?: CheckoutTarget | string;

  /**
   * The checkout appearance preference. Defaults to `'storefront'`.
   *
   * This property is automatically reflected to the `appearance` attribute, so you can use the
   * `appearance` attribute or this property interchangeably.
   */
  appearance?: CheckoutAppearance | string;

  /**
   * Console logging verbosity. Ordered as a threshold — `debug` is the most
   * verbose and `none` silences everything; `warn` and `error` sit between.
   * Defaults to `'error'`.
   *
   * This property is automatically reflected to the `log-level` attribute, so
   * you can use the `log-level` attribute or this property interchangeably.
   *
   * @example
   * ```html
   * <shopify-checkout log-level="debug" src="..."></shopify-checkout>
   * ```
   */
  logLevel?: LogLevel;

  /**
   * Controls anonymous diagnostic metrics sent by Checkout Kit. Defaults to `true`.
   *
   * This property is reflected to the `telemetry` attribute. Set it to
   * `false` before opening checkout to opt out.
   */
  telemetry?: boolean;

  /**
   * Extra origins allowed to post incoming checkout-protocol messages, on top
   * of the always-trusted cart URL origin (from `src`) and Shopify-owned
   * `shop.app` and `shop.com` domains.
   *
   * Web is closed by default: with no configured origins only the cart URL
   * origin and Shopify-owned `shop.app` and `shop.com` domains (including
   * their subdomains) are trusted. Entries may
   * be exact origins (`https://example.com`), wildcard subdomains
   * (`https://*.example.com`), or `'*'` to disable origin validation entirely.
   *
   * Reflected to the space/comma-separated `allowed-origins` attribute.
   */
  allowedOrigins?: string[];

  /**
   * Called when an incoming message is dropped by origin validation. The smart
   * default logs a warning; override to observe rejected messages. Treat the
   * payload as untrusted — it was dropped precisely because its origin was not
   * in the allowlist.
   */
  onMessageRejected?: (detail: MessageRejectedDetail) => void;
}

export type TypedEventListener<Event> =
  | ((event: Event) => void)
  | {
      handleEvent(event: Event): void;
    };

/* ------------------------------------------------------------
 * Checkout Protocol
 * ------------------------------------------------------------
 */

/**
 * Mapping of the 2026-08-25 ECP messages this component handles to their
 * wire-format payloads. Delegation methods (fulfillment.address_change_request,
 * payment.instruments_change_request, payment.credential_request) and the
 * embedder→embedded `ec.submit` are intentionally omitted — this component
 * does not implement payment delegations.
 */
export interface CheckoutProtocolMessageMap {
  "ec.ready": ReadyRequest;
  "ec.start": { checkout: ProtocolCheckout };
  "ec.complete": { checkout: ProtocolCheckout };
  "ec.error": { error: ErrorResponse };
  "ec.fulfillment.change": { checkout: ProtocolCheckout };
  "ec.line_items.change": { checkout: ProtocolCheckout };
  "ec.totals.change": { checkout: ProtocolCheckout };
  "ec.messages.change": { checkout: ProtocolCheckout };
  "ec.window.open_request": { url: string };
}

export type {
  Buyer,
  LineItem,
  Message,
  ReadyRequest,
  OrderConfirmation,
  CheckoutTotal,
  ErrorResponse,
} from "@shopify/checkout-kit-protocol";
