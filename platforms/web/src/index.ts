// The package root has no side effects: it exports classes, events, and types.
// Register elements by importing a component entry such as
// `@shopify/checkout-kit/shopify-checkout`, or by calling `ShopifyCheckout.register()`.

export { ShopifyCheckout } from "./components/shopify-checkout/shopify-checkout";

export {
  ShopifyCheckoutStartEvent,
  ShopifyCheckoutUpdateEvent,
  ShopifyCheckoutCompleteEvent,
  ShopifyCheckoutErrorEvent,
  ShopifyCheckoutCloseEvent,
  ShopifyCheckoutBlockedEvent,
} from "./components/shopify-checkout/checkout-events";

export type {
  ShopifyCheckoutStartEventDetail,
  ShopifyCheckoutUpdateEventDetail,
  ShopifyCheckoutCompleteEventDetail,
  ShopifyCheckoutErrorEventDetail,
  ShopifyCheckoutBlockedEventDetail,
  CheckoutBlockedCode,
  ShopifyCheckoutEventMap,
} from "./components/shopify-checkout/checkout-events";

export type {
  CheckoutAppearance,
  CheckoutTarget,
  Checkout,
  CheckoutError,
  CheckoutErrorCode,
  LogLevel,
  MessageRejectedDetail,
} from "./components/shopify-checkout/checkout.types";

// Shared domain types used by the Kit-owned checkout snapshot.
export type {
  Buyer,
  LineItem,
  Message,
  OrderConfirmation,
  CheckoutTotal,
} from "./components/shopify-checkout/checkout.types";
