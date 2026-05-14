/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// Types for this component are derived from the 2026-04-08 UCP embedded
// checkout protocol. Embed payload shapes live in `./ucp-embed-types.ts`.

import type { Checkout, EcReadyParams, ShopCash, UcpErrorResponse } from "./ucp-embed-types";

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
  preload?: boolean | string;
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
   * Whether to preload critical assets and data.
   * Setting this attribute will cause the checkout to prefetch resources for faster loading
   *
   * This property is automatically reflected to the `preload` attribute, so you can use the `preload` attribute
   * or this property interchangeably.
   */
  preload?: boolean | string;

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

// If I just used the raw Event class types here, the docs would output the entire documentation for `Event`
// on every event type. This is kind of neat, but makes the pages huge, and doesn’t make it clear what fields
// are actually important to the user. To get nice docs output, I instead created "*Docs" types that declare
// what we actually want to show on the docs, and the implementation implements those interfaces in its types.
export interface CheckoutEvents {
  /**
   * Dispatched when checkout has started.
   */
  "ec:start": EcStartEvent;

  /**
   * Dispatched when the checkout was successfully completed.
   */
  "ec:complete": EcCompleteEvent;

  /**
   * Dispatched when the checkout overlay is closed, either due to user action or
   * from calling the `close()` method. Synthetic — not part of the ECP wire protocol.
   */
  "checkout:close": CheckoutCloseEvent;

  /**
   * Dispatched on a session-level fatal error. The host should tear down the
   * embedded context.
   */
  "ec:error": EcErrorEvent;

  /**
   * Dispatched when the cart line items change.
   */
  "ec:lineItemsChange": EcLineItemsChangeEvent;

  /**
   * Dispatched when the buyer information changes.
   */
  "ec:buyerChange": EcBuyerChangeEvent;

  /**
   * Dispatched when the totals change.
   */
  "ec:totalsChange": EcTotalsChangeEvent;

  /**
   * Dispatched when checkout messages (warnings, errors, info) change.
   */
  "ec:messagesChange": EcMessagesChangeEvent;
}

export interface CheckoutEvent {
  target?: CheckoutElement;
}

export interface EcStartEvent extends CheckoutEvent {
  type: "ec:start";
}

export interface EcCompleteEvent extends CheckoutEvent {
  type: "ec:complete";
}

export interface CheckoutCloseEvent extends CheckoutEvent {
  type: "checkout:close";
}

export interface EcErrorEvent extends CheckoutEvent {
  type: "ec:error";
}

export interface EcLineItemsChangeEvent extends CheckoutEvent {
  type: "ec:lineItemsChange";
}

export interface EcBuyerChangeEvent extends CheckoutEvent {
  type: "ec:buyerChange";
}

export interface EcTotalsChangeEvent extends CheckoutEvent {
  type: "ec:totalsChange";
}

export interface EcMessagesChangeEvent extends CheckoutEvent {
  type: "ec:messagesChange";
}

export type TypedEventListener<Event> =
  | ((event: Event) => void)
  | {
      handleEvent(event: Event): void;
    };

export type CheckoutElement = CheckoutMethods & CheckoutProperties & CheckoutEvents;

/* ------------------------------------------------------------
 * Checkout Protocol
 * ------------------------------------------------------------
 */

/**
 * A checkout protocol message as it is communicated via postMessage (JSON-RPC 2.0 format)
 */
export interface CheckoutProtocolMessageData<
  T extends keyof CheckoutProtocolMessageMap = keyof CheckoutProtocolMessageMap,
> {
  jsonrpc: "2.0";
  method: T;
  params?: CheckoutProtocolMessageMap[T];
}

/** Common payload shape for messages that carry the full Checkout object. */
interface CheckoutPayload {
  checkout: Checkout;
  shop_cash?: ShopCash;
}

/**
 * Mapping of the 2026-04-08 ECP messages this component handles to their
 * wire-format payloads. Delegation methods (fulfillment.address_change_request,
 * payment.instruments_change_request, payment.credential_request) and the
 * embedder→embedded `ec.submit` are intentionally omitted — this component
 * does not implement payment delegations.
 */
export interface CheckoutProtocolMessageMap {
  "ec.ready": EcReadyParams;
  "ec.start": CheckoutPayload;
  "ec.complete": CheckoutPayload;
  "ec.error": UcpErrorResponse;
  "ec.line_items.change": CheckoutPayload;
  "ec.buyer.change": CheckoutPayload;
  "ec.totals.change": CheckoutPayload;
  "ec.messages.change": CheckoutPayload;
  "ec.window.open_request": { url: string };
}

export type {
  Checkout,
  CheckoutMessage,
  EcReadyParams,
  OrderConfirmation,
  ShopCash,
  UcpErrorResponse,
} from "./ucp-embed-types";
