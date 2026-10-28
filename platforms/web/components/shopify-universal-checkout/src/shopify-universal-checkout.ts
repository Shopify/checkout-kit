import { getUnsupportedBrowserCapabilities } from "@shopify/checkout-kit-core/checkout/browser-capabilities";

import { EmbeddedCheckoutProtocol } from "@shopify/checkout-kit-protocol";

import type {
  CheckoutBlockedDetail,
  CheckoutMethods,
  CheckoutTarget,
  LogLevel,
  MessageRejectedDetail,
  TypedEventListener,
} from "@shopify/checkout-kit-core/checkout/types";
import {
  attachCheckoutShadow,
  checkoutSourceURL,
  handleWindowOpenRequest,
  isCheckoutMessageFromPresentation,
  openCheckoutPresentation,
  rejectCheckoutMessage,
  setCheckoutAttribute,
  setCheckoutTelemetry,
  updateCheckoutTargetClass,
  validateCheckoutMessageOrigin,
  type CheckoutPresentation,
} from "@shopify/checkout-kit-core/checkout/presentation";
import { coerceLogLevel, Logger } from "@shopify/checkout-kit-core/checkout/logger";
import {
  createTelemetry,
  telemetryProtocolMethod,
  type CheckoutKitTelemetry,
} from "@shopify/checkout-kit-core/checkout/telemetry";
import { isUniversalCheckoutUrl, UNIVERSAL_CHECKOUT_PROTOCOL_VERSION } from "./protocol";
import {
  UniversalCheckoutSession,
  type ShopifyUniversalCheckoutCompleteEvent,
  type ShopifyUniversalCheckoutStartEvent,
  type ShopifyUniversalCheckoutUpdateEvent,
  ShopifyUniversalCheckoutErrorEvent,
} from "./session";
import type { UniversalCheckoutFailure } from "./universal.types";

import {
  HTMLElementBase,
  registerCustomElement,
} from "@shopify/checkout-kit-core/checkout/custom-element";
import { CK_VERSION } from "@shopify/checkout-kit-core/checkout/version";

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
export class ShopifyUniversalCheckout extends HTMLElementBase implements CheckoutMethods {
  static observedAttributes = ["src", "target", "telemetry"] as const;

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
  static register<T extends typeof ShopifyUniversalCheckout>(
    this: T,
    name: string = "shopify-universal-checkout",
    registry: CustomElementRegistry = customElements,
  ): T {
    return registerCustomElement(this, name, "shopify-universal-checkout", registry);
  }

  constructor() {
    super();
    attachCheckoutShadow(this);
  }

  #session?: UniversalCheckoutSession;
  #presentation?: CheckoutPresentation;
  #checkoutProtocolController?: AbortController;
  #logger = new Logger("<shopify-universal-checkout>", () => this.logLevel);
  #telemetryClient?: CheckoutKitTelemetry;
  #navigationStartedAt?: number;
  #dispatchingBlocked = false;
  /** True while the events from one checkout message are being dispatched. */
  #handlingMessage = false;
  /** A presentation that a listener closed while those events were being dispatched. */
  #closeAfterMessage?: CheckoutPresentation;

  get #recorder(): CheckoutKitTelemetry | undefined {
    if (!this.telemetry) return undefined;
    return (this.#telemetryClient ??= createTelemetry(["ec.update"], "universal_checkout"));
  }

  get src(): string {
    return this.getAttribute("src") ?? "";
  }

  set src(value: string | undefined) {
    setCheckoutAttribute(this, "src", value);
  }

  get target(): CheckoutTarget | string {
    return this.getAttribute("target") ?? "auto";
  }

  set target(value: CheckoutTarget | string | undefined) {
    setCheckoutAttribute(this, "target", value);
  }

  get logLevel(): LogLevel {
    return coerceLogLevel(this.getAttribute("log-level"));
  }

  set logLevel(value: LogLevel | undefined) {
    setCheckoutAttribute(this, "log-level", value);
  }

  get telemetry(): boolean {
    return this.getAttribute("telemetry")?.toLowerCase() !== "false";
  }

  set telemetry(value: boolean | undefined) {
    setCheckoutTelemetry(this, value);
  }

  onMessageRejected?: (detail: MessageRejectedDetail) => void;

  open(): void {
    if (this.#dispatchingBlocked) {
      this.#logger.warn("open() is ignored in a blocked listener; use a user action");
      return;
    }

    const unsupportedCapabilities = getUnsupportedBrowserCapabilities();
    if (unsupportedCapabilities.length > 0) {
      this.#emitLocalFailure({
        code: "unsupported_browser",
        message: `This browser does not support: ${unsupportedCapabilities.join(", ")}.`,
      });
      return;
    }

    const src = this.#srcAsURL()?.href;
    if (!src) {
      this.#logger.warn("src property is empty or invalid, cannot open checkout");
      this.#recorder?.recordError({
        category: "navigation",
        stage: "initialization",
        code: "invalid_url",
        retryable: false,
        isRetry: false,
      });
      this.#emitLocalFailure({ code: "sdk_error", message: "Checkout URL is invalid." });
      return;
    }

    this.#warnOnNonUniversalSource();
    // Opening from the blocked overlay replaces its presentation without a `close`.
    const isRetry = this.#presentation?.isActive() === true && !this.#presentation.checkoutWindow;
    if (isRetry) this.#presentation?.close("retry");
    // Close now, not through close(): a deferred close would run after the new
    // presentation opens, and could close the window it reuses.
    this.#presentation?.close();
    let presentation: CheckoutPresentation | undefined;
    const session: UniversalCheckoutSession = new UniversalCheckoutSession({
      target: this,
      logger: this.#logger,
      openWindow: (request) =>
        handleWindowOpenRequest(request, UNIVERSAL_CHECKOUT_PROTOCOL_VERSION, this.#logger),
      isActive: (): boolean =>
        this.#session === session &&
        this.#presentation === presentation &&
        presentation?.isActive() === true,
      recordDecodeError: (method, failureType) =>
        this.#recorder?.recordProtocolDecodeError({
          method: telemetryProtocolMethod(method, ["ec.update"]),
          failureType,
        }),
      recordTerminalError: () =>
        this.#recorder?.recordError({
          category: "protocol",
          stage: "message",
          code: "terminal_error",
          retryable: false,
          isRetry: false,
        }),
      recordStart: () => this.#recordNavigationDuration("success"),
      recordNavigationFailure: () => this.#recordNavigationDuration("failure"),
    });
    this.#session = session;
    this.#navigationStartedAt = performance.now();
    try {
      presentation = openCheckoutPresentation({
        element: this,
        src,
        target: this.target,
        onRetry: () => this.open(),
        onUnsafeTarget: (unsafeTarget) => {
          this.#logger.warn(
            `target="${unsafeTarget}" would navigate the current page; falling back to "auto"`,
          );
        },
        onClose: () => {
          if (this.#presentation !== presentation) return;
          this.#presentation = undefined;
          this.#navigationStartedAt = undefined;
          this.dispatchEvent(new ShopifyUniversalCheckoutCloseEvent());
        },
      });
      this.#presentation = presentation;
    } catch {
      this.#navigationStartedAt = undefined;
      this.#recorder?.recordError({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: false,
        isRetry: false,
      });
      this.#emitLocalFailure({ code: "sdk_error", message: "Checkout could not open." });
      return;
    }

    if (!presentation.checkoutWindow) {
      this.#navigationStartedAt = undefined;
      this.#logger.warn("checkout window could not be opened; the browser may have blocked it");
      this.#recorder?.recordError({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: true,
        isRetry,
      });
      this.#dispatchingBlocked = true;
      this.dispatchEvent(new ShopifyUniversalCheckoutBlockedEvent({ code: "popup_blocked" }));
      this.#dispatchingBlocked = false;
    }
  }

  /**
   * Closes checkout and its overlay. Safe to call from any event listener: when one
   * checkout message produces several events, the element dispatches all of them
   * before it closes.
   */
  close(): void {
    if (this.#handlingMessage) {
      this.#closeAfterMessage = this.#presentation;
      return;
    }
    this.#presentation?.close();
  }

  override focus(): void {
    this.#presentation?.focus();
  }

  connectedCallback(): void {
    this.#recorder?.start();
    updateCheckoutTargetClass(this, this.target);
    this.#initCheckoutProtocol();
  }

  disconnectedCallback(): void {
    this.#checkoutProtocolController?.abort();
    this.#checkoutProtocolController = undefined;
    this.#presentation?.close();
    const telemetryClient = this.#telemetryClient;
    this.#telemetryClient = undefined;
    if (telemetryClient) void telemetryClient.shutdown({ keepalive: true });
  }

  attributeChangedCallback(
    name: (typeof ShopifyUniversalCheckout.observedAttributes)[number],
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === "target") {
      if (this.#presentation) this.close();
      updateCheckoutTargetClass(this, this.target, oldValue);
    } else if (name === "src") {
      if (this.#presentation) this.close();
    } else if (name === "telemetry") {
      if (this.telemetry) {
        if (this.isConnected) this.#recorder?.start();
      } else {
        this.#navigationStartedAt = undefined;
        const telemetryClient = this.#telemetryClient;
        this.#telemetryClient = undefined;
        if (telemetryClient) void telemetryClient.shutdown({ discardPending: true });
      }
    }
  }

  override addEventListener<K extends keyof ShopifyUniversalCheckoutEventMap>(
    type: K,
    listener: TypedEventListener<ShopifyUniversalCheckoutEventMap[K]> | null,
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

  #srcAsURL(): URL | undefined {
    const url = checkoutSourceURL(this.src);
    if (!url) return;

    const negotiatedUrl = EmbeddedCheckoutProtocol.url(url.toString(), {
      delegations: [EmbeddedCheckoutProtocol.Delegations.windowOpen],
    });
    const finalUrl = new URL(negotiatedUrl);
    finalUrl.searchParams.set("ck_version", CK_VERSION);
    return finalUrl;
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

  #emitLocalFailure(failure: UniversalCheckoutFailure): void {
    this.#session = undefined;
    this.#navigationStartedAt = undefined;
    this.#presentation?.close();
    const entry = Object.freeze({ error: Object.freeze(failure) });
    const detail = Object.freeze([entry]);
    this.dispatchEvent(new ShopifyUniversalCheckoutErrorEvent(detail));
  }

  #initCheckoutProtocol(): void {
    this.#checkoutProtocolController?.abort();
    this.#checkoutProtocolController = new AbortController();
    window.addEventListener("message", this.#handleMessage, {
      signal: this.#checkoutProtocolController.signal,
    });
    window.addEventListener(
      "pagehide",
      () => void this.#telemetryClient?.flush({ keepalive: true }),
      { signal: this.#checkoutProtocolController.signal },
    );
  }

  #handleMessage = (event: MessageEvent): void => {
    if (!isCheckoutMessageFromPresentation(event, this.#presentation)) return;

    try {
      // Only the session URL's origin and Shop's own origins may message the element.
      validateCheckoutMessageOrigin(event, this.#srcAsURL(), [], () => {});
    } catch (error) {
      rejectCheckoutMessage(this, event, error, this.#logger);
      return;
    }

    // One message can dispatch several events. A close() from any of their
    // listeners waits until all of them have been dispatched.
    this.#handlingMessage = true;
    try {
      this.#session?.handleMessage(event);
    } finally {
      this.#handlingMessage = false;
      const presentation = this.#closeAfterMessage;
      this.#closeAfterMessage = undefined;
      presentation?.close();
    }
  };

  #warnOnNonUniversalSource(): void {
    let url: URL;
    try {
      url = new URL(this.src);
    } catch {
      return;
    }
    if (!isUniversalCheckoutUrl(url)) {
      this.#logger.warn("expected a Universal Checkout continuation URL");
    }
  }
}

/** Public lifecycle events dispatched by the element. */
export interface ShopifyUniversalCheckoutEventMap {
  start: ShopifyUniversalCheckoutStartEvent;
  update: ShopifyUniversalCheckoutUpdateEvent;
  complete: ShopifyUniversalCheckoutCompleteEvent;
  error: ShopifyUniversalCheckoutErrorEvent;
  close: ShopifyUniversalCheckoutCloseEvent;
  blocked: ShopifyUniversalCheckoutBlockedEvent;
}

export class ShopifyUniversalCheckoutCloseEvent extends CustomEvent<null> {
  declare type: "close";

  constructor() {
    super("close", { bubbles: false });
  }
}

export class ShopifyUniversalCheckoutBlockedEvent extends CustomEvent<CheckoutBlockedDetail> {
  declare type: "blocked";

  constructor(detail: CheckoutBlockedDetail) {
    super("blocked", { detail, bubbles: false });
  }
}

export {
  ShopifyUniversalCheckoutCompleteEvent,
  ShopifyUniversalCheckoutErrorEvent,
  ShopifyUniversalCheckoutStartEvent,
  ShopifyUniversalCheckoutUpdateEvent,
} from "./session";

// Public configuration types shared with the standard Web entry.
export type {
  CheckoutBlockedCode,
  CheckoutBlockedDetail,
  CheckoutTarget,
  LogLevel,
  MessageRejectedDetail,
} from "@shopify/checkout-kit-core/checkout/types";

export type {
  UniversalCheckoutContext,
  UniversalCheckoutErrorCode,
  UniversalCheckoutErrorContext,
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutFailure,
  UniversalCheckoutResourceEventEntry,
  UniversalCheckoutErrorEventEntry,
  UniversalCheckoutResourceStatus,
  UniversalCheckoutResourceEventDetail,
  UniversalCheckoutSnapshot,
} from "./universal.types";
