/**
 * Stable, consumer-facing reason for a terminal checkout failure.
 *
 * The string values are the wire format shared by both native SDKs:
 * `CheckoutErrorCode` on iOS sends its `rawValue`, and Android sends
 * the lower-snake-case enum constant name.
 */
export enum CheckoutErrorCode {
  storefrontPasswordRequired = 'storefront_password_required',
  customerAccountRequired = 'customer_account_required',
  cartExpired = 'cart_expired',
  cartCompleted = 'cart_completed',
  invalidCart = 'invalid_cart',
  httpError = 'http_error',
  networkError = 'network_error',
  webViewNotSupported = 'web_view_not_supported',
  webContentProcessTerminated = 'web_content_process_terminated',
  sdkError = 'sdk_error',
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
