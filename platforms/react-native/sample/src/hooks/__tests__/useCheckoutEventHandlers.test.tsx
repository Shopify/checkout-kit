import {renderHook} from '@testing-library/react-native';
import {Alert} from 'react-native';
import {
  CheckoutErrorCode,
  CheckoutException,
} from '@shopify/checkout-kit-react-native';

import {useShopifyEventHandlers} from '../useCheckoutEventHandlers';
import {useCart} from '../../context/Cart';

jest.mock('react-native');
jest.mock('../../context/Cart', () => ({useCart: jest.fn()}));

const mockedUseCart = jest.mocked(useCart);
const mockedAlert = jest.mocked(Alert.alert);

function checkoutException(
  code: CheckoutErrorCode,
  statusCode?: number,
): CheckoutException {
  return new CheckoutException({code, message: 'native diagnostic', statusCode});
}

function renderEventHandlers() {
  return renderHook(() => useShopifyEventHandlers('CheckoutTest')).result
    .current;
}

describe('useShopifyEventHandlers onFail', () => {
  let clearCart: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    clearCart = jest.fn();
    mockedUseCart.mockReturnValue({clearCart} as unknown as ReturnType<
      typeof useCart
    >);
  });

  it.each([
    CheckoutErrorCode.cartExpired,
    CheckoutErrorCode.cartCompleted,
    CheckoutErrorCode.invalidCart,
  ])('discards the cart for %s', code => {
    renderEventHandlers().onFail?.(checkoutException(code));

    expect(clearCart).toHaveBeenCalledTimes(1);
  });

  it.each([
    CheckoutErrorCode.networkError,
    CheckoutErrorCode.httpError,
    CheckoutErrorCode.storefrontPasswordRequired,
    CheckoutErrorCode.customerAccountRequired,
    CheckoutErrorCode.sdkError,
    CheckoutErrorCode.unknown,
  ])('keeps the cart for %s', code => {
    renderEventHandlers().onFail?.(checkoutException(code));

    expect(clearCart).not.toHaveBeenCalled();
  });

  it('alerts the buyer with the mapped message', () => {
    renderEventHandlers().onFail?.(
      checkoutException(CheckoutErrorCode.storefrontPasswordRequired),
    );

    expect(mockedAlert).toHaveBeenCalledWith(
      'Checkout error',
      'Checkout is currently unavailable because this storefront is password protected.',
    );
  });

  it('alerts the buyer with the retry message for a 503 http error', () => {
    renderEventHandlers().onFail?.(
      checkoutException(CheckoutErrorCode.httpError, 503),
    );

    expect(mockedAlert).toHaveBeenCalledWith(
      'Checkout error',
      'Checkout was interrupted. Please try again.',
    );
  });

  it.each(Object.values(CheckoutErrorCode))('alerts the buyer for %s', code => {
    renderEventHandlers().onFail?.(checkoutException(code));

    expect(mockedAlert).toHaveBeenCalledTimes(1);
  });

  it('never shows the native diagnostic message to the buyer', () => {
    renderEventHandlers().onFail?.(
      checkoutException(CheckoutErrorCode.sdkError),
    );

    expect(mockedAlert).not.toHaveBeenCalledWith(
      expect.anything(),
      'native diagnostic',
    );
  });
});
