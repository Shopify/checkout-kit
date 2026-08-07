import {
  CheckoutErrorCode,
  type CheckoutException,
} from '@shopify/checkout-kit-react-native';

const CART_UNAVAILABLE =
  'Your cart is no longer available. Add items to a new cart to continue.';
const CUSTOMER_ACCOUNT_REQUIRED =
  'Sign in with a customer account to continue checkout.';
const STOREFRONT_PASSWORD_REQUIRED =
  'Checkout is currently unavailable because this storefront is password protected.';
const RETRY = 'Checkout was interrupted. Please try again.';
const WEB_VIEW_NOT_SUPPORTED = 'This device does not support embedded checkout.';
const GENERIC = 'Checkout is unavailable. Please try again.';

const HTTP_STATUS_REQUEST_TIMEOUT = 408;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_SERVER_ERROR_MIN = 500;
const HTTP_STATUS_SERVER_ERROR_MAX = 599;

const cartReplacementErrorCodes: CheckoutErrorCode[] = [
  CheckoutErrorCode.cartExpired,
  CheckoutErrorCode.cartCompleted,
  CheckoutErrorCode.invalidCart,
];

export function shouldReplaceCart(code: CheckoutErrorCode): boolean {
  return cartReplacementErrorCodes.includes(code);
}

function isRetryableHttpStatus(statusCode: number | undefined): boolean {
  if (statusCode === undefined) {
    return false;
  }

  return (
    statusCode === HTTP_STATUS_REQUEST_TIMEOUT ||
    statusCode === HTTP_STATUS_TOO_MANY_REQUESTS ||
    (statusCode >= HTTP_STATUS_SERVER_ERROR_MIN &&
      statusCode <= HTTP_STATUS_SERVER_ERROR_MAX)
  );
}

export function checkoutErrorMessage(error: CheckoutException): string {
  switch (error.code) {
    case CheckoutErrorCode.cartExpired:
    case CheckoutErrorCode.cartCompleted:
    case CheckoutErrorCode.invalidCart:
      return CART_UNAVAILABLE;
    case CheckoutErrorCode.customerAccountRequired:
      return CUSTOMER_ACCOUNT_REQUIRED;
    case CheckoutErrorCode.storefrontPasswordRequired:
      return STOREFRONT_PASSWORD_REQUIRED;
    case CheckoutErrorCode.networkError:
    case CheckoutErrorCode.webContentProcessTerminated:
      return RETRY;
    case CheckoutErrorCode.webViewNotSupported:
      return WEB_VIEW_NOT_SUPPORTED;
    case CheckoutErrorCode.httpError:
      return isRetryableHttpStatus(error.statusCode) ? RETRY : GENERIC;
    case CheckoutErrorCode.sdkError:
    case CheckoutErrorCode.unknown:
      return GENERIC;
  }
}
