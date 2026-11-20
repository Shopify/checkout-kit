import { a as CheckoutTarget, c as LogLevel, h as Checkout, l as HTMLElementBase, m as CheckoutFailureCode, o as MessageRejectedDetail, p as CheckoutFailure, r as CheckoutMethods, s as TypedEventListener, u as CheckoutBlockedDetail } from "./checkout.types.js";
type DeepReadonly<Value> = Value extends object ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]>; } : Value;
/**
 * A child checkout snapshot. Checkout Kit omits the top-level `ucp` protocol
 * metadata and keeps every other checkout field, including `status`.
 * The snapshot and all nested objects and arrays are frozen and readonly.
 */
type ShopPaySnapshot = { readonly [Key in keyof Checkout as Key extends "ucp" ? never : Key]: Key extends "status" ? Checkout[Key] | "unknown" : DeepReadonly<Checkout[Key]>; } & {
  readonly ucp?: never;
};
/**
 * The session's state for a checkout resource. `active` defers to the child's
 * checkout status; other values describe a state outside that checkout.
 */
type ShopPayResourceStatus = "active" | "completed" | "failed" | "ejected" | "unknown";
/** Identifies the session revision and checkout resource a notification describes. */
interface ShopPayContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId: string;
  /** Absence and `active` defer to `checkout.status`. */
  readonly status?: ShopPayResourceStatus;
}
/** One resource entry in a public lifecycle batch. */
interface ShopPayResourceEventEntry {
  readonly context: ShopPayContext;
  readonly checkout: ShopPaySnapshot;
}
/** Each public event contains the accepted entries of one contiguous lifecycle batch. */
type ShopPayResourceEventDetail = readonly ShopPayResourceEventEntry[];
/** Session errors have no shop ID; resource errors retain their resource context. */
interface ShopPayErrorContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId?: string;
  /** The resource status when this is a resource error. */
  readonly status?: ShopPayResourceStatus;
}
/** Stable Checkout Kit error codes. Unrecognized checkout codes become `unknown`. */
type ShopPayErrorCode = CheckoutFailureCode;
/** A Kit-owned failure, independent of the checkout protocol's error response. */
type ShopPayFailure = CheckoutFailure;
/** One resource or session error in a public lifecycle batch. */
interface ShopPayErrorEventEntry {
  /** Absent for local presentation failures, such as an invalid checkout URL. */
  readonly context?: ShopPayErrorContext;
  /** The resource's final snapshot, when the producer supplied one. */
  readonly checkout?: ShopPaySnapshot;
  readonly error: ShopPayFailure;
}
type ShopPayErrorEventDetail = readonly ShopPayErrorEventEntry[];
declare class ShopPayStartEvent extends CustomEvent<ShopPayResourceEventDetail> {
  type: "start";
  constructor(detail: ShopPayResourceEventDetail);
}
declare class ShopPayUpdateEvent extends CustomEvent<ShopPayResourceEventDetail> {
  type: "update";
  constructor(detail: ShopPayResourceEventDetail);
}
declare class ShopPayCompleteEvent extends CustomEvent<ShopPayResourceEventDetail> {
  type: "complete";
  constructor(detail: ShopPayResourceEventDetail);
}
declare class ShopPayErrorEvent extends CustomEvent<ShopPayErrorEventDetail> {
  type: "error";
  constructor(detail: ShopPayErrorEventDetail);
}
declare global {
  interface HTMLElementTagNameMap {
    "shop-pay": ShopPay;
  }
}
/**
 * Presents a Universal session. Set `src` to a Universal session URL and call `open()` from a
 * buyer gesture, or add the `button` attribute to show Shop Pay's button, which opens checkout
 * when tapped. Events report the session's checkouts, one entry per shop.
 *
 * @tagname shop-pay
 *
 * @attribute src - A Universal session URL.
 * @attribute target - Where checkout is presented (auto, popup, new tab, or a named window).
 * @attribute log-level - Console logging verbosity (debug, warn, error, or none).
 * @attribute telemetry - Set to false to disable anonymous diagnostic metrics.
 * @attribute button - Shows Shop Pay's button; a tap opens checkout.
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
declare class ShopPay extends HTMLElementBase implements CheckoutMethods {
  #private;
  static observedAttributes: readonly ["src", "target", "telemetry", "button"];
  /**
   * Registers the element and returns the class registered for `name`.
   *
   * `import "@shopify/checkout-kit/shop-pay"` registers `<shop-pay>` for you.
   * Call this when importing from `@shopify/checkout-kit`, which registers nothing, or to use
   * a custom tag name. A registry accepts each constructor only once, so every custom name gets
   * its own subclass.
   *
   * Registering a name this class (or a subclass) already owns returns that class.
   *
   * @param name - The tag name. Defaults to `shop-pay`.
   * @param registry - The registry to define the element in. Defaults to `customElements`.
   * @throws {Error} If another element already owns `name`.
   */
  static register<T extends typeof ShopPay>(this: T, name?: string, registry?: CustomElementRegistry): T;
  constructor();
  get button(): boolean;
  set button(value: boolean | undefined);
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
  attributeChangedCallback(name: (typeof ShopPay.observedAttributes)[number], oldValue: string | null, newValue: string | null): void;
  override addEventListener<K extends keyof ShopPayEventMap>(type: K, listener: TypedEventListener<ShopPayEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: TypedEventListener<HTMLElementEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}
/** Public lifecycle events dispatched by the element. */
interface ShopPayEventMap {
  start: ShopPayStartEvent;
  update: ShopPayUpdateEvent;
  complete: ShopPayCompleteEvent;
  error: ShopPayErrorEvent;
  close: ShopPayCloseEvent;
  blocked: ShopPayBlockedEvent;
}
declare class ShopPayCloseEvent extends CustomEvent<null> {
  type: "close";
  constructor();
}
declare class ShopPayBlockedEvent extends CustomEvent<CheckoutBlockedDetail> {
  type: "blocked";
  constructor(detail: CheckoutBlockedDetail);
}
export { ShopPayFailure as a, ShopPaySnapshot as c, ShopPayErrorEventEntry as i, ShopPayEventMap as n, ShopPayResourceEventEntry as o, ShopPayErrorCode as r, ShopPayResourceStatus as s, ShopPay as t };
