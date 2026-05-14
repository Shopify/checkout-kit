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

import { createTemplate, html } from "./utils";
import type {
  CheckoutAttributes,
  CheckoutMethods,
  CheckoutProperties,
  CheckoutProtocolMessageMap,
  CheckoutTarget,
  TypedEventListener,
  CheckoutProtocolMessageData,
  Checkout,
  UcpErrorResponse,
} from "./checkout.types";
import { STYLES } from "./checkout.styles";

export const DEFAULT_POPUP_WIDTH = 600;
export const DEFAULT_POPUP_HEIGHT = 600;
export const EMBED_PROTOCOL_VERSION = "2026-04-08";
const EMBED_DELEGATIONS: readonly string[] = ["window.open"];

const SHADOW_TEMPLATE = createTemplate(html`
  <div id="shopify-element-wrapper">
    <style>
      ${STYLES}
    </style>

    <div class="Shopify-target">
      <dialog class="overlay" id="overlay">
        <div class="overlay-background" part="overlay" id="overlay-background">
          <slot name="overlay">
            <div class="overlay-content-wrapper">
              <div class="overlay-content">
                Continue your purchase in the <br />
                <a target="_blank" rel="noopener noreferrer" id="overlay-link"> checkout window</a>
              </div>
              <button class="overlay-close-button" id="overlay-close-button">
                Close
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path
                    d="M15.1 2.3L13.7.9 8 6.6 2.3.9.9 2.3 6.6 8 .9 13.7l1.4 1.4L8 9.4l5.7 5.7 1.4-1.4L9.4 8"
                  />
                </svg>
              </button>
            </div>
          </slot>
        </div>
      </dialog>
    </div>
  </div>
`);

/**
 * An element that renders a Shopify Checkout. Checkout opens in a popup or browser tab/window
 * (see `target`). To use, create a `shopify-checkout` element, set the `src` attribute to the
 * checkout URL (typically retrieved from the `cart.checkoutUrl` field), and then call `open()`.
 *
 * @attribute src - The URL of the checkout to load.
 * @attribute preload - Whether to preload critical assets and data
 * @attribute target - Where the checkout is presented (auto, popup, new tab, or a named window).
 *
 * @event ec:start - Dispatched when the checkout has started
 * @event ec:complete - Dispatched when the checkout was successfully completed
 * @event ec:error - Dispatched on a session-level fatal error
 * @event ec:lineItemsChange - Dispatched when cart line items change
 * @event ec:buyerChange - Dispatched when buyer information changes
 * @event ec:totalsChange - Dispatched when totals change
 * @event ec:messagesChange - Dispatched when checkout messages change
 * @event checkout:close - Dispatched when the checkout overlay is closed (synthetic, not part of ECP)
 *
 * @example
 * ```js
 * // Popup target (default)
 * const cart = await fetchCart();
 * const checkout = document.createElement("shopify-checkout");
 * checkout.setAttribute("src", cart.checkoutUrl);
 * document.body.append(checkout);
 * checkout.open();
 * ```
 */
export class ShopifyCheckout
  extends HTMLElement
  implements CheckoutAttributes, CheckoutMethods, CheckoutProperties
{
  static observedAttributes = ["preload", "src", "target"] as const;

  constructor() {
    super();

    this.attachShadow({ mode: "open" }).appendChild(SHADOW_TEMPLATE.content.cloneNode(true));
  }

  #checkout?: Checkout;
  #error?: UcpErrorResponse;

  #checkoutWindow: WindowProxy | null = null;

  // Manages the listeners for the popup window, new tabs, and scrim dialog
  #currentOpen: { controller: AbortController } | null = null;
  // Manages the global message event listener for checkout protocol communication
  #checkoutProtocolController: { controller: AbortController } | null = null;

  /* ------------------------------------------------------------
   * Read/write properties (reflected with attributes)
   * ------------------------------------------------------------
   */

  get src(): string {
    return this.getAttribute("src") ?? "";
  }

  set src(value: string | undefined) {
    this.#setAttribute("src", value);
    // see also attributeChangedCallback
  }

  /**
   * Parses `src` as a URL, validates the scheme, and appends the `ec_*`
   * query parameters used for embedded checkout protocol negotiation.
   * Returns `undefined` if `src` is unset, malformed, or uses a non-
   * `https:` scheme.
   */
  #srcAsURL() {
    let url: URL;
    try {
      url = new URL(this.src);
    } catch {
      return undefined;
    }
    if (url.protocol !== "https:") return undefined;

    // Drop ec_auth if present on src (e.g. prepared checkout URLs); this build
    // does not support passing auth via query string.
    url.searchParams.delete("ec_auth");

    url.searchParams.set("ec_version", EMBED_PROTOCOL_VERSION);
    if (EMBED_DELEGATIONS.length > 0) {
      url.searchParams.set("ec_delegate", EMBED_DELEGATIONS.join(","));
    }
    return url;
  }

  /**
   * The origin we expect to receive postMessage events from. This is the
   * origin of `src` after URL parsing and scheme validation. Returns
   * `undefined` if `src` is unset or invalid, in which case all inbound
   * messages are dropped.
   */
  #expectedOrigin(): string | undefined {
    return this.#srcAsURL()?.origin;
  }

  get preload() {
    return this.getAttribute("preload") !== null;
  }

  set preload(value: boolean | string | undefined) {
    this.#setAttribute("preload", value);
    // see also attributeChangedCallback
  }

  /**
   * Whether the component should log diagnostic messages to the console.
   */
  get debug(): boolean {
    return this.getAttribute("debug") !== null;
  }

  set debug(value: boolean | string | undefined) {
    this.#setAttribute("debug", value);
  }

  /**
   * Logs a warning to the console only when `debug` is enabled. Use this
   * for messages that are useful while integrating but noise once a
   * partner has shipped (e.g., dropped messages, invalid `src`).
   */
  #debugWarn(message: string, ...args: unknown[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.warn(`<shopify-checkout>: ${message}`, ...args);
    }
  }

  get target(): CheckoutTarget | string {
    return this.getAttribute("target") ?? "auto";
  }

  set target(value: CheckoutTarget | string | undefined) {
    this.#setAttribute("target", value);
  }

  #setAttribute(name: string, value: string | boolean | undefined) {
    if (value === true) {
      this.setAttribute(name, "");
    } else if (value != null && value !== false) {
      this.setAttribute(name, value);
    } else {
      this.removeAttribute(name);
    }
  }

  /* ------------------------------------------------------------
   * Read-only properties (populated by checkout protocol events)
   * ------------------------------------------------------------
   */

  /**
   * The latest UCP `Checkout` object received from the embedded checkout.
   * Populated and updated whenever a notification carrying a `checkout` field
   * is received (e.g., `ec.start`, `ec.complete`, every `ec.*.change`).
   *
   * @returns The current Checkout, or undefined before the first notification.
   * @example
   * checkout.addEventListener('ec:start', () => {
   *   const {line_items, totals, buyer} = checkout.checkout;
   * });
   */
  get checkout(): Checkout | undefined {
    return this.#checkout;
  }

  /**
   * Session-level fatal error received via `ec.error`.
   *
   * @returns The UCP error response, or undefined.
   * @example
   * checkout.addEventListener('ec:error', () => {
   *   const {messages} = checkout.error;
   *   console.error(messages[0]?.code, messages[0]?.content);
   * });
   */
  get error(): UcpErrorResponse | undefined {
    return this.#error;
  }

  get #dialogElement(): HTMLDialogElement | undefined {
    return this.shadowRoot?.querySelector("#overlay") ?? undefined;
  }

  get #dialogBackgroundElement(): HTMLDivElement | undefined {
    return this.shadowRoot?.querySelector("#overlay-background") ?? undefined;
  }

  get #dialogCloseButtonElement(): HTMLButtonElement | undefined {
    return this.shadowRoot?.querySelector("#overlay-close-button") ?? undefined;
  }

  get #dialogLinkElement(): HTMLAnchorElement | undefined {
    return this.shadowRoot?.querySelector("#overlay-link") ?? undefined;
  }

  get #targetElement(): HTMLDivElement | undefined {
    return this.shadowRoot?.querySelector(".Shopify-target") ?? undefined;
  }

  /* ------------------------------------------------------------
   * Methods
   * ------------------------------------------------------------
   */

  /**
   * Reveals checkout in the target.
   */
  open(): void {
    const { target } = this;
    const src = this.#srcAsURL()?.href;

    if (!src) {
      // eslint-disable-next-line no-console
      console.warn("`<shopify-checkout>`: src property is empty or invalid, cannot open checkout");
      return;
    }

    // Close any existing sessions before opening a new one
    if (this.#currentOpen) {
      this.close();
    }

    let checkoutWindow: WindowProxy | null = null;

    switch (target) {
      case "popup": {
        const features = this.#getPopupFeatures();
        checkoutWindow = window.open(src, "", features);
        break;
      }

      case "auto":
      default: {
        checkoutWindow = window.open(src, target);
        break;
      }
    }

    const abortController = new AbortController();

    //  Opens a dialog element to act as a scrim over the current window while the popup is open.
    //  The dialog can be closed by the user, or will close itself when the popup is closed.
    const dialog = this.#dialogElement;
    const dialogBackground = this.#dialogBackgroundElement;
    const dialogCloseButton = this.#dialogCloseButtonElement;
    const dialogLink = this.#dialogLinkElement;

    if (dialog && dialogBackground) {
      // By default we show the scrim.
      // If a consumer wants to hide it, they can either:
      // 1. Set `display: none` on the `<shopify-checkout>` element itself
      // 2. Set `display: none` on the overlay using CSS parts, e.g.,
      // ```
      //   shopify-checkout::part(overlay) {
      //     display: none;
      //   }
      // ```
      // It's important not to call `dialog.showModal()` if the dialog is not visible because it traps focus and
      // hides the rest of the page from the accessibility tree.
      const isElementHidden = window.getComputedStyle(this).getPropertyValue("display") === "none";
      const isOverlayHidden =
        window.getComputedStyle(dialogBackground).getPropertyValue("display") === "none";
      const showDialog = !isElementHidden && !isOverlayHidden;

      if (showDialog) {
        dialog.showModal();

        dialogCloseButton?.addEventListener(
          "click",
          () => {
            dialog.close();
          },
          {
            signal: abortController.signal,
          },
        );

        dialog.addEventListener(
          "close",
          () => {
            abortController.abort();
          },
          {
            signal: abortController.signal,
          },
        );

        dialogLink?.addEventListener(
          "click",
          (event: MouseEvent) => {
            event.preventDefault();
            this.#checkoutWindow?.focus();
          },
          {
            signal: abortController.signal,
          },
        );

        abortController.signal.addEventListener("abort", () => {
          dialog.close();
        });
      }
    }

    abortController.signal.addEventListener("abort", () => {
      checkoutWindow?.close();
      this.#checkoutWindow = null;
      this.#currentOpen = null;
      this.dispatchEvent(new ShopifyCheckoutCloseEvent());
    });

    // Handles cases where the user closed the window and returned to the page.
    window.addEventListener(
      "focus",
      () => {
        // Small delay to allow browser to update the closed property
        setTimeout(() => {
          if (checkoutWindow?.closed) {
            this.#currentOpen?.controller.abort();
          }
        }, 50);
      },
      {
        signal: abortController.signal,
      },
    );

    this.#currentOpen = { controller: abortController };
    this.#checkoutWindow = checkoutWindow;
  }

  close(): void {
    if (this.#currentOpen) {
      this.#currentOpen.controller.abort();
    }
  }

  override focus(): void {
    this.#checkoutWindow?.focus();
  }

  /**
   * Sets the overlay link href to the validated, parametrised checkout
   * URL (matching what the popup would open)
   */
  #updateOverlayLink() {
    const link = this.#dialogLinkElement;
    if (!link) return;
    const url = this.#srcAsURL();
    if (url) {
      link.setAttribute("href", url.href);
    } else {
      link.removeAttribute("href");
    }
  }

  /**
   * Adds the `Shopify-target--<target>` modifier class to the rendered
   * target element
   */
  #applyTargetClass() {
    const value = this.target;
    if (!value || /\s/.test(value)) return;
    this.#targetElement?.classList.add(`Shopify-target--${value}`);
  }

  /** Mirror of `#applyTargetClass` for removing a previous modifier. */
  #removeTargetClass(value: string | null) {
    if (!value || /\s/.test(value)) return;
    this.#targetElement?.classList.remove(`Shopify-target--${value}`);
  }

  #updatePreloadLink() {
    const existingLink = this.shadowRoot?.querySelector("#checkout-preload-link") as
      | HTMLLinkElement
      | undefined;

    if (!this.preload || !this.src) {
      existingLink?.remove();
      return;
    }

    const newSrc = this.src;
    if (existingLink) {
      existingLink.href = newSrc;
      existingLink.rel = "preload";
      existingLink.as = "document";
    } else {
      const linkEl = document.createElement("link");
      linkEl.rel = "preload";
      linkEl.href = newSrc;
      linkEl.as = "document";
      linkEl.id = "checkout-preload-link";
      this.shadowRoot?.appendChild(linkEl);
    }
  }

  #getPopupFeatures() {
    const computedStyle = window.getComputedStyle(this);
    const widthFromCustomProperty = computedStyle.getPropertyValue(
      "--shopify-checkout-dialog-width",
    );
    const desiredWidth = widthFromCustomProperty
      ? Number.parseInt(widthFromCustomProperty, 10)
      : DEFAULT_POPUP_WIDTH;
    const screenLeft = window.screenLeft ?? window.screenX;
    const windowWidth = window.outerWidth ?? document.documentElement.clientWidth ?? screen.width;
    const maxWidth = Math.floor(windowWidth * 0.9);
    const width = Math.min(desiredWidth, maxWidth);

    const heightFromCustomProperty = computedStyle.getPropertyValue(
      "--shopify-checkout-dialog-height",
    );
    const desiredHeight = heightFromCustomProperty
      ? Number.parseInt(heightFromCustomProperty, 10)
      : DEFAULT_POPUP_HEIGHT;

    const screenTop = window.screenTop ?? window.screenY;
    const windowHeight =
      window.outerHeight ?? document.documentElement.clientHeight ?? screen.height;
    const maxHeight = Math.floor(windowHeight * 0.9);
    const height = Math.min(desiredHeight, maxHeight);

    const left = Math.floor((windowWidth - width) / 2) + screenLeft;
    const top = Math.floor((windowHeight - height) / 2) + screenTop;

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      `scrollbars=yes`,
      `status=no`,
      `toolbar=no`,
      `resizable=yes`,
    ].join(",");

    return features;
  }

  /* ------------------------------------------------------------
   * Events
   * ------------------------------------------------------------
   */

  /**
   * JSON-RPC request messages carry an `id`; notifications do not.
   */
  #isRespondableRequest(
    message: CheckoutProtocolMessage,
  ): message is CheckoutProtocolMessage & { id: string } {
    return message.id != null;
  }

  #initCheckoutProtocol() {
    // Clean up any existing checkout protocol controller to prevent memory leaks
    // Necessary because connectedCallback() can be called multiple times
    // if the element is moved within the DOM, but disconnectedCallback() is not called
    // during DOM moves, leading to potentially accumulated event listeners.
    this.#checkoutProtocolController?.controller.abort();

    this.#checkoutProtocolController = { controller: new AbortController() };
    window.addEventListener("message", this.#handleMessage, {
      signal: this.#checkoutProtocolController.controller.signal,
    });
  }

  #handleMessage = (event: MessageEvent) => {
    // Source check: messages must come from the embedded checkout window
    // we opened. Unrelated postMessage traffic on the host page (other
    // SDKs, browser extensions, etc.) is dropped silently.
    if (event.source !== this.#checkoutWindow) return;

    const expected = this.#expectedOrigin();
    if (!expected || event.origin !== expected) {
      this.#debugWarn(
        `Dropped message from unexpected origin "${event.origin}" (expected "${expected ?? "none — src is invalid or unset"}")`,
      );
      return;
    }

    const message = CheckoutProtocolMessage.parse(event);
    if (!message) return;

    // @see https://ucp.dev/2026-04-08/specification/embedded-checkout/

    // Every notification that carries a checkout payload updates the cached value.
    if (message.body != null && typeof message.body === "object" && "checkout" in message.body) {
      this.#checkout = (message.body as { checkout: Checkout }).checkout;
    }

    switch (message.name) {
      case "ec.ready": {
        if (this.#isRespondableRequest(message) && message.source) {
          (message.source as WindowProxy).postMessage(
            { jsonrpc: "2.0" as const, id: message.id, result: {} },
            message.origin,
          );
        }
        break;
      }
      case "ec.start": {
        this.dispatchEvent(new ShopifyEcStartEvent());
        break;
      }
      case "ec.complete": {
        this.dispatchEvent(new ShopifyEcCompleteEvent());
        break;
      }
      case "ec.error": {
        this.#error = message.body as CheckoutProtocolMessageMap["ec.error"];
        this.dispatchEvent(new ShopifyEcErrorEvent());
        break;
      }
      case "ec.line_items.change": {
        this.dispatchEvent(new ShopifyEcLineItemsChangeEvent());
        break;
      }
      case "ec.buyer.change": {
        this.dispatchEvent(new ShopifyEcBuyerChangeEvent());
        break;
      }
      case "ec.totals.change": {
        this.dispatchEvent(new ShopifyEcTotalsChangeEvent());
        break;
      }
      case "ec.messages.change": {
        this.dispatchEvent(new ShopifyEcMessagesChangeEvent());
        break;
      }
      case "ec.window.open_request": {
        if (!this.#isRespondableRequest(message)) break;
        const body = message.body as
          | CheckoutProtocolMessageMap["ec.window.open_request"]
          | undefined;
        if (!body || typeof body.url !== "string") {
          // eslint-disable-next-line no-console
          console.warn(
            "<shopify-checkout>: ec.window.open_request received without a valid url",
            message,
          );
          message.source?.postMessage(
            {
              jsonrpc: "2.0" as const,
              id: message.id,
              error: {
                code: -32602,
                message: "Invalid params: expected {url: string}",
              },
            },
            { targetOrigin: message.origin },
          );
          break;
        }
        window.open(body.url, "_blank", "noopener");
        message.source?.postMessage(
          { jsonrpc: "2.0" as const, id: message.id, result: {} },
          { targetOrigin: message.origin },
        );
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn(
          `<shopify-checkout>: Unknown checkout protocol message received: ${message.name}`,
          message,
        );
        break;
      }
    }
  };

  /* ------------------------------------------------------------
   * Lifecycle
   * ------------------------------------------------------------
   */

  connectedCallback(): void {
    this.#applyTargetClass();
    this.#updateOverlayLink();

    this.#initCheckoutProtocol();
  }

  disconnectedCallback(): void {
    this.#checkoutProtocolController?.controller.abort();
    this.#checkoutProtocolController = null;
    this.close();
  }

  attributeChangedCallback(
    name: (typeof ShopifyCheckout.observedAttributes)[number],
    oldValue: string,
    newValue: string,
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case "preload":
        this.#updatePreloadLink();
        break;
      case "src":
        this.#updatePreloadLink();
        this.#updateOverlayLink();
        break;
      case "target": {
        if (oldValue !== newValue && this.#currentOpen) {
          this.close();
        }

        this.#removeTargetClass(oldValue);
        this.#applyTargetClass();

        break;
      }
    }
  }

  /* ------------------------------------------------------------
   * Custom Events
   * ------------------------------------------------------------
   */
  // we overload these so that the consumer of the component can autocomplete the correct events
  override addEventListener(
    type: "ec:start",
    listener: TypedEventListener<ShopifyEcStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:close",
    listener: TypedEventListener<ShopifyCheckoutCloseEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:complete",
    listener: TypedEventListener<ShopifyEcCompleteEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:error",
    listener: TypedEventListener<ShopifyEcErrorEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:lineItemsChange",
    listener: TypedEventListener<ShopifyEcLineItemsChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:buyerChange",
    listener: TypedEventListener<ShopifyEcBuyerChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:totalsChange",
    listener: TypedEventListener<ShopifyEcTotalsChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec:messagesChange",
    listener: TypedEventListener<ShopifyEcMessagesChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (listener === null) return;
    super.addEventListener(type, listener, options);
  }
}

// An abstract class here lets us force the type of the target and currentTarget properties,
// without introducing a real class in the prototype chain.
abstract class ShopifyCheckoutEvent extends Event {
  // Convenience getter for accessing the checkout related to this event
  get checkout() {
    return this.target as ShopifyCheckout;
  }
}

export class ShopifyEcStartEvent extends ShopifyCheckoutEvent {
  declare type: "ec:start";

  constructor() {
    super("ec:start", { bubbles: true });
  }
}

export class ShopifyEcCompleteEvent extends ShopifyCheckoutEvent {
  declare type: "ec:complete";

  constructor() {
    super("ec:complete", { bubbles: true });
  }
}

export class ShopifyCheckoutCloseEvent extends ShopifyCheckoutEvent {
  declare type: "checkout:close";

  constructor() {
    super("checkout:close", { bubbles: true });
  }
}

export class ShopifyEcErrorEvent extends ShopifyCheckoutEvent {
  declare type: "ec:error";

  constructor() {
    super("ec:error", { bubbles: true });
  }
}

export class ShopifyEcLineItemsChangeEvent extends ShopifyCheckoutEvent {
  declare type: "ec:lineItemsChange";

  constructor() {
    super("ec:lineItemsChange", { bubbles: true });
  }
}

export class ShopifyEcBuyerChangeEvent extends ShopifyCheckoutEvent {
  declare type: "ec:buyerChange";

  constructor() {
    super("ec:buyerChange", { bubbles: true });
  }
}

export class ShopifyEcTotalsChangeEvent extends ShopifyCheckoutEvent {
  declare type: "ec:totalsChange";

  constructor() {
    super("ec:totalsChange", { bubbles: true });
  }
}

export class ShopifyEcMessagesChangeEvent extends ShopifyCheckoutEvent {
  declare type: "ec:messagesChange";

  constructor() {
    super("ec:messagesChange", { bubbles: true });
  }
}

/* ------------------------------------------------------------
 * Checkout protocol
 * ------------------------------------------------------------
 */
const CHECKOUT_PROTOCOL_MESSAGES: (keyof CheckoutProtocolMessageMap)[] = [
  "ec.ready",
  "ec.start",
  "ec.complete",
  "ec.error",
  "ec.line_items.change",
  "ec.buyer.change",
  "ec.totals.change",
  "ec.messages.change",
  "ec.window.open_request",
];

class CheckoutProtocolMessage<
  MessageType extends keyof CheckoutProtocolMessageMap = keyof CheckoutProtocolMessageMap,
> {
  static parse(event: MessageEvent): CheckoutProtocolMessage | undefined {
    const { data, source, origin } = event;
    if (!isCheckoutProtocolMessage(data)) return;
    return new CheckoutProtocolMessage(data, { source, origin });
  }

  readonly protocol: { readonly version: string };
  readonly name: MessageType;
  readonly body: CheckoutProtocolMessageMap[MessageType];
  /** The JSON-RPC message ID (undefined for notifications) */
  readonly id?: string;
  /** The source window to post responses to */
  readonly source: MessageEventSource | null;
  /** The origin to use when posting responses */
  readonly origin: string;

  constructor(
    { method, params, id }: CheckoutProtocolMessageData<MessageType> & { id?: string },
    { source, origin }: { source: MessageEventSource | null; origin: string },
  ) {
    this.protocol = { version: "2026-04-08" };
    this.name = method;
    this.body = params as CheckoutProtocolMessageMap[MessageType];
    this.id = id;
    this.source = source;
    this.origin = origin;
  }
}

function isCheckoutProtocolMessage(data: unknown): data is CheckoutProtocolMessageData {
  return (
    data != null &&
    typeof data === "object" &&
    "jsonrpc" in data &&
    data.jsonrpc === "2.0" &&
    "method" in data &&
    CHECKOUT_PROTOCOL_MESSAGES.includes(data.method as keyof CheckoutProtocolMessageMap)
  );
}
