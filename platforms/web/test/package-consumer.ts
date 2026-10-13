// Resolve the package's built exports, without the source tsconfig path aliases.
import { ShopifyCheckout } from "@shopify/checkout-kit";
import type { Checkout, CheckoutAppearance } from "@shopify/checkout-kit";

const checkout = document.createElement("shopify-checkout") as ShopifyCheckout;
const appearance: CheckoutAppearance = "storefront";
checkout.appearance = appearance;
checkout.src = "https://example.myshopify.com/checkouts/test";
checkout.addEventListener("complete", (event) => {
  const snapshot: Checkout = event.detail.checkout;
  void snapshot;
});
checkout.open();
checkout.close();
