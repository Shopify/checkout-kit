import {
  loadComponents,
  version,
} from "https://cdn.shopify.com/checkout-kit/v4/unstable/checkout-kit.js";

await loadComponents(["shop-pay"]);

const major = version.split(".", 1)[0];
document.documentElement.dataset.checkoutKitProvenance = `CDN · v${major} · ${version}`;
