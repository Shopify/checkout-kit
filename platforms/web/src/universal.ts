/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import type {
  CheckoutAppearance,
  CheckoutMethods,
  CheckoutTarget,
  LogLevel,
  MessageRejectedDetail,
  TypedEventListener,
} from "./checkout.types";
import {
  applyCheckoutTargetClass,
  attachCheckoutShadow,
  checkoutSourceURL,
  handleWindowOpenRequest,
  isCheckoutMessageFromPresentation,
  openCheckoutPresentation,
  removeCheckoutTargetClass,
  validateCheckoutMessageOrigin,
  type CheckoutPresentation,
} from "./internal/checkout-element";
import { coerceLogLevel, Logger } from "./logger";
import { createTelemetry, telemetryProtocolMethod, type CheckoutKitTelemetry } from "./telemetry";
import { isUniversalCheckoutUrl, UNIVERSAL_CHECKOUT_PROTOCOL_VERSION } from "./universal.protocol";
import {
  UniversalCheckoutSession,
  type ShopifyUniversalCheckoutCompleteEvent,
  type ShopifyUniversalCheckoutStartEvent,
  type ShopifyUniversalCheckoutUpdateEvent,
  ShopifyUniversalCheckoutErrorEvent,
} from "./universal.session";
import type {
  UniversalCheckout,
  UniversalCheckoutError,
  UniversalCheckoutFailure,
} from "./universal.types";

declare const CHECKOUT_KIT_PACKAGE_VERSION: string;

const CHECKOUT_APPEARANCES = new Map<string, { colorScheme: string; branding: string }>([
  ["app:light", { colorScheme: "light", branding: "app" }],
  ["app:dark", { colorScheme: "dark", branding: "app" }],
  ["app:automatic", { colorScheme: "automatic", branding: "app" }],
  ["storefront", { colorScheme: "web_default", branding: "shop" }],
]);

/**
 * A Universal Checkout element. Checkout Kit answers the batched `ec.ready`
 * handshake, validates every entry of each JSON-RPC batch, commits the batch to
 * the session state, then dispatches ordered arrays of accepted notifications.
 *
 * @attribute src - A Universal Checkout continuation URL.
 * @attribute target - Where checkout is presented (auto, popup, new tab, or a named window).
 * @attribute appearance - Checkout appearance preference.
 * @attribute log-level - Console logging verbosity (debug, warn, error, or none).
 * @attribute telemetry - Set to false to disable anonymous diagnostic metrics.
 * @attribute allowed-origins - Extra trusted message origins, separated by spaces or commas.
 *
 * @event start - One or more child checkouts became interactive.
 * @event update - One or more full child snapshots changed.
 * @event complete - The session's explicit completion notification.
 * @event error - One or more resource or session failures.
 * @event close - The presentation closed without a checkout outcome; detail is null.
 */
export class ShopifyUniversalCheckout extends HTMLElement implements CheckoutMethods {
  static observedAttributes = ["src", "target", "appearance", "telemetry"] as const;

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
  #localError?: UniversalCheckoutError;

  get #recorder(): CheckoutKitTelemetry | undefined {
    if (!this.telemetry) return undefined;
    return (this.#telemetryClient ??= createTelemetry());
  }

  get src(): string {
    return this.getAttribute("src") ?? "";
  }

  set src(value: string | undefined) {
    this.#setAttribute("src", value);
  }

  get target(): CheckoutTarget | string {
    return this.getAttribute("target") ?? "auto";
  }

  set target(value: CheckoutTarget | string | undefined) {
    this.#setAttribute("target", value);
  }

  get logLevel(): LogLevel {
    return coerceLogLevel(this.getAttribute("log-level"));
  }

  set logLevel(value: LogLevel | undefined) {
    this.#setAttribute("log-level", value);
  }

  get telemetry(): boolean {
    return this.getAttribute("telemetry")?.toLowerCase() !== "false";
  }

  set telemetry(value: boolean | undefined) {
    if (value === undefined || value === null) {
      this.removeAttribute("telemetry");
      return;
    }
    const input: unknown = value;
    const enabled = typeof input === "string" ? input.toLowerCase() !== "false" : Boolean(input);
    this.setAttribute("telemetry", String(enabled));
  }

  get appearance(): CheckoutAppearance | string {
    return this.getAttribute("appearance") ?? "storefront";
  }

  set appearance(value: CheckoutAppearance | string | undefined) {
    this.#setAttribute("appearance", value);
  }

  get allowedOrigins(): string[] {
    const attr = this.getAttribute("allowed-origins");
    if (!attr) return [];
    return attr.split(/[\s,]+/).filter(Boolean);
  }

  set allowedOrigins(value: string[] | string | undefined) {
    if (value == null) {
      this.removeAttribute("allowed-origins");
      return;
    }
    this.#setAttribute("allowed-origins", Array.isArray(value) ? value.join(" ") : value);
  }

  onMessageRejected?: (detail: MessageRejectedDetail) => void;

  /** Every checkout in the open session, after the latest applied batch. */
  get checkout(): UniversalCheckout | undefined {
    return this.#session?.checkout;
  }

  /** The error of every failed checkout in the open session. */
  get error(): UniversalCheckoutError | undefined {
    return this.#localError ?? this.#session?.error;
  }

  open(): void {
    const src = this.#srcAsURL({ warnInvalidAppearance: true })?.href;
    if (!src) {
      this.#logger.error("src property is empty or invalid, cannot open checkout");
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
    this.close();
    this.#localError = undefined;
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
          method: telemetryProtocolMethod(method),
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
      this.#recorder?.recordError({
        category: "navigation",
        stage: "presentation",
        code: "blocked",
        retryable: false,
        isRetry: false,
      });
      this.#emitLocalFailure({ code: "sdk_error", message: "Checkout popup was blocked." });
      presentation.close();
    }
  }

  close(): void {
    this.#presentation?.close();
  }

  override focus(): void {
    this.#presentation?.focus();
  }

  connectedCallback(): void {
    this.#recorder?.start();
    applyCheckoutTargetClass(this, this.target);
    this.#initCheckoutProtocol();
  }

  disconnectedCallback(): void {
    this.#checkoutProtocolController?.abort();
    this.#checkoutProtocolController = undefined;
    this.close();
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
      removeCheckoutTargetClass(this, oldValue);
      applyCheckoutTargetClass(this, this.target);
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

  override addEventListener(
    type: "start",
    listener: TypedEventListener<ShopifyUniversalCheckoutStartEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "update",
    listener: TypedEventListener<ShopifyUniversalCheckoutUpdateEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "complete",
    listener: TypedEventListener<ShopifyUniversalCheckoutCompleteEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "error",
    listener: TypedEventListener<ShopifyUniversalCheckoutErrorEvent> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  override addEventListener(
    type: "close",
    listener: TypedEventListener<ShopifyUniversalCheckoutCloseEvent> | null,
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

  #srcAsURL({ warnInvalidAppearance = false } = {}): URL | undefined {
    const url = checkoutSourceURL(this.src);
    if (!url) return;

    url.searchParams.delete("ec_auth");
    url.searchParams.delete("ec_color_scheme");
    url.searchParams.delete("ck_branding");
    url.searchParams.set("ec_version", UNIVERSAL_CHECKOUT_PROTOCOL_VERSION);
    url.searchParams.set("ec_delegate", "window.open");
    const appearance = this.appearance;
    const appearanceParams = CHECKOUT_APPEARANCES.get(appearance);
    if (!appearanceParams && appearance !== "" && warnInvalidAppearance) {
      this.#logger.warn(`appearance="${appearance}" is not supported and will be ignored`);
    }
    if (appearanceParams) {
      url.searchParams.set("ec_color_scheme", appearanceParams.colorScheme);
      url.searchParams.set("ck_branding", appearanceParams.branding);
    }
    url.searchParams.set("ck_version", CHECKOUT_KIT_PACKAGE_VERSION);
    return url;
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
    const entry = Object.freeze({ scope: "session" as const, error: Object.freeze(failure) });
    const detail = Object.freeze([entry]);
    this.#localError = Object.freeze({ errors: detail });
    this.dispatchEvent(new ShopifyUniversalCheckoutErrorEvent(detail));
  }

  #setAttribute(name: string, value: string | boolean | undefined): void {
    if (value === true) {
      this.setAttribute(name, "");
    } else if (value != null && value !== false) {
      this.setAttribute(name, value);
    } else {
      this.removeAttribute(name);
    }
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
      validateCheckoutMessageOrigin(event, this.#srcAsURL(), this.allowedOrigins, (message) => {
        this.#logger.warn(message);
      });
    } catch (error) {
      this.#rejectMessage(event, error);
      return;
    }

    this.#session?.handleMessage(event);
  };

  #rejectMessage(event: MessageEvent, error: unknown): void {
    const reason = error instanceof Error ? error.message : String(error);
    if (this.onMessageRejected) {
      try {
        this.onMessageRejected({ origin: event.origin, data: event.data, reason });
      } catch (callbackError) {
        this.#logger.error(
          "onMessageRejected callback threw",
          callbackError instanceof Error ? callbackError.message : String(callbackError),
        );
      }
      return;
    }
    this.#logger.warn(reason);
  }

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

export class ShopifyUniversalCheckoutCloseEvent extends CustomEvent<null> {
  declare type: "close";

  constructor() {
    super("close", { bubbles: true });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "shopify-universal-checkout": ShopifyUniversalCheckout;
  }
}

if (!customElements.get("shopify-universal-checkout")) {
  customElements.define("shopify-universal-checkout", ShopifyUniversalCheckout);
}

export {
  ShopifyUniversalCheckoutCompleteEvent,
  ShopifyUniversalCheckoutErrorEvent,
  ShopifyUniversalCheckoutStartEvent,
  ShopifyUniversalCheckoutUpdateEvent,
} from "./universal.session";

// Public configuration types shared with the standard Web entry.
export type {
  CheckoutAppearance,
  CheckoutTarget,
  LogLevel,
  MessageRejectedDetail,
} from "./checkout.types";

export type {
  UniversalCheckout,
  UniversalCheckoutContext,
  UniversalCheckoutError,
  UniversalCheckoutErrorCode,
  UniversalCheckoutErrorContext,
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutFailure,
  UniversalCheckoutResourceEventEntry,
  UniversalCheckoutErrorEventEntry,
  UniversalCheckoutResource,
  UniversalCheckoutResourceError,
  UniversalCheckoutResourceEventDetail,
  UniversalCheckoutSnapshot,
} from "./universal.types";
