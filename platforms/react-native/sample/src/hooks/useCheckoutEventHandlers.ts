import {useMemo} from 'react';

import {createDebugLogger} from '../utils';

import type {
  CheckoutException,
  RenderStateChangeEvent,
} from '@shopify/checkout-kit-react-native';
import {Linking} from 'react-native';

interface EventHandlers {
  onFail?: (error: CheckoutException) => void;
  onCancel?: () => void;
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;
  onClickLink?: (url: string) => void;
}

export function useShopifyEventHandlers(name?: string): EventHandlers {
  return useMemo(() => {
    const log = createDebugLogger(name ?? '');
    return {
      onFail: error => {
        log('onFail', error);
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
  }, [name]);
}
