import {
  EmbeddedCheckoutProtocol,
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  type WindowOpenRequest,
  type WindowOpenResult,
} from "@shopify/checkout-kit-protocol";

import type { Logger } from "./logger";
import {
  isMalformedUniversalCheckoutProtocolEnvelope,
  parseUniversalCheckoutProtocolBatch,
  UNIVERSAL_CHECKOUT_PROTOCOL_VERSION,
  type JSONRPCResponse,
  type UniversalCheckoutRequest,
} from "./universal.protocol";
import { UniversalCheckoutReducer } from "./universal.reducer";
import type {
  UniversalCheckout,
  UniversalCheckoutError,
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutResourceEventDetail,
} from "./universal.types";

export class ShopifyUniversalCheckoutStartEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  declare type: "start";

  constructor(detail: UniversalCheckoutResourceEventDetail) {
    super("start", { detail, bubbles: true });
  }
}

export class ShopifyUniversalCheckoutUpdateEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  declare type: "update";

  constructor(detail: UniversalCheckoutResourceEventDetail) {
    super("update", { detail, bubbles: true });
  }
}

export class ShopifyUniversalCheckoutCompleteEvent extends CustomEvent<UniversalCheckoutResourceEventDetail> {
  declare type: "complete";

  constructor(detail: UniversalCheckoutResourceEventDetail) {
    super("complete", { detail, bubbles: true });
  }
}

export class ShopifyUniversalCheckoutErrorEvent extends CustomEvent<UniversalCheckoutErrorEventDetail> {
  declare type: "error";

  constructor(detail: UniversalCheckoutErrorEventDetail) {
    // Checkout failures belong to the element, not global runtime error handlers.
    super("error", { detail, bubbles: false });
  }
}

interface UniversalCheckoutSessionOptions {
  readonly target: EventTarget;
  readonly logger: Logger;
  readonly openWindow: (request: WindowOpenRequest) => WindowOpenResult;
  /** Must bind both this session and its exact presentation generation. */
  readonly isActive: () => boolean;
  readonly recordDecodeError: (method: string, failureType: "envelope" | "params") => void;
  readonly recordTerminalError: () => void;
  readonly recordStart: () => void;
  readonly recordNavigationFailure: () => void;
}

/** One Universal Checkout presentation and its independent protocol state. */
export class UniversalCheckoutSession {
  readonly #reducer = new UniversalCheckoutReducer();
  readonly #options: UniversalCheckoutSessionOptions;
  #checkout?: UniversalCheckout;
  #error?: UniversalCheckoutError;

  constructor(options: UniversalCheckoutSessionOptions) {
    this.#options = options;
  }

  get checkout(): UniversalCheckout | undefined {
    return this.#checkout;
  }

  get error(): UniversalCheckoutError | undefined {
    return this.#error;
  }

  /** Called only after the element has validated the active source and origin. */
  handleMessage(event: MessageEvent): void {
    if (!this.#options.isActive()) return;
    const batch = parseUniversalCheckoutProtocolBatch(event.data);
    if (!batch) {
      if (isMalformedUniversalCheckoutProtocolEnvelope(event.data)) {
        this.#options.logger.error("dropped malformed Universal Checkout protocol batch");
        this.#options.recordDecodeError("unknown", "envelope");
      }
      return;
    }

    const {
      target,
      logger,
      isActive,
      recordDecodeError,
      recordTerminalError,
      recordStart,
      recordNavigationFailure,
    } = this.#options;
    for (const entry of batch.invalidEntries) {
      const revision = entry.revision === undefined ? "" : ` at revision ${entry.revision}`;
      logger.error(
        `dropped ${entry.method} member ${entry.index}${revision}: ${entry.field} ${entry.reason}`,
      );
      recordDecodeError(entry.method, "params");
    }

    const responses: JSONRPCResponse[] = [];
    for (const request of batch.requests) {
      if (!isActive()) return;
      responses.push(this.#responseFor(request));
    }
    if (responses.length > 0 && event.source && isActive()) {
      try {
        // Both values were checked against the active presentation by the
        // element. Do not retarget a response to a newly opened presentation.
        (event.source as WindowProxy).postMessage(responses, event.origin);
      } catch {
        logger.error("failed to send a Universal Checkout protocol response");
      }
    }

    if (!isActive()) return;
    const { checkout, error, events, acceptedTerminalErrors } = this.#reducer.reduce(
      batch.notifications,
    );
    // Commit the entire accepted batch before the first listener runs.
    this.#checkout = checkout;
    this.#error = error;
    for (let index = 0; index < acceptedTerminalErrors; index += 1) recordTerminalError();

    // End the initial navigation at the first accepted start or session-wide
    // failure, before a host listener can close or replace this presentation.
    const navigationOutcome = events.find(
      (lifecycle) =>
        lifecycle.type === "start" ||
        (lifecycle.type === "error" && lifecycle.detail.some(({ scope }) => scope === "session")),
    );
    if (navigationOutcome?.type === "start") recordStart();
    else if (navigationOutcome?.type === "error") recordNavigationFailure();

    for (const { type, detail } of events) {
      if (!isActive()) break;
      switch (type) {
        case "start":
          target.dispatchEvent(new ShopifyUniversalCheckoutStartEvent(detail));
          break;
        case "update":
          target.dispatchEvent(new ShopifyUniversalCheckoutUpdateEvent(detail));
          break;
        case "complete":
          target.dispatchEvent(new ShopifyUniversalCheckoutCompleteEvent(detail));
          break;
        case "error":
          target.dispatchEvent(new ShopifyUniversalCheckoutErrorEvent(detail));
          break;
      }
    }
  }

  #responseFor(request: UniversalCheckoutRequest): JSONRPCResponse {
    switch (request.kind) {
      case "reject":
        return request.response;
      case "ready":
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: EmbeddedCheckoutProtocol.Event.ready.encode({
            ucp: { version: UNIVERSAL_CHECKOUT_PROTOCOL_VERSION, status: "success" },
          }),
        };
      case "windowOpen":
        try {
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: EmbeddedCheckoutProtocol.Event.windowOpen.encode(
              this.#options.openWindow(request.request),
            ),
          };
        } catch {
          this.#options.logger.error("failed to handle a delegated window request");
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE },
          };
        }
    }
  }
}
