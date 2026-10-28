// Importing the package root does not register the element.
export { ShopifyCheckout } from "./shopify-checkout";
export type { ShopifyCheckoutEventMap } from "./checkout-events";
export type {
  CheckoutAppearance as ShopifyCheckoutAppearance,
  CheckoutTarget as ShopifyCheckoutTarget,
  LogLevel as ShopifyCheckoutLogLevel,
  Checkout as ShopifyCheckoutSnapshot,
  CheckoutError as ShopifyCheckoutError,
  CheckoutErrorCode as ShopifyCheckoutErrorCode,
  MessageRejectedDetail as ShopifyCheckoutMessageRejectedDetail,
} from "@shopify/checkout-kit-core/checkout/types";
