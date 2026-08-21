import {
  CheckoutErrorCode,
  CheckoutException,
} from '@shopify/checkout-kit-react-native';

import {
  checkoutErrorMessage,
  shouldReplaceCart,
} from '../checkoutErrorMessage';

const CART_UNAVAILABLE =
  'Your cart is no longer available. Add items to a new cart to continue.';
const CUSTOMER_ACCOUNT_REQUIRED =
  'Sign in with a customer account to continue checkout.';
const STOREFRONT_PASSWORD_REQUIRED =
  'Checkout is currently unavailable because this storefront is password protected.';
const RETRY = 'Checkout was interrupted. Please try again.';
const WEB_VIEW_NOT_SUPPORTED = 'This device does not support embedded checkout.';
const GENERIC = 'Checkout is unavailable. Please try again.';

function checkoutException(
  code: CheckoutErrorCode,
  statusCode?: number,
): CheckoutException {
  return new CheckoutException({code, message: 'native diagnostic', statusCode});
}

const messagesByCode: Record<CheckoutErrorCode, string> = {
  [CheckoutErrorCode.storefrontPasswordRequired]: STOREFRONT_PASSWORD_REQUIRED,
  [CheckoutErrorCode.customerAccountRequired]: CUSTOMER_ACCOUNT_REQUIRED,
  [CheckoutErrorCode.cartExpired]: CART_UNAVAILABLE,
  [CheckoutErrorCode.cartCompleted]: CART_UNAVAILABLE,
  [CheckoutErrorCode.invalidCart]: CART_UNAVAILABLE,
  [CheckoutErrorCode.httpError]: GENERIC,
  [CheckoutErrorCode.networkError]: RETRY,
  [CheckoutErrorCode.webViewNotSupported]: WEB_VIEW_NOT_SUPPORTED,
  [CheckoutErrorCode.webContentProcessTerminated]: RETRY,
  [CheckoutErrorCode.sdkError]: GENERIC,
  [CheckoutErrorCode.unknown]: GENERIC,
};

const cartReplacementCodes = [
  CheckoutErrorCode.cartExpired,
  CheckoutErrorCode.cartCompleted,
  CheckoutErrorCode.invalidCart,
];

describe('checkoutErrorMessage', () => {
  it('covers every CheckoutErrorCode', () => {
    expect(Object.keys(messagesByCode).sort()).toEqual(
      Object.values(CheckoutErrorCode).sort(),
    );
  });

  it.each(
    Object.values(CheckoutErrorCode).map(
      code => [code, messagesByCode[code]] as const,
    ),
  )('maps %s to its buyer-facing message', (code, message) => {
    expect(checkoutErrorMessage(checkoutException(code))).toBe(message);
  });

  it('never returns the native diagnostic message', () => {
    Object.values(CheckoutErrorCode).forEach(code => {
      expect(checkoutErrorMessage(checkoutException(code))).not.toBe(
        'native diagnostic',
      );
    });
  });

  it.each([408, 429, 500, 503, 599])(
    'asks the buyer to retry an http error with status %s',
    statusCode => {
      expect(
        checkoutErrorMessage(
          checkoutException(CheckoutErrorCode.httpError, statusCode),
        ),
      ).toBe(RETRY);
    },
  );

  it.each([400, 403, 404, 409, 499, 600])(
    'returns the generic message for an http error with status %s',
    statusCode => {
      expect(
        checkoutErrorMessage(
          checkoutException(CheckoutErrorCode.httpError, statusCode),
        ),
      ).toBe(GENERIC);
    },
  );
});

describe('shouldReplaceCart', () => {
  it.each(cartReplacementCodes)('discards the cart for %s', code => {
    expect(shouldReplaceCart(code)).toBe(true);
  });

  it.each(
    Object.values(CheckoutErrorCode).filter(
      code => !cartReplacementCodes.includes(code),
    ),
  )('keeps the cart for %s', code => {
    expect(shouldReplaceCart(code)).toBe(false);
  });
});
