import type { Checkout } from "./checkout-model";
import type { CheckoutError } from "./checkout-error";
import type { CheckoutLink, CheckoutLinkAction } from "./checkout.types";

export interface ShopifyCheckoutStartEventDetail {
  checkout: Checkout;
}

export interface ShopifyCheckoutUpdateEventDetail {
  checkout: Checkout;
}

export interface ShopifyCheckoutCompleteEventDetail {
  checkout: Checkout;
}

export interface ShopifyCheckoutErrorEventDetail {
  error: CheckoutError;
}

export interface ShopifyCheckoutLinkClickEventDetail {
  link: CheckoutLink;
}

export class ShopifyCheckoutStartEvent extends CustomEvent<ShopifyCheckoutStartEventDetail> {
  declare type: "start";

  constructor(detail: ShopifyCheckoutStartEventDetail) {
    super("start", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutUpdateEvent extends CustomEvent<ShopifyCheckoutUpdateEventDetail> {
  declare type: "update";

  constructor(detail: ShopifyCheckoutUpdateEventDetail) {
    super("update", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutCompleteEvent extends CustomEvent<ShopifyCheckoutCompleteEventDetail> {
  declare type: "complete";

  constructor(detail: ShopifyCheckoutCompleteEventDetail) {
    super("complete", { detail, bubbles: true });
  }
}

export class ShopifyCheckoutCloseEvent extends CustomEvent<undefined> {
  declare type: "close";

  constructor() {
    super("close", { bubbles: true });
  }
}

export class ShopifyCheckoutErrorEvent extends CustomEvent<ShopifyCheckoutErrorEventDetail> {
  declare type: "error";

  constructor(detail: ShopifyCheckoutErrorEventDetail) {
    super("error", { detail, bubbles: true });
  }
}

const linkResponses = new WeakMap<ShopifyCheckoutLinkClickEvent, Promise<CheckoutLinkAction>>();

/** A link request whose default action opens the URL in a new tab. */
export class ShopifyCheckoutLinkClickEvent extends CustomEvent<ShopifyCheckoutLinkClickEventDetail> {
  declare type: "linkclick";

  constructor(detail: ShopifyCheckoutLinkClickEventDetail) {
    super("linkclick", { detail, bubbles: true, cancelable: true });
  }

  /**
   * Choose how to handle this link. Call once, during event dispatch; pass a
   * promise if the decision requires asynchronous work. A rejected promise
   * rejects the link request. Calling preventDefault() cancels the request
   * when no response was supplied.
   */
  respondWith(action: CheckoutLinkAction | Promise<CheckoutLinkAction>): void {
    if (this.eventPhase === Event.NONE || linkResponses.has(this)) {
      throw new DOMException(
        "respondWith must be called once during event dispatch",
        "InvalidStateError",
      );
    }
    const response = Promise.resolve(action);
    // A later listener may throw before the bridge consumes this response.
    void response.catch(() => {});
    linkResponses.set(this, response);
  }
}

export interface ShopifyCheckoutEventMap {
  start: ShopifyCheckoutStartEvent;
  update: ShopifyCheckoutUpdateEvent;
  complete: ShopifyCheckoutCompleteEvent;
  error: ShopifyCheckoutErrorEvent;
  close: ShopifyCheckoutCloseEvent;
  linkclick: ShopifyCheckoutLinkClickEvent;
}

/** Dispatches the public event and consumes its response inside the bridge. */
export async function dispatchCheckoutLinkClick(
  target: EventTarget,
  link: CheckoutLink,
  signal?: AbortSignal,
): Promise<CheckoutLinkAction> {
  const event = new ShopifyCheckoutLinkClickEvent({ link });
  target.dispatchEvent(event);
  const response: Promise<CheckoutLinkAction> =
    linkResponses.get(event) ?? Promise.resolve(event.defaultPrevented ? "cancel" : "open");
  const action = await new Promise<CheckoutLinkAction>((resolve, reject) => {
    const abort = () => reject(new DOMException("Checkout session ended", "AbortError"));
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    response.then(
      (value) => {
        signal?.removeEventListener("abort", abort);
        return resolve(value);
      },
      (error: unknown) => {
        signal?.removeEventListener("abort", abort);
        return reject(error);
      },
    );
  });
  if (action !== "open" && action !== "handled" && action !== "cancel") {
    throw new TypeError("Invalid checkout link action");
  }
  return action;
}
