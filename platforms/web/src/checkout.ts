import {
  EmbeddedCheckoutProtocol,
  decodeProtocolMessage,
  INVALID_PARAMS_CODE,
  type Checkout as ProtocolCheckout,
} from "@shopify/checkout-kit-protocol";

import { toCheckout, checkoutComparisonKey } from "./models/checkout";
import { toCheckoutError } from "./models/error";
import {
  ShopifyCheckoutStartEvent,
  ShopifyCheckoutUpdateEvent,
  ShopifyCheckoutCompleteEvent,
  ShopifyCheckoutErrorEvent,
  ShopifyCheckoutCloseEvent,
  type ShopifyCheckoutEventMap,
} from "./checkout-events";

import {
  applyCheckoutTargetClass,
  attachCheckoutShadow,
  checkoutAllowedOrigins,
  checkoutSourceURL,
  handleWindowOpenRequest,
  isCheckoutMessageFromPresentation,
  openCheckoutPresentation,
  rejectCheckoutMessage,
  removeCheckoutTargetClass,
  setCheckoutAttribute,
  validateCheckoutMessageOrigin,
  WINDOW_OPEN_INVALID_URL_WARNING,
  type CheckoutPresentation,
} from "./internal/checkout-element";

import { Logger, coerceLogLevel } from "./logger";
import { createTelemetry, telemetryProtocolMethod, type CheckoutKitTelemetry } from "./telemetry";
import { CK_VERSION } from "./version";
import type {
  CheckoutAttributes,
  CheckoutMethods,
  CheckoutProperties,
  CheckoutTarget,
  TypedEventListener,
  Checkout,
  CheckoutAppearance,
  CheckoutError,
  LogLevel,
  MessageRejectedDetail,
} from "./checkout.types";

export {
  DEFAULT_POPUP_WIDTH,
  DEFAULT_POPUP_HEIGHT,
  SHOP_APP_ORIGIN,
} from "./internal/checkout-element";
export { CK_VERSION } from "./version";

const EMBED_DELEGATIONS = [EmbeddedCheckoutProtocol.Delegations.windowOpen] as const;
const CHECKOUT_APPEARANCES = new Map<string, { colorScheme: string; branding: string }>([
  ["app:light", { colorScheme: "light", branding: "app" }],
  ["app:dark", { colorScheme: "dark", branding: "app" }],
  ["app:automatic", { colorScheme: "automatic", branding: "app" }],
  ["storefront", { colorScheme: "web_default", branding: "shop" }],
]);

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
 *
 * @event {ShopifyCheckoutStartEvent} start - Checkout has started.
 * @event {ShopifyCheckoutUpdateEvent} update - The checkout snapshot changed.
 * @event {ShopifyCheckoutCompleteEvent} complete - Checkout completed successfully.
 * @event {ShopifyCheckoutErrorEvent} error - Checkout reported a terminal error; the session closes after this event.
 * @event {ShopifyCheckoutCloseEvent} close - The checkout session closed.
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
  static observedAttributes = ["src", "target", "appearance", "telemetry"] as const;

  constructor() {
    super();

    attachCheckoutShadow(this);
  }

  #checkout?: Checkout;
  #error?: CheckoutError;
  #checkoutComparisonKey?: string;

  #presentation?: CheckoutPresentation;
  // Manages the global message event listener for checkout protocol communication
  #checkoutProtocolController: { controller: AbortController } | null = null;
  // Shared protocol client that decodes messages and dispatches to handlers
  #client!: EmbeddedCheckoutProtocol.Client;
  #telemetryClient?: CheckoutKitTelemetry;
  #navigationStartedAt?: number;

  /* ------------------------------------------------------------
   * Read/write properties (reflected with attributes)
   * ------------------------------------------------------------
   */

  get src(): string {
    return this.getAttribute("src") ?? "";
  }

  set src(value: string | undefined) {
    this.#setAttribute("src", value);
  }

  /**
   * Parses `src` as a URL, validates the scheme, and appends the `ec_*`
   * query parameters used for embedded checkout protocol negotiation.
   * Returns `undefined` if `src` is unset, malformed, or uses a non-
   * `https:` scheme.
   */
  #srcAsURL({ warnInvalidAppearance = false } = {}) {
    const url = checkoutSourceURL(this.src);
    if (!url) return undefined;

    url.searchParams.delete("ck_branding");

    const appearance = this.appearance;
    const queryParams = CHECKOUT_APPEARANCES.get(appearance);
    if (!queryParams && appearance !== "" && warnInvalidAppearance) {
      this.#logger.warn(`appearance="${appearance}" is not supported and will be ignored`);
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
   * Console logging verbosity. Ordered as a threshold — `debug` is the most
   * verbose and `none` silences everything. Defaults to `'warn'`.
   */
  get logLevel(): LogLevel {
    return coerceLogLevel(this.getAttribute("log-level"));
  }

  set logLevel(value: LogLevel | undefined) {
    this.#setAttribute("log-level", value);
  }

  #logger = new Logger("<shopify-checkout>", () => this.logLevel);

  get telemetry(): boolean {
    return this.getAttribute("telemetry")?.toLowerCase() !== "false";
  }

  set telemetry(value: boolean | undefined) {
    // `#setAttribute` removes boolean `false`, which would restore the enabled default.
    if (value === undefined || value === null) {
      this.removeAttribute("telemetry");
      return;
    }
    // JavaScript and React can assign values outside the public boolean type.
    // Strings follow the attribute contract; other values coerce as booleans.
    const input: unknown = value;
    const enabled = typeof input === "string" ? input.toLowerCase() !== "false" : Boolean(input);
    this.setAttribute("telemetry", String(enabled));
  }

  get #recorder() {
    if (!this.telemetry) return undefined;
    return (this.#telemetryClient ??= createTelemetry());
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

  /**
   * Extra origins allowed to post incoming checkout-protocol messages, on top
   * of the always-trusted cart URL origin (from `src`) and `shop.app`.
   *
   * Checkout on web is closed by default: with no configured origins, only the
   * cart URL origin and `shop.app` (including its subdomains) are trusted. Add
   * origins here to widen the allowlist. Entries may be exact origins
   * (`https://example.com`), wildcard subdomains (`https://*.example.com`), or
   * `"*"` to disable origin validation entirely.
   *
   * Reflected to the space/comma-separated `allowed-origins` attribute, so the
   * attribute and property can be used interchangeably.
   */
  get allowedOrigins(): string[] {
    return checkoutAllowedOrigins(this);
  }

  set allowedOrigins(value: string[] | string | undefined) {
    if (value == null) {
      this.removeAttribute("allowed-origins");
      return;
    }
    const serialized = Array.isArray(value) ? value.join(" ") : value;
    this.#setAttribute("allowed-origins", serialized);
  }

  /**
   * Invoked when an incoming message is dropped by origin validation. The
   * smart default logs a warning; assign a function to observe rejected
   * messages instead (for example, to report them). Beware treating rejected
   * messages as trusted — they were dropped precisely because their origin was
   * not in the allowlist.
   */
  onMessageRejected?: (detail: MessageRejectedDetail) => void;

  #setAttribute(name: string, value: string | boolean | undefined) {
    setCheckoutAttribute(this, name, value);
  }

  /* ------------------------------------------------------------
   * Read-only properties (populated by checkout protocol events)
   * ------------------------------------------------------------
   */

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
  get checkout(): Checkout | undefined {
    return this.#checkout;
  }

  /**
   * The latest checkout error, with a stable recovery code and diagnostic message.
   *
   * @returns The checkout error, or undefined.
   * @example
   * checkout.addEventListener('error', (event) => {
   *   console.error(event.detail.error.code, event.detail.error.message);
   * });
   */
  get error(): CheckoutError | undefined {
    return this.#error;
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
      this.#logger.warn("src property is empty or invalid, cannot open checkout");
      this.#recorder?.recordError({
        category: "navigation",
        stage: "initialization",
        code: "invalid_url",
        retryable: false,
        isRetry: false,
      });
      return;
    }

    // Close any existing session before opening another one.
    this.close();
    this.#checkout = undefined;
    this.#error = undefined;
    this.#checkoutComparisonKey = undefined;
    const navigationStartedAt = performance.now();
    const presentation = openCheckoutPresentation({
      element: this,
      src,
      target,
      onUnsafeTarget: (unsafeTarget) => {
        this.#logger.warn(
          `target="${unsafeTarget}" would navigate the current page; falling back to "auto"`,
        );
      },
      onClose: () => {
        this.#navigationStartedAt = undefined;
        this.#presentation = undefined;
        this.dispatchEvent(new ShopifyCheckoutCloseEvent());
      },
    });
    this.#presentation = presentation;

    const { checkoutWindow } = presentation;
    this.#navigationStartedAt = checkoutWindow && this.telemetry ? navigationStartedAt : undefined;

    if (!checkoutWindow) {
      this.#recorder?.recordError({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: false,
        isRetry: false,
      });
    }
  }

  close(): void {
    this.#presentation?.close();
  }

  #recordNavigationSuccess(): void {
    this.#recordNavigationDuration("success");
  }

  #recordNavigationFailure(): void {
    this.#recordNavigationDuration("failure");
  }

  #recordNavigationDuration(result: "success" | "failure"): void {
    const startedAt = this.#navigationStartedAt;
    if (startedAt === undefined) return;
    this.#navigationStartedAt = undefined;
    this.#recorder?.recordNavigationDuration({
      milliseconds: performance.now() - startedAt,
      result,
      preloaded: false,
    });
  }

  override focus(): void {
    this.#presentation?.focus();
  }

  #applyTargetClass(): void {
    applyCheckoutTargetClass(this, this.target);
  }

  #removeTargetClass(value: string | null): void {
    removeCheckoutTargetClass(this, value);
  }

  /* ------------------------------------------------------------
   * Events
   * ------------------------------------------------------------
   */

  #validateMessageOrigin(event: MessageEvent): void {
    validateCheckoutMessageOrigin(event, this.#srcAsURL(), this.allowedOrigins, (message) => {
      this.#logger.warn(message);
    });
  }

  #rejectMessage(event: MessageEvent, error: unknown): void {
    rejectCheckoutMessage(this, event, error, this.#logger);
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
    window.addEventListener(
      "pagehide",
      () => void this.#telemetryClient?.flush({ keepalive: true }),
      {
        signal: this.#checkoutProtocolController.controller.signal,
      },
    );
  }

  #handleMessage = (event: MessageEvent) => {
    // Source check: messages must come from the embedded checkout window
    // we opened. Unrelated postMessage traffic on the host page (other
    // SDKs, browser extensions, etc.) is dropped silently.
    const presentation = this.#presentation;
    if (!isCheckoutMessageFromPresentation(event, presentation)) return;

    try {
      this.#validateMessageOrigin(event);
    } catch (error) {
      this.#rejectMessage(event, error);
      return;
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(event.data);
    } catch (error) {
      this.#logger.warn(
        `Dropped message because it could not be serialized: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.#recorder?.recordProtocolDecodeError({
        method: "unknown",
        failureType: "serialization",
      });
      return;
    }

    void this.#dispatchProtocolMessage(serialized, event, presentation);
  };

  /**
   * Builds the shared protocol client with a handler per embedded checkout
   * notification/request. Handlers receive already-decoded payloads and map
   * them onto the component's cached state and DOM events.
   *
   * @see https://ucp.dev/2026-08-25/specification/shopping/checkout/embedded/
   */
  #buildProtocolClient(): EmbeddedCheckoutProtocol.Client {
    const { Event } = EmbeddedCheckoutProtocol;

    return new EmbeddedCheckoutProtocol.Client()
      .onDecodeError(({ method, error }) => {
        this.#logger.error(
          `dropped ${method}: failed to decode payload`,
          error instanceof Error ? error.message : String(error),
        );
        this.#recorder?.recordProtocolDecodeError({
          method: telemetryProtocolMethod(method),
          failureType: "params",
        });
      })
      .on(Event.ready, () => ({
        ucp: {
          status: "success",
          version: EmbeddedCheckoutProtocol.specVersion,
        },
      }))
      .on(Event.start, ({ params: { checkout } }) => {
        // Web cannot reliably observe cross-origin popup page-finish, so the
        // success duration ends at `ec.start`: checkout is loaded and interactive.
        this.#recordNavigationSuccess();
        const snapshot = this.#recordCheckout(checkout);
        /** @ignore - Events are documented by the class @event tags. */
        this.dispatchEvent(new ShopifyCheckoutStartEvent({ checkout: snapshot }));
      })
      .on(Event.complete, ({ params: { checkout } }) => {
        const snapshot = this.#recordCheckout(checkout);
        /** @ignore - Events are documented by the class @event tags. */
        this.dispatchEvent(new ShopifyCheckoutCompleteEvent({ checkout: snapshot }));
      })
      .on(Event.error, ({ params: { error } }) => {
        this.#recorder?.recordError({
          category: "protocol",
          stage: "message",
          code: "terminal_error",
          retryable: false,
          isRetry: false,
        });
        this.#error = toCheckoutError(error);
        /** @ignore - Events are documented by the class @event tags. */
        this.dispatchEvent(new ShopifyCheckoutErrorEvent({ error: this.#error }));
        // `ec.error` is terminal for the embedded session. Message severity is
        // payload detail for the checkout error, not a host-side recovery signal.
        this.#recordNavigationFailure();
        this.close();
      })
      .on(Event.fulfillmentChange, ({ params: { checkout } }) => {
        this.#updateCheckout(checkout);
      })
      .on(Event.lineItemsChange, ({ params: { checkout } }) => {
        this.#updateCheckout(checkout);
      })
      .on(Event.totalsChange, ({ params: { checkout } }) => {
        this.#updateCheckout(checkout);
      })
      .on(Event.messagesChange, ({ params: { checkout } }) => {
        this.#updateCheckout(checkout);
      })
      .on(Event.windowOpen, ({ params }) =>
        handleWindowOpenRequest(params, EmbeddedCheckoutProtocol.specVersion, this.#logger),
      );
  }

  #recordCheckout(checkout: ProtocolCheckout): Checkout {
    const snapshot = toCheckout(checkout);
    this.#checkout = snapshot;
    // Keep the comparison independent of mutations made by event listeners.
    this.#checkoutComparisonKey = checkoutComparisonKey(snapshot);
    return snapshot;
  }

  #updateCheckout(checkout: ProtocolCheckout): void {
    const previous = this.#checkoutComparisonKey;
    const snapshot = this.#recordCheckout(checkout);
    if (this.#checkoutComparisonKey === previous) return;
    /** @ignore - Events are documented by the class @event tags. */
    this.dispatchEvent(new ShopifyCheckoutUpdateEvent({ checkout: snapshot }));
  }

  /**
   * Feeds a serialized JSON-RPC message through the protocol client and posts
   * any response back to the checkout window. Responses only exist for
   * requests (`ec.ready`, `ec.window.open_request`, unknown methods);
   * notifications resolve to `undefined` and post nothing.
   */
  async #dispatchProtocolMessage(
    serialized: string,
    event: MessageEvent,
    presentation: CheckoutPresentation,
  ): Promise<void> {
    // The source and origin were authenticated before the async protocol handler.
    // A later presentation must never receive this response.
    const source = event.source as WindowProxy;
    const origin = event.origin;
    const response = await this.#client.process(serialized);
    if (response === undefined || this.#presentation !== presentation || !presentation.isActive()) {
      return;
    }

    const parsed = JSON.parse(response) as {
      error?: { code?: number };
    } & Record<string, unknown>;

    // The client returns -32602 for a window.open request whose url is missing
    // or not a string (the handler never runs). Preserve the host-side warning.
    if (
      parsed.error?.code === INVALID_PARAMS_CODE &&
      decodeProtocolMessage(serialized)?.method === EmbeddedCheckoutProtocol.Event.windowOpen.method
    ) {
      this.#logger.warn(WINDOW_OPEN_INVALID_URL_WARNING);
    }

    source.postMessage(parsed, origin);
  }

  /* ------------------------------------------------------------
   * Lifecycle
   * ------------------------------------------------------------
   */

  connectedCallback(): void {
    this.#recorder?.start();
    this.#applyTargetClass();

    this.#initCheckoutProtocol();
  }

  disconnectedCallback(): void {
    this.#checkoutProtocolController?.controller.abort();
    this.#checkoutProtocolController = null;
    this.close();
    const telemetryClient = this.#telemetryClient;
    this.#telemetryClient = undefined;
    if (telemetryClient) void telemetryClient.shutdown({ keepalive: true });
  }

  attributeChangedCallback(
    name: (typeof ShopifyCheckout.observedAttributes)[number],
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case "src": {
        if (this.#presentation) this.close();
        break;
      }
      case "target": {
        if (this.#presentation) {
          this.close();
        }

        this.#removeTargetClass(oldValue);
        this.#applyTargetClass();

        break;
      }
      case "telemetry": {
        if (this.telemetry) {
          if (this.isConnected) this.#recorder?.start();
        } else {
          this.#navigationStartedAt = undefined;
          const telemetryClient = this.#telemetryClient;
          this.#telemetryClient = undefined;
          if (telemetryClient) void telemetryClient.shutdown({ discardPending: true });
        }
        break;
      }
    }
  }

  /* ------------------------------------------------------------
   * Custom Events
   * ------------------------------------------------------------
   */
  // Typed overloads provide event-specific payloads and preserve native listeners.
  override addEventListener<K extends keyof ShopifyCheckoutEventMap>(
    type: K,
    listener: TypedEventListener<ShopifyCheckoutEventMap[K]> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: TypedEventListener<HTMLElementEventMap[K]> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
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
