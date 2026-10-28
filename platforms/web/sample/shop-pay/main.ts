import { startSessionSample } from "../universal-session/app";

startSessionSample({
  tag: "shop-pay",
  productName: "Shop Pay",
  storagePrefix: "checkout-kit:shop-pay-demo",
  button: true,
});
