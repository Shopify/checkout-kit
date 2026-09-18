import {createDebugLogger} from '../utils';

import {
  CheckoutProtocol,
  type CheckoutException,
  type ProtocolHandlers,
  type RenderStateChangeEvent,
} from '@shopify/checkout-kit-react-native';
import {Alert, Linking} from 'react-native';
import {useCart} from '../context/Cart';
import {
  checkoutErrorMessage,
  shouldReplaceCart,
} from '../checkout/checkoutErrorMessage';

interface EventHandlers {
  onFail?: (error: CheckoutException) => void;
  onCancel?: () => void;
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;
  onClickLink?: (url: string) => void;
}

export function useShopifyProtocolEventHandlers(
  name?: string,
  additionalHandlers: Partial<ProtocolHandlers> = {},
): ProtocolHandlers {
  const log = createDebugLogger(name ?? '');

  // Keep the sample subscribed to every public protocol event automatically.
  // When CheckoutProtocol grows, Object.values(...) includes the new method and
  // the sample starts logging it without needing a hand-written handler update.
  return Object.values(CheckoutProtocol).reduce<
    Record<string, (payload: unknown) => void>
  >((handlers, method) => {
    handlers[method] = payload => {
      log(method, payload);
      (
        additionalHandlers[method as keyof ProtocolHandlers] as
          | ((payload: unknown) => void)
          | undefined
      )?.(payload);
    };
    return handlers;
  }, {}) as ProtocolHandlers;
}

export function useShopifyEventHandlers(name?: string): EventHandlers {
  const log = createDebugLogger(name ?? '');
  const {clearCart} = useCart();

  return {
    onFail: error => {
      log('onFail', error);

      // Checkout Kit has ended its presentation. The host owns recovery: only
      // cart-terminal failures discard local cart state; other failures retain
      // it so the buyer can retry.
      if (shouldReplaceCart(error.code)) {
        clearCart();
      }

      Alert.alert('Checkout error', checkoutErrorMessage(error));
    },
    onCancel: () => {
      log('onCancel');
    },
    onRenderStateChange: event => {
      log('onRenderStateChange', event);
    },
    onClickLink: async url => {
      log('onClickLink', url);

      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      }
    },
  };
}
