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

import { ShopifyElement, html } from "./utils";
import type {
  CheckoutAttributes,
  CheckoutMethods,
  CheckoutProperties,
  CheckoutProtocolMessageMap,
  CheckoutTarget,
  ColorScheme,
  TypedEventListener,
  CheckoutProtocolMessageData,
  Cart,
  CheckoutAddressChangeStartResponsePayload,
  CheckoutPaymentMethodChangeStartResponsePayload,
  CheckoutSubmitStartResponsePayload,
} from "./checkout.types";
import { STYLES } from "./checkout.styles";

export const DEFAULT_POPUP_WIDTH = 600;
export const DEFAULT_POPUP_HEIGHT = 600;
export const EMBED_URL_PARAMS =
  "protocol=2025-10,library=checkout-web-component,platform=web,branding=shop,colorscheme=auto";

/**
 * An element that renders a Shopify Checkout. Checkout can be displayed either as a popup window (default)
 * or embedded as an iframe by setting the `mode` attribute. To use, create a `shopify-checkout` element,
 * set the `src` attribute to the checkout URL (typically retrieved from the `cart.checkoutUrl` field),
 * and then call `open()`.
 *
 * @attribute src - The URL of the checkout to load.
 * @attribute auth - JWT authentication token for third-party embedders
 * @attribute preload - Whether to preload critical assets and data
 * @attribute target - Where the checkout is presented (auto, popup, new tab, or inline).
 * @attribute color-scheme - The color scheme for the checkout interface
 *
 * @event checkout:start - Dispatched when the checkout has started
 * @event checkout:complete - Dispatched when the checkout was successfully completed
 * @event checkout:close - Dispatched when the checkout is closed
 * @event checkout:error - Dispatched when an error occurs
 * @event checkout:addressChangeStart - Dispatched when address change starts (inline only)
 * @event checkout:paymentMethodChangeStart - Dispatched when payment change starts (inline only, not yet implemented)
 * @event checkout:submitStart - Dispatched on checkout completion attempt (inline only, not yet implemented)
 *
 * @example
 * ```js
 * // Popup target (default)
 * const cart = await fetchCart();
 * const checkout = document.createElement("shopify-checkout");
 * checkout.setAttribute("src", cart.checkoutUrl);
 * document.body.append(checkout);
 * checkout.open();
 *
 * // Inline target
 * const checkout = document.createElement("shopify-checkout");
 * checkout.setAttribute("src", cart.checkoutUrl);
 * checkout.setAttribute("target", "inline");
 * document.body.append(checkout);
 * ```
 */
export class ShopifyCheckout
  extends ShopifyElement
  implements CheckoutAttributes, CheckoutMethods, CheckoutProperties
{
  static observedAttributes = ["auth", "color-scheme", "preload", "src", "target"] as const;

  // Stores the locale from the checkout:start event. Undefined until checkout starts.
  #locale?: string;
  #cart?: Cart;
  #orderConfirmation?: CheckoutProtocolMessageMap["checkout.complete"]["orderConfirmation"];
  #error?: CheckoutProtocolMessageMap["checkout.error"];
  #sessionId?: string;

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

  #srcAsURL(): URL | undefined {
    try {
      const { auth, colorScheme, target } = this;
      const url = new URL(this.src);
      let embedParams = EMBED_URL_PARAMS;
      if (auth) {
        embedParams += `,authentication=${auth}`;
      }
      if (colorScheme && colorScheme !== "auto") {
        embedParams = embedParams.replace("colorscheme=auto", `colorscheme=${colorScheme}`);
      }
      if (target && target === "inline") {
        embedParams = embedParams.replace("branding=shop", "branding=app");
      }
      url.searchParams.set("embed", embedParams);
      return url;
    } catch {
      return undefined;
    }
  }

  get auth(): string {
    return this.getAttribute("auth") ?? "";
  }

  set auth(value: string | undefined) {
    this.#setAttribute("auth", value);
    // see also attributeChangedCallback
  }

  get colorScheme(): ColorScheme {
    return (this.getAttribute("color-scheme") ?? "auto") as ColorScheme;
  }

  set colorScheme(value: ColorScheme | undefined) {
    this.#setAttribute("color-scheme", value);
    // see also attributeChangedCallback
  }

  get preload() {
    return this.getAttribute("preload") !== null;
  }

  set preload(value: boolean | string | undefined) {
    this.#setAttribute("preload", value);
    // see also attributeChangedCallback
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
   * Order confirmation details from a completed checkout.
   * Populated after the checkout:complete event is dispatched.
   *
   * @returns Order confirmation with order ID, confirmation URL, order number, and first order status, or undefined
   * @example
   * checkout.addEventListener('checkout:complete', () => {
   *   const {order, url, number, isFirstOrder} = checkout.orderConfirmation;
   *   console.log(`Order ${number} created with ID: ${order.id}`);
   *   console.log(`Redirect to: ${url}`);
   * });
   */
  get orderConfirmation():
    | CheckoutProtocolMessageMap["checkout.complete"]["orderConfirmation"]
    | undefined {
    return this.#orderConfirmation;
  }

  /**
   * The locale of the checkout session. Populated after the checkout:start event.
   * Returns undefined until the checkout session has started.
   *
   * @example
   * const checkout = document.querySelector('shopify-checkout');
   * console.log(checkout.locale); // undefined
   *
   * checkout.addEventListener('checkout:start', () => {
   *   console.log(checkout.locale); // "fr-CA"
   * });
   */
  get locale() {
    return this.#locale;
  }

  /**
   * The cart associated with the checkout session.
   * Populated after the checkout:start event and updated after checkout:complete.
   *
   * @returns Cart with lines, costs, buyer identity, delivery info, and discounts, or undefined
   * @example
   * checkout.addEventListener('checkout:start', () => {
   *   const {lines, cost, buyerIdentity} = checkout.cart;
   *   console.log(`Cart total: ${cost.totalAmount.amount} ${cost.totalAmount.currencyCode}`);
   *   console.log(`Items: ${lines.length}`);
   * });
   */
  get cart() {
    return this.#cart;
  }

  /**
   * Error details when checkout encounters an error.
   * Populated after the checkout:error event is dispatched.
   *
   * @returns Error with code and message, or undefined
   * @example
   * checkout.addEventListener('checkout:error', () => {
   *   const {code, message} = checkout.error;
   *   console.error(`Checkout error (${code}): ${message}`);
   * });
   */
  get error(): CheckoutProtocolMessageMap["checkout.error"] | undefined {
    return this.#error;
  }

  /**
   * The checkout session ID for authenticated checkouts.
   * Populated after the checkout:submitStart event is dispatched.
   *
   * @returns The checkout session ID, or undefined
   */
  get sessionId() {
    return this.#sessionId;
  }

  get #iframeElement(): HTMLIFrameElement | undefined {
    return this.shadowRoot?.querySelector("#checkout-iframe") ?? undefined;
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
  open() {
    const { target } = this;
    const src = this.#srcAsURL()?.href;

    // Inline targets render an iframe directly in the DOM when the element connects or target changes,
    // so no explicit open() call is needed. The close() method also has no effect on
    // inline targets since iframes don't respond to iframe.contentWindow.close().
    if (target === "inline") return;

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

  close() {
    if (this.#currentOpen) {
      this.#currentOpen.controller.abort();
    }
  }

  override focus() {
    this.#checkoutWindow?.focus();
  }

  #updateIframeSrc() {
    const src = this.#srcAsURL()?.href;
    const iframeElement = this.#iframeElement;

    if (src && iframeElement && iframeElement.src !== src) {
      iframeElement.src = src;
    }
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

  #addIframe() {
    const iframeEl = document.createElement("iframe");
    iframeEl.id = "checkout-iframe";
    iframeEl.title = "Checkout";
    iframeEl.setAttribute(
      "allow",
      "publickey-credentials-get https://pay.shopify.com https://shop.app; geolocation",
    );
    iframeEl.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
    iframeEl.src = this.#srcAsURL()?.href ?? "";

    this.#targetElement?.appendChild(iframeEl);
    this.#checkoutWindow = iframeEl.contentWindow ?? null;
  }

  /* ------------------------------------------------------------
   * Events
   * ------------------------------------------------------------
   */

  /**
   * Determines if a protocol message should dispatch a respondable event.
   * Only inline targets can respond to messages, and the message must have
   * an ID (requests) rather than being a notification.
   */
  #isRespondableRequest(
    message: CheckoutProtocolMessage,
  ): message is CheckoutProtocolMessage & { id: string } {
    return this.target === "inline" && message.id != null;
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
    // In tests, we don’t have a great way to simulate a message from a particular window, so we
    // just allow messages from any source.
    if (event.source !== this.#checkoutWindow && process.env.NODE_ENV !== "test") {
      return;
    }

    const message = CheckoutProtocolMessage.parse(event);
    if (!message) return;

    // @see https://github.com/Shopify/core-rfcs/blob/main/rfc/checkout/20250128-embedded-checkout-protocol.md#event-system

    if ("cart" in message.body) {
      this.#cart = message.body.cart as Cart;
    }

    switch (message.name) {
      case "checkout.start": {
        const { locale } = message.body as CheckoutProtocolMessageMap["checkout.start"];
        this.#locale = locale;
        // TODO: Extract checkoutSessionId from payload once available for authenticated checkouts
        this.dispatchEvent(new ShopifyCheckoutStartEvent());
        break;
      }
      case "checkout.complete": {
        const { orderConfirmation } =
          message.body as CheckoutProtocolMessageMap["checkout.complete"];
        this.#orderConfirmation = orderConfirmation;
        this.dispatchEvent(new ShopifyCheckoutCompleteEvent());
        break;
      }
      case "checkout.error": {
        const { code, message: errorMessage } =
          message.body as CheckoutProtocolMessageMap["checkout.error"];
        this.#error = { code, message: errorMessage };
        this.dispatchEvent(new ShopifyCheckoutErrorEvent());
        break;
      }
      case "checkout.addressChangeStart": {
        if (this.#isRespondableRequest(message)) {
          this.dispatchEvent(
            new ShopifyCheckoutAddressChangeStartEvent({
              id: message.id,
              source: message.source,
              origin: message.origin,
            }),
          );
        }
        break;
      }
      case "checkout.paymentMethodChangeStart": {
        if (this.#isRespondableRequest(message)) {
          this.dispatchEvent(
            new ShopifyCheckoutPaymentMethodChangeStartEvent({
              id: message.id,
              source: message.source,
              origin: message.origin,
            }),
          );
        }
        break;
      }
      case "checkout.submitStart": {
        if (this.#isRespondableRequest(message)) {
          const { sessionId } = message.body as CheckoutProtocolMessageMap["checkout.submitStart"];
          this.#sessionId = sessionId;
          this.dispatchEvent(
            new ShopifyCheckoutSubmitStartEvent({
              id: message.id,
              source: message.source,
              origin: message.origin,
            }),
          );
        }
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

  override connectedCallback() {
    super.connectedCallback();

    this.render(html`
      <style>
        ${STYLES}
      </style>

      <div class="Shopify-target Shopify-target--${this.target}">
        <dialog class="overlay" id="overlay">
          <div class="overlay-background" part="overlay" id="overlay-background">
            <slot name="overlay">
              <div class="overlay-content-wrapper">
                <div class="overlay-content">
                  Continue your purchase in the <br />
                  <a href="${this.src}" target="_blank" id="overlay-link"> checkout window</a>
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
    `);

    if (this.target === "inline") {
      this.#addIframe();
    }

    this.#initCheckoutProtocol();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#checkoutProtocolController?.controller.abort();
    this.#checkoutProtocolController = null;
    this.close();
  }

  attributeChangedCallback(
    name: (typeof ShopifyCheckout.observedAttributes)[number],
    oldValue: string,
    newValue: string,
  ) {
    if (oldValue === newValue) return;

    switch (name) {
      case "auth":
      case "color-scheme":
        this.#updateIframeSrc();
        break;
      case "preload":
        this.#updatePreloadLink();
        break;
      case "src":
        this.#updateIframeSrc();
        this.#updatePreloadLink();
        break;
      case "target": {
        if (oldValue === "inline" && newValue !== "inline") {
          this.#iframeElement?.remove();
          this.#checkoutWindow = null;
        } else if (newValue === "inline") {
          this.#addIframe();
        }

        if (oldValue !== newValue && this.#currentOpen) {
          this.close();
        }

        this.#targetElement?.classList.remove(`Shopify-target--${oldValue}`);
        this.#targetElement?.classList.add(`Shopify-target--${newValue}`);

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
    type: "checkout:start",
    listener: TypedEventListener<ShopifyCheckoutStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:close",
    listener: TypedEventListener<ShopifyCheckoutCloseEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:complete",
    listener: TypedEventListener<ShopifyCheckoutCompleteEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:error",
    listener: TypedEventListener<ShopifyCheckoutErrorEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:addressChangeStart",
    listener: TypedEventListener<ShopifyCheckoutAddressChangeStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:paymentMethodChangeStart",
    listener: TypedEventListener<ShopifyCheckoutPaymentMethodChangeStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "checkout:submitStart",
    listener: TypedEventListener<ShopifyCheckoutSubmitStartEvent> | null,
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

export class ShopifyCheckoutStartEvent extends ShopifyCheckoutEvent {
  declare type: "checkout:start";

  constructor() {
    super("checkout:start", { bubbles: true });
  }
}

export class ShopifyCheckoutCompleteEvent extends ShopifyCheckoutEvent {
  declare type: "checkout:complete";

  constructor() {
    super("checkout:complete", { bubbles: true });
  }
}

export class ShopifyCheckoutCloseEvent extends ShopifyCheckoutEvent {
  declare type: "checkout:close";

  constructor() {
    super("checkout:close", { bubbles: true });
  }
}

export class ShopifyCheckoutErrorEvent extends ShopifyCheckoutEvent {
  declare type: "checkout:error";

  constructor() {
    super("checkout:error", { bubbles: true });
  }
}

/* ------------------------------------------------------------
 * Respondable Events (bidirectional communication)
 * ------------------------------------------------------------
 */

/**
 * Custom error class for checkout respondWith() errors.
 */
class CheckoutRespondWithError extends Error {
  override name = "CheckoutRespondWithError";
}

/**
 * Base class for events that support bidirectional communication via respondWith().
 * Follows the pattern established by FetchEvent.respondWith() in the web platform.
 */
abstract class ShopifyCheckoutRespondableEvent<ResponsePayload> extends ShopifyCheckoutEvent {
  readonly #id: string;
  readonly #source: MessageEventSource | null;
  readonly #origin: string;
  #responded = false;

  constructor(
    type: string,
    {
      id,
      source,
      origin,
    }: {
      id: string;
      source: MessageEventSource | null;
      origin: string;
    },
  ) {
    super(type, { bubbles: true });
    this.#id = id;
    this.#source = source;
    this.#origin = origin;
  }

  /**
   * Responds to the checkout event with a response payload.
   * The SDK will automatically wrap the payload in a JSON-RPC 2.0 response envelope
   * and send it back to the checkout iframe.
   *
   * @param response - A promise that resolves to the response payload
   * @throws CheckoutRespondWithError if respondWith() has already been called for this event
   * @throws CheckoutRespondWithError if no source window is available
   *
   * @example
   * checkout.addEventListener('checkout:addressChangeStart', (event) => {
   *   event.respondWith(
   *     showAddressSelector().then(selectedAddress => ({
   *       delivery: {
   *         addresses: [{
   *           address: selectedAddress
   *         }]
   *       }
   *     }))
   *   );
   * });
   */
  respondWith(response: Promise<ResponsePayload>): void {
    if (this.#responded) {
      throw new CheckoutRespondWithError(
        `<shopify-checkout>: respondWith() has already been called for this ${this.type} event`,
      );
    }

    if (!this.#source) {
      throw new CheckoutRespondWithError(
        `<shopify-checkout>: Cannot respond to ${this.type} event - no source window available`,
      );
    }

    this.#responded = true;

    response
      .then((resolvedResponse) => {
        // Construct JSON-RPC 2.0 response envelope
        const jsonRpcResponse = {
          jsonrpc: "2.0" as const,
          id: this.#id,
          result: resolvedResponse,
        };

        // Post the response back to the checkout
        (this.#source as WindowProxy).postMessage(jsonRpcResponse, this.#origin);
        return undefined;
      })
      .catch(() => {
        // Consumer's promise rejected - no way to surface this error
        // since respondWith() has already returned
      });
  }
}

export class ShopifyCheckoutAddressChangeStartEvent extends ShopifyCheckoutRespondableEvent<CheckoutAddressChangeStartResponsePayload> {
  declare type: "checkout:addressChangeStart";

  constructor(options: { id: string; source: MessageEventSource | null; origin: string }) {
    super("checkout:addressChangeStart", options);
  }
}

export class ShopifyCheckoutPaymentMethodChangeStartEvent extends ShopifyCheckoutRespondableEvent<CheckoutPaymentMethodChangeStartResponsePayload> {
  declare type: "checkout:paymentMethodChangeStart";

  constructor(options: { id: string; source: MessageEventSource | null; origin: string }) {
    super("checkout:paymentMethodChangeStart", options);
  }
}

export class ShopifyCheckoutSubmitStartEvent extends ShopifyCheckoutRespondableEvent<CheckoutSubmitStartResponsePayload> {
  declare type: "checkout:submitStart";

  constructor(options: { id: string; source: MessageEventSource | null; origin: string }) {
    super("checkout:submitStart", options);
  }
}

/* ------------------------------------------------------------
 * Checkout protocol
 * ------------------------------------------------------------
 */
const CHECKOUT_PROTOCOL_MESSAGES: (keyof CheckoutProtocolMessageMap)[] = [
  "checkout.start",
  "checkout.complete",
  "checkout.error",
  "checkout.addressChangeStart",
  "checkout.paymentMethodChangeStart",
  "checkout.submitStart",
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
    this.protocol = { version: "2025-10" };
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
