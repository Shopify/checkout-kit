import { a as CheckoutTarget, c as LogLevel, d as CheckoutError, h as Checkout, i as CheckoutProperties, l as HTMLElementBase, n as CheckoutAttributes, o as MessageRejectedDetail, r as CheckoutMethods, s as TypedEventListener, t as CheckoutAppearance } from "./checkout.types.js";
interface ShopifyCheckoutStartEventDetail {
  checkout: Checkout;
}
interface ShopifyCheckoutUpdateEventDetail {
  checkout: Checkout;
}
interface ShopifyCheckoutCompleteEventDetail {
  checkout: Checkout;
}
interface ShopifyCheckoutErrorEventDetail {
  error: CheckoutError;
}
type CheckoutBlockedCode = "popup_blocked";
interface ShopifyCheckoutBlockedEventDetail {
  code: CheckoutBlockedCode;
}
declare class ShopifyCheckoutStartEvent extends CustomEvent<ShopifyCheckoutStartEventDetail> {
  type: "start";
  constructor(detail: ShopifyCheckoutStartEventDetail);
}
declare class ShopifyCheckoutUpdateEvent extends CustomEvent<ShopifyCheckoutUpdateEventDetail> {
  type: "update";
  constructor(detail: ShopifyCheckoutUpdateEventDetail);
}
declare class ShopifyCheckoutCompleteEvent extends CustomEvent<ShopifyCheckoutCompleteEventDetail> {
  type: "complete";
  constructor(detail: ShopifyCheckoutCompleteEventDetail);
}
declare class ShopifyCheckoutCloseEvent extends CustomEvent<null> {
  type: "close";
  constructor();
}
declare class ShopifyCheckoutBlockedEvent extends CustomEvent<ShopifyCheckoutBlockedEventDetail> {
  type: "blocked";
  constructor(detail: ShopifyCheckoutBlockedEventDetail);
}
declare class ShopifyCheckoutErrorEvent extends CustomEvent<ShopifyCheckoutErrorEventDetail> {
  type: "error";
  constructor(detail: ShopifyCheckoutErrorEventDetail);
}
interface ShopifyCheckoutEventMap {
  start: ShopifyCheckoutStartEvent;
  update: ShopifyCheckoutUpdateEvent;
  complete: ShopifyCheckoutCompleteEvent;
  error: ShopifyCheckoutErrorEvent;
  close: ShopifyCheckoutCloseEvent;
  blocked: ShopifyCheckoutBlockedEvent;
}
declare global {
  interface HTMLElementTagNameMap {
    "shopify-checkout": ShopifyCheckout;
  }
}
/**
 * An element that renders a Shopify Checkout. Checkout opens in a popup or browser tab/window
 * (see `target`). To use, create a `shopify-checkout` element, set the `src` attribute to the
 * checkout URL (typically retrieved from the `cart.checkoutUrl` field), and then call `open()`.
 *
 * @attribute src - The URL of the checkout to load.
 * @attribute target - Where the checkout is presented (auto, popup, new tab, or a named window).
 * @attribute appearance - Checkout appearance preference (app:light, app:dark, app:automatic, storefront).
 * @attribute log-level - Console logging verbosity (debug, warn, error, or none).
 * @attribute allowed-origins - Extra trusted message origins, separated by spaces or commas.
 * @attribute telemetry - Set to false to disable anonymous diagnostic metrics.
 *
 * @event {ShopifyCheckoutStartEvent} start - Checkout has started.
 * @event {ShopifyCheckoutUpdateEvent} update - The checkout snapshot changed.
 * @event {ShopifyCheckoutCompleteEvent} complete - Checkout completed successfully.
 * @event {ShopifyCheckoutErrorEvent} error - Checkout could not open or reported a terminal error. Opening failures close a previous presentation first; protocol errors close it after this event.
 * @event {ShopifyCheckoutCloseEvent} close - The session ended through `close()`, overlay dismissal, or the buyer closing the window; detail is null.
 * @event {ShopifyCheckoutBlockedEvent} blocked - The browser blocked the checkout window.
 *
 * @slot overlay - Replaces the overlay contents shown while checkout is open.
 * @slot overlay-blocked - Replaces the overlay contents shown when the window was blocked.
 * @csspart overlay - The overlay scrim shown over the page while checkout is open.
 * @cssprop --shopify-checkout-dialog-width - Popup width in pixels. Defaults to 600.
 * @cssprop --shopify-checkout-dialog-height - Popup height in pixels. Defaults to 600.
 *
 * @example
 * ```js
 * // Opens in a new tab by default; set `target` to "popup" for a popup window.
 * const cart = await fetchCart();
 * const checkout = document.createElement("shopify-checkout");
 * checkout.setAttribute("src", cart.checkoutUrl);
 * document.body.append(checkout);
 * checkout.open();
 * ```
 *
 * @tagname shopify-checkout
 */
declare class ShopifyCheckout extends HTMLElementBase implements CheckoutAttributes, CheckoutMethods, CheckoutProperties {
  #private;
  static observedAttributes: readonly ["src", "target", "appearance", "telemetry"];
  /**
   * Registers the element and returns the class registered for `name`.
   *
   * `import "@shopify/checkout-kit/shopify-checkout"` registers `<shopify-checkout>` for you.
   * Call this when importing from `@shopify/checkout-kit`, which registers nothing, or to use
   * a custom tag name. A registry accepts each constructor only once, so every custom name gets
   * its own subclass.
   *
   * Registering a name this class (or a subclass) already owns returns that class.
   *
   * @param name - The tag name. Defaults to `shopify-checkout`.
   * @param registry - The registry to define the element in. Defaults to `customElements`.
   * @throws {Error} If another element already owns `name`.
   */
  static register<T extends typeof ShopifyCheckout>(this: T, name?: string, registry?: CustomElementRegistry): T;
  constructor();
  get src(): string;
  set src(value: string | undefined);
  /**
   * Console logging verbosity. Ordered as a threshold — `debug` is the most
   * verbose and `none` silences everything. Defaults to `'error'`.
   */
  get logLevel(): LogLevel;
  set logLevel(value: LogLevel | undefined);
  get telemetry(): boolean;
  set telemetry(value: boolean | undefined);
  get target(): CheckoutTarget | string;
  set target(value: CheckoutTarget | string | undefined);
  get appearance(): CheckoutAppearance | string;
  set appearance(value: CheckoutAppearance | string | undefined);
  /**
   * Extra origins allowed to post incoming checkout-protocol messages, on top
   * of the always-trusted cart URL origin (from `src`) and Shopify-owned
   * `shop.app` and `shop.com` domains.
   *
   * Checkout on web is closed by default: with no configured origins, only the
   * cart URL origin and Shopify-owned `shop.app` and `shop.com` domains
   * (including their subdomains) are trusted. Add
   * origins here to widen the allowlist. Entries may be exact origins
   * (`https://example.com`), wildcard subdomains (`https://*.example.com`), or
   * `"*"` to disable origin validation entirely.
   *
   * Reflected to the space/comma-separated `allowed-origins` attribute, so the
   * attribute and property can be used interchangeably.
   */
  get allowedOrigins(): string[];
  set allowedOrigins(value: string[] | string | undefined);
  /**
   * Invoked when an incoming message is dropped by origin validation. The
   * smart default logs a warning; assign a function to observe rejected
   * messages instead (for example, to report them). Beware treating rejected
   * messages as trusted — they were dropped precisely because their origin was
   * not in the allowlist.
   */
  onMessageRejected?: (detail: MessageRejectedDetail) => void;
  /**
   * The latest checkout snapshot, excluding protocol metadata.
   * Updated before start, update, and complete events are dispatched.
   *
   * @returns The current Checkout, or undefined before the first notification.
   * @example
   * checkout.addEventListener('start', (event) => {
   *   const {lineItems, totals, buyer} = event.detail.checkout;
   * });
   */
  get checkout(): Checkout | undefined;
  /**
   * The latest checkout error, with a stable recovery code and diagnostic message.
   *
   * @returns The checkout error, or undefined.
   * @example
   * checkout.addEventListener('error', (event) => {
   *   console.error(event.detail.error.code, event.detail.error.message);
   * });
   */
  get error(): CheckoutError | undefined;
  /**
   * Reveals checkout in the target.
   */
  open(): void;
  close(): void;
  override focus(): void;
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: (typeof ShopifyCheckout.observedAttributes)[number], oldValue: string | null, newValue: string | null): void;
  override addEventListener<K extends keyof ShopifyCheckoutEventMap>(type: K, listener: TypedEventListener<ShopifyCheckoutEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: TypedEventListener<HTMLElementEventMap[K]> | null, options?: boolean | AddEventListenerOptions): void;
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}
export { ShopifyCheckoutEventMap as n, ShopifyCheckout as t };
