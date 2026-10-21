import "@shopify/checkout-kit/shopify-checkout";

declare const CHECKOUT_KIT_PACKAGE_VERSION: string;

document.documentElement.dataset.checkoutKitProvenance = `Local source · ${CHECKOUT_KIT_PACKAGE_VERSION}`;

await import("./main");
