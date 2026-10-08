// Preserve the existing root import. New components register through their
// own package subpaths rather than being added to this entry.
import "./components/shopify-checkout/register";

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
