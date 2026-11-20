import type {
  CheckoutEventRecord,
  SyntheticCheckoutDriver,
  SyntheticUniversalCheckoutDriver,
  UniversalCheckoutEventRecord,
} from "./types";

declare global {
  interface Window {
    checkoutEvents: CheckoutEventRecord[];
    syntheticCheckout: SyntheticCheckoutDriver;
    universalCheckoutEvents: UniversalCheckoutEventRecord[];
    syntheticUniversalCheckout: SyntheticUniversalCheckoutDriver;
  }
}
