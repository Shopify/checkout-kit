// Types for this component are derived from the 2026-04-08 UCP embedded
// checkout protocol. Payload shapes come from the shared
// `@shopify/checkout-kit-protocol` package (decoded to camelCase).

import type { Checkout, ReadyRequest, ErrorResponse } from "@shopify/checkout-kit-protocol";

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

export type CheckoutTarget = "auto" | "popup" | "_blank";

export interface CheckoutAttributes {
  src?: string;
  target?: CheckoutTarget | string;
  debug?: boolean | string;
}

export interface CheckoutMethods {
  /**
   * Opens the checkout in a popup window by default, but can be configured
   * to open in a new tab or named window using the `target` property.
   */
  open?: () => void;

  /**
   * Closes the checkout popup.
   * Can be used after checkout completion or to cancel the checkout process
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
   * - `'_blank' | `'auto'`: Opens checkout in a new tab (default)
   * - `string`: Opens checkout in a new named window
   *
   * For more details on window targets, see the [`Window.open()` `target` parameter](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target)
   *
   * This property is automatically reflected to the `target` attribute, so you can use the `target` attribute
   * or this property interchangeably.
   */
  target?: CheckoutTarget | string;

  /**
   * Whether the component should log diagnostic warnings to the console.
   *
   * @example
   * ```html
   * <shopify-checkout debug src="..."></shopify-checkout>
   * ```
   */
  debug?: boolean | string;
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
 * Mapping of the 2026-04-08 ECP messages this component handles to their
 * wire-format payloads. Delegation methods (fulfillment.address_change_request,
 * payment.instruments_change_request, payment.credential_request) and the
 * embedder→embedded `ec.submit` are intentionally omitted — this component
 * does not implement payment delegations.
 */
export interface CheckoutProtocolMessageMap {
  "ec.ready": ReadyRequest;
  "ec.start": { checkout: Checkout };
  "ec.complete": { checkout: Checkout };
  "ec.error": { error: ErrorResponse };
  "ec.line_items.change": { checkout: Checkout };
  "ec.totals.change": { checkout: Checkout };
  "ec.messages.change": { checkout: Checkout };
  "ec.window.open_request": { url: string };
}

export type {
  Buyer,
  Checkout,
  LineItem,
  Message,
  ReadyRequest,
  OrderConfirmation,
  CheckoutTotal,
  ErrorResponse,
} from "@shopify/checkout-kit-protocol";
