import { startSessionSample } from "../universal-session/app";

startSessionSample({
  tag: "shopify-universal-checkout",
  productName: "Universal Checkout",
  storagePrefix: "checkout-kit:universal-demo",
  button: false,
});
