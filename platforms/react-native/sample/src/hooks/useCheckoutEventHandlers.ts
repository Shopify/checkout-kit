import {useRef} from 'react';
import {createDebugLogger} from '../utils';
import type {
  CheckoutEventHandlers,
  RenderStateChangeEvent,
} from '@shopify/checkout-kit-react-native';
import {Linking} from 'react-native';

type EventHandlers = CheckoutEventHandlers & {
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;
};

export function useShopifyEventHandlers(
  name?: string,
  onCompletedDismiss?: () => void,
): EventHandlers {
  const log = createDebugLogger(name ?? '');
  const completed = useRef(false);
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
      completed.current = false;
      log('onFail', error);
    },
    onDismiss: () => {
      log('onDismiss');
      if (completed.current) {
        completed.current = false;
        onCompletedDismiss?.();
      }
    },
    onRenderStateChange: event => log('onRenderStateChange', event),
    linkAction: 'handled',
    onLinkClick: async ({url}) => {
      log('onLinkClick');
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    },
  };
}
