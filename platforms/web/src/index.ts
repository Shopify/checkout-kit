// Registers `<shopify-checkout>` (side effect).
import "./checkout-web-component";

export { ShopifyCheckout } from "./checkout";

export {
  ShopifyCheckoutStartEvent,
  ShopifyCheckoutUpdateEvent,
  ShopifyCheckoutCompleteEvent,
  ShopifyCheckoutErrorEvent,
  ShopifyCheckoutCloseEvent,
} from "./checkout-events";

export type {
  ShopifyCheckoutStartEventDetail,
  ShopifyCheckoutUpdateEventDetail,
  ShopifyCheckoutCompleteEventDetail,
  ShopifyCheckoutErrorEventDetail,
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
} from "./checkout.types";

// Shared domain types used by the Kit-owned checkout snapshot.
export type { Buyer, LineItem, Message, OrderConfirmation, CheckoutTotal } from "./checkout.types";
