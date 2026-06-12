// Types for this component are derived from the UCP embedded checkout
// protocol. Wire payload shapes are generated from the canonical JSON schemas
// in `@shopify/checkout-kit-protocol/web`.

import type {
  Buyer,
  Checkout,
  CheckoutLineItem,
  CheckoutMessage,
  EcReadyParams,
  OrderConfirmation,
  Total,
  UcpErrorResponse,
} from "@shopify/checkout-kit-protocol/web";

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

// Docs-friendly event interfaces. Each carries the same `detail` shape as the
// corresponding `CustomEvent<T>` subclass exported from `./checkout.ts`. They
// exist so the generated API docs show what's on `event.detail` directly,
// without dragging in the full `CustomEvent`/`Event` documentation.
export interface CheckoutEvents {
  /**
   * Dispatched when checkout has started.
   */
  "checkout:start": CheckoutStartEvent;

  /**
   * Dispatched when the checkout was successfully completed.
   */
  "checkout:complete": CheckoutCompleteEvent;

  /**
   * Dispatched when the checkout overlay is closed, either due to user action or
   * from calling the `close()` method. Synthetic — not part of the ECP wire protocol.
   */
  "checkout:close": CheckoutCloseEvent;

  /**
   * Dispatched on a session-level fatal error. The host should tear down the
   * embedded context.
   */
  "checkout:error": CheckoutErrorEvent;

  /**
   * Dispatched when the cart line items change.
   */
  "checkout:lineItemsChange": CheckoutLineItemsChangeEvent;

  /**
   * Dispatched when the buyer information changes.
   */
  "checkout:buyerChange": CheckoutBuyerChangeEvent;

  /**
   * Dispatched when the totals change.
   */
  "checkout:totalsChange": CheckoutTotalsChangeEvent;

  /**
   * Dispatched when checkout messages (warnings, errors, info) change.
   */
  "checkout:messagesChange": CheckoutMessagesChangeEvent;
}

export interface CheckoutStartEvent {
  type: "checkout:start";
  detail: {
    /** Initial checkout snapshot. */
    checkout: Checkout;
  };
}

export interface CheckoutCompleteEvent {
  type: "checkout:complete";
  detail: {
    /** Final checkout snapshot. */
    checkout: Checkout;
    /** Order confirmation. */
    order: OrderConfirmation;
  };
}

export interface CheckoutCloseEvent {
  type: "checkout:close";
  detail: undefined;
}

export interface CheckoutErrorEvent {
  type: "checkout:error";
  detail: {
    /** Error payload from the ECP `ec.error` notification. */
    error: UcpErrorResponse;
  };
}

export interface CheckoutLineItemsChangeEvent {
  type: "checkout:lineItemsChange";
  detail: {
    /** Updated cart line items. */
    lineItems: readonly CheckoutLineItem[];
    /** Full checkout snapshot for handlers that want broader context. */
    checkout: Checkout;
  };
}

export interface CheckoutBuyerChangeEvent {
  type: "checkout:buyerChange";
  detail: {
    /** Updated buyer (may be undefined when buyer information is cleared). */
    buyer: Buyer | undefined;
    /** Full checkout snapshot for handlers that want broader context. */
    checkout: Checkout;
  };
}

export interface CheckoutTotalsChangeEvent {
  type: "checkout:totalsChange";
  detail: {
    /** Updated totals. */
    totals: readonly Total[];
    /** Full checkout snapshot for handlers that want broader context. */
    checkout: Checkout;
  };
}

export interface CheckoutMessagesChangeEvent {
  type: "checkout:messagesChange";
  detail: {
    /** Updated checkout-level messages (warnings, errors, info). */
    messages: readonly CheckoutMessage[];
    /** Full checkout snapshot for handlers that want broader context. */
    checkout: Checkout;
  };
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
}

/** `ec.error` wraps the generated error response in the JSON-RPC `params.error` field. */
export interface EcErrorParams {
  error: UcpErrorResponse;
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
  "ec.error": EcErrorParams;
  "ec.line_items.change": CheckoutPayload;
  "ec.buyer.change": CheckoutPayload;
  "ec.totals.change": CheckoutPayload;
  "ec.messages.change": CheckoutPayload;
  "ec.window.open_request": { url: string };
}

export type {
  Buyer,
  Checkout,
  CheckoutLineItem,
  CheckoutMessage,
  EcReadyParams,
  OrderConfirmation,
  Total,
  UcpErrorResponse,
} from "@shopify/checkout-kit-protocol/web";
