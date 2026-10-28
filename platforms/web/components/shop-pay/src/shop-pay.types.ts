import type {
  Checkout,
  CheckoutFailure,
  CheckoutFailureCode,
} from "@shopify/checkout-kit-core/checkout/types";

type DeepReadonly<Value> = Value extends object
  ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
  : Value;

/**
 * A child checkout snapshot. Checkout Kit omits the top-level `ucp` protocol
 * metadata and keeps every other checkout field, including `status`.
 * The snapshot and all nested objects and arrays are frozen and readonly.
 */
export type ShopPaySnapshot = {
  readonly [Key in keyof Checkout as Key extends "ucp" ? never : Key]: Key extends "status"
    ? Checkout[Key] | "unknown"
    : DeepReadonly<Checkout[Key]>;
} & { readonly ucp?: never };

/**
 * The session's state for a checkout resource. `active` defers to the child's
 * checkout status; other values describe a state outside that checkout.
 */
export type ShopPayResourceStatus = "active" | "completed" | "failed" | "ejected" | "unknown";

/** Identifies the session revision and checkout resource a notification describes. */
export interface ShopPayContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId: string;
  /** Absence and `active` defer to `checkout.status`. */
  readonly status?: ShopPayResourceStatus;
}

/** One resource entry in a public lifecycle batch. */
export interface ShopPayResourceEventEntry {
  readonly context: ShopPayContext;
  readonly checkout: ShopPaySnapshot;
}

/** Each public event contains the accepted entries of one contiguous lifecycle batch. */
export type ShopPayResourceEventDetail = readonly ShopPayResourceEventEntry[];

/** Session errors have no shop ID; resource errors retain their resource context. */
export interface ShopPayErrorContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId?: string;
  /** The resource status when this is a resource error. */
  readonly status?: ShopPayResourceStatus;
}

/** Stable Checkout Kit error codes. Unrecognized checkout codes become `unknown`. */
export type ShopPayErrorCode = CheckoutFailureCode;

/** A Kit-owned failure, independent of the checkout protocol's error response. */
export type ShopPayFailure = CheckoutFailure;

/** One resource or session error in a public lifecycle batch. */
export interface ShopPayErrorEventEntry {
  /** Absent for local presentation failures, such as an invalid checkout URL. */
  readonly context?: ShopPayErrorContext;
  /** The resource's final snapshot, when the producer supplied one. */
  readonly checkout?: ShopPaySnapshot;
  readonly error: ShopPayFailure;
}

export type ShopPayErrorEventDetail = readonly ShopPayErrorEventEntry[];
