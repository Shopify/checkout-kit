// Entry point for `@shopify/checkout-kit/shopify-checkout`: importing it registers
// `<shopify-checkout>`. The package root exports the class without registering it.
import { ShopifyCheckout } from "./shopify-checkout";

// A page may load Checkout Kit more than once (an npm bundle plus the CDN loader,
// or two copies of a bundle). Leave an existing <shopify-checkout> in place rather
// than failing the import.
if (customElements.get("shopify-checkout") === undefined) {
  ShopifyCheckout.register();
}
