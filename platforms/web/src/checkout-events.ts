import type { Checkout } from "./checkout-model";
import type { CheckoutError } from "./checkout-error";

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

export interface ShopifyCheckoutEventMap {
  start: ShopifyCheckoutStartEvent;
  update: ShopifyCheckoutUpdateEvent;
  complete: ShopifyCheckoutCompleteEvent;
  error: ShopifyCheckoutErrorEvent;
  close: ShopifyCheckoutCloseEvent;
}
