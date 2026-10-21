import {
  loadComponents,
  version,
} from "https://cdn.shopify.com/checkout-kit/v4/unstable/web-components.js";

await loadComponents(["shopify-checkout"]);

const major = version.split(".", 1)[0];
document.documentElement.dataset.checkoutKitProvenance = `CDN · v${major} · ${version}`;
