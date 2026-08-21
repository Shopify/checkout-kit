/**
 * Stable, consumer-facing reason for a terminal checkout failure.
 *
 * The string values are the wire format shared by both native SDKs:
 * `CheckoutErrorCode` on iOS sends its `rawValue`, and Android sends
 * the lower-snake-case enum constant name.
 *
 * Every member arrives from both platforms unless its own documentation
 * names a single platform.
 */
export enum CheckoutErrorCode {
  /** The storefront requires a password and cannot be used by Checkout Kit. */
  storefrontPasswordRequired = 'storefront_password_required',

  /** Checkout requires a customer account that is not available to the current session. */
  customerAccountRequired = 'customer_account_required',

  /** The cart or checkout session is no longer available. Create a new cart before retrying. */
  cartExpired = 'cart_expired',

  /** The cart has already completed checkout. */
  cartCompleted = 'cart_completed',

  /** The cart is invalid or cannot be used to continue checkout. */
  invalidCart = 'invalid_cart',

  /** Checkout returned an HTTP error response. See {@link CheckoutException.statusCode}. */
  httpError = 'http_error',

  /** Checkout navigation failed before an HTTP response was available. */
  networkError = 'network_error',

  /**
   * The installed WebView provider does not support the required WebMessageListener API.
   *
   * Android only. Android System WebView updates apart from the operating system,
   * so an old provider can lack the API. iOS never sends this code.
   *
   * @platform android
   */
  webViewNotSupported = 'web_view_not_supported',

  /** The WebView renderer process terminated or crashed. Reopen checkout to recover. */
  webContentProcessTerminated = 'web_content_process_terminated',

  /** An internal Checkout Kit error occurred, for example when a protocol message could not be decoded. */
  sdkError = 'sdk_error',

  /** An unexpected error occurred. */
  unknown = 'unknown',
}

function getCheckoutErrorCode(code: string | undefined): CheckoutErrorCode {
  return Object.values(CheckoutErrorCode).includes(code as CheckoutErrorCode)
    ? (code as CheckoutErrorCode)
    : CheckoutErrorCode.unknown;
}

/**
 * The raw `fail` envelope payload emitted by both native SDKs.
 *
 * Produced by `CustomCheckoutListener.populateErrorDetails` on Android and
 * `ShopifyEventSerialization.serialize(checkoutError:)` on iOS.
 */
export type CheckoutNativeError = {
  code: CheckoutErrorCode;
  message: string;
  statusCode?: number;
};

/**
 * A terminal checkout failure.
 *
 * Use `code` for application behaviour and `message` for diagnostics.
 * `statusCode` is present only when an HTTP response caused the failure.
 */
export class CheckoutException {
  code: CheckoutErrorCode;
  message: string;
  statusCode?: number;
  name: string;

  constructor(exception?: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception?.code);
    this.message = exception?.message ?? '';
    this.statusCode = exception?.statusCode;
    this.name = this.constructor.name;
  }
}

export function parseCheckoutError(
  exception: CheckoutNativeError,
): CheckoutException {
  return new CheckoutException(exception);
}
