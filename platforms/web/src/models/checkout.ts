import type {
  Buyer,
  Checkout as ProtocolCheckout,
  CheckoutDiscounts,
  CheckoutFulfillment,
  CheckoutStatus,
  CheckoutTotal,
  Context,
  LineItem,
  Link,
  Message,
  OrderConfirmation,
  Payment,
} from "@shopify/checkout-kit-protocol";

/** A checkout snapshot containing checkout data without protocol metadata. */
export interface Checkout {
  attribution?: Record<string, string>;
  buyer?: Buyer;
  context?: Context;
  continueUrl?: string;
  currency: string;
  discounts?: CheckoutDiscounts;
  expiresAt?: string;
  fulfillment?: CheckoutFulfillment;
  id: string;
  lineItems: LineItem[];
  links: Link[];
  messages?: Message[];
  order?: OrderConfirmation;
  payment?: Payment;
  signals?: Record<string, unknown>;
  status: CheckoutStatus;
  totals: CheckoutTotal[];
  /** Extension fields keep their original names and values. */
  [key: string]: unknown;
}

/** Adapts an already-decoded checkout while preserving its extension fields. */
export function toCheckout(protocolCheckout: ProtocolCheckout): Checkout {
  const checkout: Checkout = { ...protocolCheckout };
  delete checkout.ucp;
  return checkout;
}

/**
 * Compares snapshot contents independently of object-key order. Compute this
 * before dispatching events so changes made by listeners cannot affect the
 * stored comparison with the next snapshot.
 */
export function checkoutComparisonKey(checkout: Checkout): string {
  return JSON.stringify(sortObjectKeys(checkout));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return Object.fromEntries(entries.map(([key, item]) => [key, sortObjectKeys(item)]));
  }
  return value;
}
