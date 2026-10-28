// Registration entry for `<shop-pay>`.
// The package root exports the class without registering it.
import { ShopPay } from "./shop-pay";

// A page may load Checkout Kit more than once (an npm bundle plus the CDN loader,
// or two copies of a bundle). Leave an existing <shop-pay> in place rather
// than failing the import. Server rendering has no registry, so importing does nothing there.
if (globalThis.customElements && customElements.get("shop-pay") === undefined) {
  ShopPay.register();
}
