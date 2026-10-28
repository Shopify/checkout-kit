// Registration entry for `<shopify-universal-checkout>`.
// The package root exports the class without registering it.
import { ShopifyUniversalCheckout } from "./shopify-universal-checkout";

// A page may load Checkout Kit more than once (an npm bundle plus the CDN loader,
// or two copies of a bundle). Leave an existing <shopify-universal-checkout> in place rather
// than failing the import. Server rendering has no registry, so importing does nothing there.
if (globalThis.customElements && customElements.get("shopify-universal-checkout") === undefined) {
  ShopifyUniversalCheckout.register();
}
