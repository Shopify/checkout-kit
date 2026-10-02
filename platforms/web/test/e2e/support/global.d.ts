import type { CheckoutEventRecord, SyntheticCheckoutDriver } from "./types";

declare global {
  interface Window {
    checkoutEvents: CheckoutEventRecord[];
    syntheticCheckout: SyntheticCheckoutDriver;
  }
}
