import { a as CheckoutTarget, c as LogLevel, h as Checkout, l as HTMLElementBase, m as CheckoutFailureCode, o as MessageRejectedDetail, p as CheckoutFailure, r as CheckoutMethods, s as TypedEventListener, u as CheckoutBlockedDetail } from "./checkout.types.js";
type DeepReadonly<Value> = Value extends object ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]>; } : Value;
/**
 * A child checkout snapshot. Checkout Kit omits the top-level `ucp` protocol
 * metadata and keeps every other checkout field, including `status`.
 * The snapshot and all nested objects and arrays are frozen and readonly.
 */
type UniversalCheckoutSnapshot = { readonly [Key in keyof Checkout as Key extends "ucp" ? never : Key]: Key extends "status" ? Checkout[Key] | "unknown" : DeepReadonly<Checkout[Key]>; } & {
  readonly ucp?: never;
};
/**
 * The session's state for a checkout resource. `active` defers to the child's
 * checkout status; other values describe a state outside that checkout.
 */
type UniversalCheckoutResourceStatus = "active" | "completed" | "failed" | "ejected" | "unknown";
/** Identifies the session revision and checkout resource a notification describes. */
interface UniversalCheckoutContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId: string;
  /** Absence and `active` defer to `checkout.status`. */
  readonly status?: UniversalCheckoutResourceStatus;
}
/** One resource entry in a public lifecycle batch. */
interface UniversalCheckoutResourceEventEntry {
  readonly context: UniversalCheckoutContext;
  readonly checkout: UniversalCheckoutSnapshot;
}
/** Each public event contains the accepted entries of one contiguous lifecycle batch. */
type UniversalCheckoutResourceEventDetail = readonly UniversalCheckoutResourceEventEntry[];
/** Session errors have no shop ID; resource errors retain their resource context. */
interface UniversalCheckoutErrorContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId?: string;
  /** The resource status when this is a resource error. */
  readonly status?: UniversalCheckoutResourceStatus;
}
/** Stable Checkout Kit error codes. Unrecognized checkout codes become `unknown`. */
type UniversalCheckoutErrorCode = CheckoutFailureCode;
/** A Kit-owned failure, independent of the checkout protocol's error response. */
type UniversalCheckoutFailure = CheckoutFailure;
/** One resource or session error in a public lifecycle batch. */
interface UniversalCheckoutErrorEventEntry {
  /** Absent for local presentation failures, such as an invalid checkout URL. */
  readonly context?: UniversalCheckoutErrorContext;
  /** The resource's final snapshot, when the producer supplied one. */
  readonly checkout?: UniversalCheckoutSnapshot;
  readonly error: UniversalCheckoutFailure;
}
type UniversalCheckoutErrorEventDetail = readonly UniversalCheckoutErrorEventEntry[];
declare class ShopifyUniversalCheckoutStartEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  type: "start";
  constructor(detail: UniversalCheckoutResourceEventDetail);
}
declare class ShopifyUniversalCheckoutUpdateEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  type: "update";
  constructor(detail: UniversalCheckoutResourceEventDetail);
}
declare class ShopifyUniversalCheckoutCompleteEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  type: "complete";
  constructor(detail: UniversalCheckoutResourceEventDetail);
}
declare class ShopifyUniversalCheckoutErrorEvent extends CustomEvent<UniversalCheckoutErrorEventDetail> {
  type: "error";
  constructor(detail: UniversalCheckoutErrorEventDetail);
}
declare global {
  interface HTMLElementTagNameMap {
    "shopify-universal-checkout": ShopifyUniversalCheckout;
  }
}
/**
 * A Universal Checkout element. Checkout Kit answers the batched `ec.ready`
 * handshake, validates every entry of each JSON-RPC batch, commits the batch to
 * the session state, then dispatches ordered arrays of accepted notifications.
 *
 * @tagname shopify-universal-checkout
 *
 * @attribute src - A Universal Checkout continuation URL.
 * @attribute target - Where checkout is presented (auto, popup, new tab, or a named window).
 * @attribute log-level - Console logging verbosity (debug, warn, error, or none).
 * @attribute telemetry - Set to false to disable anonymous diagnostic metrics.
 *
 * @event start - One or more child checkouts became interactive.
 * @event update - One or more child snapshots or resource statuses changed.
 * @event complete - One or more shops completed; sibling checkouts may continue.
 * @event error - One or more resource or session failures.
 * @event close - The presentation closed, including after `complete` or `error`; closing alone
 * says nothing about the outcome. Detail is null.
 * @event blocked - The browser blocked the checkout window. The overlay offers a retry, and
 * dismissing it dispatches `close`.
 *
 * @slot overlay - Replaces the overlay contents shown while checkout is open.
 * @slot overlay-blocked - Replaces the overlay contents shown when the window was blocked.
 * @csspart overlay - The overlay scrim shown over the page while checkout is open.
 * @cssprop --shopify-checkout-dialog-width - Popup width in pixels. Defaults to 600.
 * @cssprop --shopify-checkout-dialog-height - Popup height in pixels. Defaults to 600.
 */
declare class ShopifyUniversalCheckout extends HTMLElementBase implements CheckoutMethods {
  #private;
  static observedAttributes: readonly ["src", "target", "telemetry"];
  /**
   * Registers the element and returns the class registered for `name`.
   *
   * `import "@shopify/checkout-kit/shopify-universal-checkout"` registers `<shopify-universal-checkout>` for you.
   * Call this when importing from `@shopify/checkout-kit`, which registers nothing, or to use
   * a custom tag name. A registry accepts each constructor only once, so every custom name gets
   * its own subclass.
   *
   * Registering a name this class (or a subclass) already owns returns that class.
   *
   * @param name - The tag name. Defaults to `shopify-universal-checkout`.
   * @param registry - The registry to define the element in. Defaults to `customElements`.
   * @throws {Error} If another element already owns `name`.
   */
  static register<T extends typeof ShopifyUniversalCheckout>(this: T, name?: string, registry?: CustomElementRegistry): T;
  constructor();
  get src(): string;
  set src(value: string | undefined);
  get target(): CheckoutTarget | string;
  set target(value: CheckoutTarget | string | undefined);
  get logLevel(): LogLevel;
  set logLevel(value: LogLevel | undefined);
  get telemetry(): boolean;
  set telemetry(value: boolean | undefined);
  onMessageRejected?: (detail: MessageRejectedDetail) => void;
  open(): void;
  /**
   * Closes checkout and its overlay. Safe to call from any event listener: when one
   * checkout message produces several events, the element dispatches all of them
   * before it closes.
   */
  close(): void;
  override focus(): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: (typeof ShopifyUniversalCheckout.observedAttributes)[number], oldValue: string | null, newValue: string | null): void;
  override addEventListener<K extends keyof ShopifyUniversalCheckoutEventMap>(type: K, listener: TypedEventListener<ShopifyUniversalCheckoutEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: TypedEventListener<HTMLElementEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}
/** Public lifecycle events dispatched by the element. */
interface ShopifyUniversalCheckoutEventMap {
  start: ShopifyUniversalCheckoutStartEvent;
  update: ShopifyUniversalCheckoutUpdateEvent;
  complete: ShopifyUniversalCheckoutCompleteEvent;
  error: ShopifyUniversalCheckoutErrorEvent;
  close: ShopifyUniversalCheckoutCloseEvent;
  blocked: ShopifyUniversalCheckoutBlockedEvent;
}
declare class ShopifyUniversalCheckoutCloseEvent extends CustomEvent<null> {
  type: "close";
  constructor();
}
declare class ShopifyUniversalCheckoutBlockedEvent extends CustomEvent<CheckoutBlockedDetail> {
  type: "blocked";
  constructor(detail: CheckoutBlockedDetail);
}
export { UniversalCheckoutFailure as a, UniversalCheckoutSnapshot as c, UniversalCheckoutErrorEventEntry as i, ShopifyUniversalCheckoutEventMap as n, UniversalCheckoutResourceEventEntry as o, UniversalCheckoutErrorCode as r, UniversalCheckoutResourceStatus as s, ShopifyUniversalCheckout as t };
