// The package root has no side effects: it exports classes, events, and types.
// Register elements by importing a component entry such as
// `@shopify/checkout-kit/shopify-checkout`, or by calling `ShopifyCheckout.register()`.

export { ShopifyCheckout } from "./shopify-checkout";

export {
  ShopifyCheckoutStartEvent,
  ShopifyCheckoutUpdateEvent,
  ShopifyCheckoutCompleteEvent,
  ShopifyCheckoutErrorEvent,
  ShopifyCheckoutCloseEvent,
  ShopifyCheckoutBlockedEvent,
} from "./checkout-events";

export type {
  ShopifyCheckoutStartEventDetail,
  ShopifyCheckoutUpdateEventDetail,
  ShopifyCheckoutCompleteEventDetail,
  ShopifyCheckoutErrorEventDetail,
  ShopifyCheckoutBlockedEventDetail,
  CheckoutBlockedCode,
  ShopifyCheckoutEventMap,
} from "./checkout-events";

export type {
  CheckoutAppearance,
  CheckoutTarget,
  Checkout,
  CheckoutError,
  CheckoutErrorCode,
  LogLevel,
  MessageRejectedDetail,
} from "@shopify/checkout-kit-core/checkout/types";

// Shared domain types used by the Kit-owned checkout snapshot.
export type {
  Buyer,
  LineItem,
  Message,
  OrderConfirmation,
  CheckoutTotal,
} from "@shopify/checkout-kit-core/checkout/types";
