import {useRef} from 'react';
import {createDebugLogger} from '../utils';
import type {
  CheckoutEventHandlers,
  RenderStateChangeEvent,
} from '@shopify/checkout-kit-react-native';

type EventHandlers = CheckoutEventHandlers & {
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;
};

export function useShopifyEventHandlers(
  name?: string,
  onCompletedCheckout?: () => void,
): EventHandlers {
  const log = createDebugLogger(name ?? '');
  const completed = useRef(false);
  const finishCheckout = () => {
    if (completed.current) {
      completed.current = false;
      onCompletedCheckout?.();
    }
  };
  return {
    onStart: () => {
      completed.current = false;
      log('onStart');
    },
    onUpdate: () => log('onUpdate'),
    onComplete: () => {
      completed.current = true;
      log('onComplete');
    },
    onFail: ({error}) => {
      log('onFail', error);
      finishCheckout();
    },
    onDismiss: () => {
      log('onDismiss');
      finishCheckout();
    },
    onRenderStateChange: event => log('onRenderStateChange', event),
  };
}
