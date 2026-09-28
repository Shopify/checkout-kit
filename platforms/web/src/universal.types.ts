import type { Checkout } from "./checkout.types";

export type UniversalCheckoutEventType = "start" | "update" | "complete";

/**
 * A child checkout snapshot. Checkout Kit omits the top-level `ucp` protocol
 * metadata and keeps every other checkout field, including `status`.
 */
export type UniversalCheckoutSnapshot = {
  readonly [Key in keyof Checkout as Key extends "ucp" ? never : Key]: Key extends "status"
    ? Checkout[Key] | "unknown"
    : Checkout[Key];
} & { readonly ucp?: never };

/** Identifies the session revision and checkout resource a notification describes. */
export interface UniversalCheckoutContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId: string;
}

/** One resource entry in a public lifecycle batch. */
export interface UniversalCheckoutResourceEventEntry {
  readonly context: UniversalCheckoutContext;
  readonly checkout: UniversalCheckoutSnapshot;
}

/** Each public event contains the accepted entries of one contiguous lifecycle batch. */
export type UniversalCheckoutResourceEventDetail = readonly UniversalCheckoutResourceEventEntry[];

/** Session errors have no shop ID; resource errors retain their resource context. */
export interface UniversalCheckoutErrorContext {
  readonly sessionId: string;
  readonly revision: number;
  readonly shopId?: string;
}

/** Stable Checkout Kit error codes. Unrecognized checkout codes become `unknown`. */
export type UniversalCheckoutErrorCode =
  | "storefront_password_required"
  | "customer_account_required"
  | "cart_expired"
  | "cart_completed"
  | "invalid_cart"
  | "sdk_error"
  | "unknown";

/** A Kit-owned failure, independent of the checkout protocol's error response. */
export interface UniversalCheckoutFailure {
  readonly code: UniversalCheckoutErrorCode;
  readonly message: string;
  readonly httpStatusCode?: number;
}

/** One resource or session error in a public lifecycle batch. */
export interface UniversalCheckoutErrorEventEntry {
  /** Absent for failures before a session can be established, such as a blocked popup. */
  readonly context?: UniversalCheckoutErrorContext;
  readonly scope: "resource" | "session";
  readonly error: UniversalCheckoutFailure;
}

export type UniversalCheckoutErrorEventDetail = readonly UniversalCheckoutErrorEventEntry[];

/** One checkout in the session; its status is `checkout.status`. */
export interface UniversalCheckoutResource {
  readonly id: string;
  readonly shopId: string;
  readonly checkout: UniversalCheckoutSnapshot;
}

/** Every checkout in the session after the latest applied batch. */
export interface UniversalCheckout {
  readonly sessionId: string;
  readonly revision: number;
  readonly resources: readonly UniversalCheckoutResource[];
}

export interface UniversalCheckoutResourceError {
  readonly context?: UniversalCheckoutErrorContext;
  readonly shopId?: string;
  readonly scope: "resource" | "session";
  readonly error: UniversalCheckoutFailure;
}

/** The error of every failed checkout in the session. */
export interface UniversalCheckoutError {
  readonly sessionId?: string;
  readonly revision?: number;
  readonly errors: readonly UniversalCheckoutResourceError[];
}
