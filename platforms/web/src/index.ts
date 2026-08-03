// Registers `<shopify-checkout>` (side effect).
import "./checkout-web-component";

// The custom element class.
export { ShopifyCheckout } from "./checkout";

// Event classes — useful for `instanceof` checks and as type aliases for handlers.
export {
  ShopifyCheckoutStartEvent,
  ShopifyCheckoutCompleteEvent,
  ShopifyCheckoutCloseEvent,
  ShopifyCheckoutErrorEvent,
  ShopifyCheckoutLineItemsChangeEvent,
  ShopifyCheckoutTotalsChangeEvent,
  ShopifyCheckoutMessagesChangeEvent,
} from "./checkout";

// Event detail payload types — useful for typing handler parameter shapes.
export type {
  ShopifyCheckoutStartEventDetail,
  ShopifyCheckoutCompleteEventDetail,
  ShopifyCheckoutErrorEventDetail,
  ShopifyCheckoutLineItemsChangeEventDetail,
  ShopifyCheckoutTotalsChangeEventDetail,
  ShopifyCheckoutMessagesChangeEventDetail,
} from "./checkout";

// Public configuration types.
export type {
  CheckoutAppearance,
  CheckoutTarget,
  LogLevel,
  MessageRejectedDetail,
} from "./checkout.types";

// UCP domain types — surfaced because they appear on event details and the
// `element.checkout` / `element.error` mirrors.
export type {
  Buyer,
  Checkout,
  LineItem,
  Message,
  OrderConfirmation,
  CheckoutTotal,
  ErrorResponse,
} from "./checkout.types";
