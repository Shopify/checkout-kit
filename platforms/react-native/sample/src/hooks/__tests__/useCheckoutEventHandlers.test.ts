import {act, renderHook} from '@testing-library/react-native';
import {
  CheckoutErrorCode,
  CheckoutException,
} from '@shopify/checkout-kit-react-native';
import type {CheckoutCompleteEvent} from '@shopify/checkout-kit-react-native';
import {useShopifyEventHandlers} from '../useCheckoutEventHandlers';

jest.mock('../../utils', () => ({createDebugLogger: () => jest.fn()}));

describe('completed checkout cleanup', () => {
  const failure = {
    error: new CheckoutException({
      code: CheckoutErrorCode.sdkError,
      message: 'Failed',
    }),
  };

  it('clears a completed cart once on dismissal', () => {
    const clearCart = jest.fn();
    const {result} = renderHook(() =>
      useShopifyEventHandlers('test', clearCart),
    );
    act(() => result.current.onComplete?.({} as CheckoutCompleteEvent));
    expect(clearCart).not.toHaveBeenCalled();
    act(() => result.current.onDismiss?.());
    expect(clearCart).toHaveBeenCalledTimes(1);
    act(() => result.current.onDismiss?.());
    expect(clearCart).toHaveBeenCalledTimes(1);
  });

  it('waits for dismissal after a failure to clear a completed cart', () => {
    const clearCart = jest.fn();
    const {result} = renderHook(() =>
      useShopifyEventHandlers('test', clearCart),
    );
    act(() => result.current.onComplete?.({} as CheckoutCompleteEvent));
    act(() => result.current.onFail?.(failure));
    expect(clearCart).not.toHaveBeenCalled();
    act(() => result.current.onDismiss?.());
    expect(clearCart).toHaveBeenCalledTimes(1);
  });

  it('keeps an incomplete cart after failure', () => {
    const clearCart = jest.fn();
    const {result} = renderHook(() =>
      useShopifyEventHandlers('test', clearCart),
    );
    act(() => result.current.onFail?.(failure));
    expect(clearCart).not.toHaveBeenCalled();
  });
});
