import {
  EmbeddedCheckoutProtocol,
  decodeProtocolMessage,
  windowOpenSuccess,
  windowOpenRejected,
  INVALID_PARAMS_CODE,
  type WindowOpenRequest,
  type WindowOpenResult,
} from "@shopify/checkout-kit-protocol";

import stylesText from "./checkout.css?inline";
import { createTemplate, html, safe } from "./utils";
import type {
  CheckoutAttributes,
  CheckoutMethods,
  CheckoutProperties,
  CheckoutTarget,
  TypedEventListener,
  Checkout,
  CheckoutAppearance,
  ErrorResponse,
} from "./checkout.types";

export const DEFAULT_POPUP_WIDTH = 600;
export const DEFAULT_POPUP_HEIGHT = 600;
export const CK_VERSION = "4.0.0";

const WINDOW_OPEN_INVALID_URL_WARNING =
  "<shopify-checkout>: ec.window.open_request received without a valid url";

const EMBED_DELEGATIONS = [EmbeddedCheckoutProtocol.Delegations.windowOpen] as const;
const CHECKOUT_APPEARANCES = new Map<string, { colorScheme: string; branding: string }>([
  ["app:light", { colorScheme: "light", branding: "app" }],
  ["app:dark", { colorScheme: "dark", branding: "app" }],
  ["app:automatic", { colorScheme: "automatic", branding: "app" }],
  ["storefront", { colorScheme: "web_default", branding: "shop" }],
]);

const SHADOW_TEMPLATE = createTemplate(html`
  <div id="shopify-element-wrapper">
    <style>
      ${safe(stylesText)}
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
 * @attribute target - Where the checkout is presented (auto, popup, new tab, or a named window).
 * @attribute appearance - Checkout appearance preference (app:light, app:dark, app:automatic, storefront).
 *
 * @event ec.start - Dispatched when the checkout has started
 * @event ec.complete - Dispatched when the checkout was successfully completed
 * @event ec.error - Dispatched on a session-level fatal error
 * @event ec.line_items.change - Dispatched when cart line items change
 * @event ec.totals.change - Dispatched when totals change
 * @event ec.messages.change - Dispatched when checkout messages change
 * @event ec.close - Dispatched when the checkout overlay is closed (synthetic, not part of ECP)
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
  static observedAttributes = ["src", "target", "appearance"] as const;

  constructor() {
    super();

    this.attachShadow({ mode: "open" }).appendChild(SHADOW_TEMPLATE.content.cloneNode(true));
  }

  #checkout?: Checkout;
  #error?: ErrorResponse;

  #checkoutWindow: WindowProxy | null = null;

  // Manages the listeners for the popup window, new tabs, and scrim dialog
  #currentOpen: { controller: AbortController } | null = null;
  // Manages the global message event listener for checkout protocol communication
  #checkoutProtocolController: { controller: AbortController } | null = null;
  // Shared protocol client that decodes messages and dispatches to handlers
  #client!: EmbeddedCheckoutProtocol.Client;

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
  #srcAsURL({ warnInvalidAppearance = false } = {}) {
    let url: URL;
    try {
      url = new URL(this.src);
    } catch {
      return undefined;
    }
    if (url.protocol !== "https:") return undefined;

    url.searchParams.delete("ck_branding");

    const appearance = this.appearance;
    const queryParams = CHECKOUT_APPEARANCES.get(appearance);
    if (!queryParams && appearance !== "" && warnInvalidAppearance) {
      this.#debugWarn(`appearance="${appearance}" is not supported and will be ignored`);
    }

    const negotiatedUrl = EmbeddedCheckoutProtocol.url(url.toString(), {
      delegations: EMBED_DELEGATIONS,
      colorScheme: queryParams?.colorScheme,
    });
    const finalUrl = new URL(negotiatedUrl);
    if (queryParams) {
      finalUrl.searchParams.set("ck_branding", queryParams.branding);
    }
    finalUrl.searchParams.set("ck_version", CK_VERSION);
    return finalUrl;
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

  get appearance(): CheckoutAppearance | string {
    return this.getAttribute("appearance") ?? "storefront";
  }

  set appearance(value: CheckoutAppearance | string | undefined) {
    this.#setAttribute("appearance", value);
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
   * checkout.addEventListener('ec.start', (event) => {
   *   const {lineItems, totals, buyer} = event.detail.checkout;
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
   * checkout.addEventListener('ec.error', (event) => {
   *   const {messages} = event.detail.error;
   *   console.error(messages[0]?.code, messages[0]?.content);
   * });
   */
  get error(): ErrorResponse | undefined {
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
    const src = this.#srcAsURL({ warnInvalidAppearance: true })?.href;

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
      case "_blank":
      default: {
        if (target === "_self" || target === "_parent" || target === "_top") {
          this.#debugWarn(
            `target="${target}" would navigate the current page; falling back to "auto"`,
          );
          checkoutWindow = window.open(src, "auto");
        } else {
          checkoutWindow = window.open(src, target);
        }
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
        const timer = setTimeout(() => {
          if (checkoutWindow?.closed) {
            abortController.abort();
          }
        }, 50);
        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timer);
        });
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

  #validateMessageOrigin(event: MessageEvent) {
    if (!this.#srcAsURL()) {
      throw new Error("Dropped message because src is invalid or unset");
    }

    let origin: URL;
    try {
      origin = new URL(event.origin);
    } catch {
      throw new Error(`Dropped message from non-HTTPS origin "${event.origin}"`);
    }

    if (origin.protocol !== "https:") {
      throw new Error(`Dropped message from non-HTTPS origin "${event.origin}"`);
    }
  }

  #initCheckoutProtocol() {
    // Clean up any existing checkout protocol controller to prevent memory leaks
    // Necessary because connectedCallback() can be called multiple times
    // if the element is moved within the DOM, but disconnectedCallback() is not called
    // during DOM moves, leading to potentially accumulated event listeners.
    this.#checkoutProtocolController?.controller.abort();

    this.#client = this.#buildProtocolClient();
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

    try {
      this.#validateMessageOrigin(event);
    } catch (error) {
      this.#debugWarn(error instanceof Error ? error.message : String(error));
      return;
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(event.data);
    } catch (error) {
      this.#debugWarn(
        `Dropped message because it could not be serialized: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    void this.#dispatchProtocolMessage(serialized, event);
  };

  /**
   * Builds the shared protocol client with a handler per embedded checkout
   * notification/request. Handlers receive already-decoded payloads and map
   * them onto the component's cached state and DOM events.
   *
   * @see https://ucp.dev/2026-04-08/specification/embedded-checkout/
   */
  #buildProtocolClient(): EmbeddedCheckoutProtocol.Client {
    const { Event } = EmbeddedCheckoutProtocol;

    return new EmbeddedCheckoutProtocol.Client()
      .on(Event.ready, () => ({
        ucp: {
          status: "success",
          version: EmbeddedCheckoutProtocol.specVersion,
        },
      }))
      .on(Event.start, (checkout) => {
        this.#checkout = checkout;
        this.dispatchEvent(new ShopifyCheckoutStartEvent({ checkout }));
      })
      .on(Event.complete, (checkout) => {
        this.#checkout = checkout;
        this.dispatchEvent(new ShopifyCheckoutCompleteEvent({ checkout }));
      })
      .on(Event.error, (error) => {
        this.#error = error;
        this.dispatchEvent(new ShopifyCheckoutErrorEvent({ error }));
        // Per UCP spec, `unrecoverable` means no valid resource exists to act on —
        // the kit closes so consumers don't have to wire dismissal in every handler.
        if (
          Array.isArray(error.messages) &&
          error.messages.some((m) => m.severity === "unrecoverable")
        ) {
          this.close();
        }
      })
      .on(Event.lineItemsChange, (checkout) => {
        this.#checkout = checkout;
        this.dispatchEvent(new ShopifyCheckoutLineItemsChangeEvent({ checkout }));
      })
      .on(Event.totalsChange, (checkout) => {
        this.#checkout = checkout;
        this.dispatchEvent(new ShopifyCheckoutTotalsChangeEvent({ checkout }));
      })
      .on(Event.messagesChange, (checkout) => {
        this.#checkout = checkout;
        this.dispatchEvent(new ShopifyCheckoutMessagesChangeEvent({ checkout }));
      })
      .on(Event.windowOpen, (request) => this.#handleWindowOpen(request));
  }

  /**
   * Feeds a serialized JSON-RPC message through the protocol client and posts
   * any response back to the checkout window. Responses only exist for
   * requests (`ec.ready`, `ec.window.open_request`, unknown methods);
   * notifications resolve to `undefined` and post nothing.
   */
  async #dispatchProtocolMessage(serialized: string, event: MessageEvent): Promise<void> {
    const response = await this.#client.process(serialized);
    if (response === undefined) return;

    const parsed = JSON.parse(response) as {
      error?: { code?: number };
    } & Record<string, unknown>;

    // The client returns -32602 for a window.open request whose url is missing
    // or not a string (the handler never runs). Preserve the host-side warning.
    if (
      parsed.error?.code === INVALID_PARAMS_CODE &&
      decodeProtocolMessage(serialized)?.method === EmbeddedCheckoutProtocol.Event.windowOpen.method
    ) {
      // eslint-disable-next-line no-console
      console.warn(WINDOW_OPEN_INVALID_URL_WARNING, event.data);
    }

    const { source } = event;
    if (source) {
      (source as WindowProxy).postMessage(parsed, event.origin);
    }
  }

  /**
   * Handles an `ec.window.open_request` delegation: opens a validated `https:`
   * URL in a new tab and returns a UCP result. Invalid or non-`https:` URLs
   * are rejected (and warned about) rather than opened.
   */
  #handleWindowOpen(request: WindowOpenRequest): WindowOpenResult {
    let targetUrl: URL;
    try {
      targetUrl = new URL(request.url);
    } catch {
      // eslint-disable-next-line no-console
      console.warn(WINDOW_OPEN_INVALID_URL_WARNING, request);
      return windowOpenRejected("url is not a valid URL");
    }

    if (targetUrl.protocol !== "https:") {
      // eslint-disable-next-line no-console
      console.warn(WINDOW_OPEN_INVALID_URL_WARNING, request);
      return windowOpenRejected("url must use https scheme");
    }

    window.open(targetUrl.href, "_blank", "noopener");
    return windowOpenSuccess();
  }

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
      case "src":
        this.#updateOverlayLink();
        break;
      case "appearance":
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
    type: "ec.start",
    listener: TypedEventListener<ShopifyCheckoutStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.close",
    listener: TypedEventListener<ShopifyCheckoutCloseEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.complete",
    listener: TypedEventListener<ShopifyCheckoutCompleteEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.error",
    listener: TypedEventListener<ShopifyCheckoutErrorEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.line_items.change",
    listener: TypedEventListener<ShopifyCheckoutLineItemsChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.totals.change",
    listener: TypedEventListener<ShopifyCheckoutTotalsChangeEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "ec.messages.change",
    listener: TypedEventListener<ShopifyCheckoutMessagesChangeEvent> | null,
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

/* ------------------------------------------------------------
 * Event detail shapes — what each event carries on `event.detail`.
 * ------------------------------------------------------------
 */

export interface ShopifyCheckoutStartEventDetail {
  /** Initial checkout snapshot from the ECP `ec.start` notification. */
  checkout: Checkout;
}

export interface ShopifyCheckoutCompleteEventDetail {
  /** Final checkout snapshot from the ECP `ec.complete` notification. */
  checkout: Checkout;
}

export interface ShopifyCheckoutErrorEventDetail {
  /** Error payload from the ECP `ec.error` notification. */
  error: ErrorResponse;
}

export interface ShopifyCheckoutLineItemsChangeEventDetail {
  /** Checkout snapshot with updated cart line items. */
  checkout: Checkout;
}

export interface ShopifyCheckoutTotalsChangeEventDetail {
  /** Checkout snapshot with updated totals. */
  checkout: Checkout;
}

export interface ShopifyCheckoutMessagesChangeEventDetail {
  /** Checkout snapshot with updated warnings, errors, and informational messages. */
  checkout: Checkout;
}

/* ------------------------------------------------------------
 * Event classes — `CustomEvent<T>` subclasses carrying typed details.
 * ------------------------------------------------------------
 */

export class ShopifyCheckoutStartEvent extends CustomEvent<ShopifyCheckoutStartEventDetail> {
  declare type: "ec.start";

  constructor(detail: ShopifyCheckoutStartEventDetail) {
    super("ec.start", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutCompleteEvent extends CustomEvent<ShopifyCheckoutCompleteEventDetail> {
  declare type: "ec.complete";

  constructor(detail: ShopifyCheckoutCompleteEventDetail) {
    super("ec.complete", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutCloseEvent extends CustomEvent<undefined> {
  declare type: "ec.close";

  constructor() {
    super("ec.close", { bubbles: true });
  }
}

export class ShopifyCheckoutErrorEvent extends CustomEvent<ShopifyCheckoutErrorEventDetail> {
  declare type: "ec.error";

  constructor(detail: ShopifyCheckoutErrorEventDetail) {
    super("ec.error", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutLineItemsChangeEvent extends CustomEvent<ShopifyCheckoutLineItemsChangeEventDetail> {
  declare type: "ec.line_items.change";

  constructor(detail: ShopifyCheckoutLineItemsChangeEventDetail) {
    super("ec.line_items.change", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutTotalsChangeEvent extends CustomEvent<ShopifyCheckoutTotalsChangeEventDetail> {
  declare type: "ec.totals.change";

  constructor(detail: ShopifyCheckoutTotalsChangeEventDetail) {
    super("ec.totals.change", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutMessagesChangeEvent extends CustomEvent<ShopifyCheckoutMessagesChangeEventDetail> {
  declare type: "ec.messages.change";

  constructor(detail: ShopifyCheckoutMessagesChangeEventDetail) {
    super("ec.messages.change", { detail, bubbles: true });
  }
}
