import React, {useCallback, useMemo, useRef, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {ShopifyCheckout} from './index';
import type {
  CheckoutPreloadSubscription,
  Configuration,
  Features,
  PreloadOptions,
  PresentCallbacks,
} from '@shopify/checkout-kit-react-native-core/contracts';

type Maybe<T> = T | undefined;

interface Context {
  acceleratedCheckoutsAvailable: boolean;
  getConfig: () => Configuration | undefined;
  setConfig: (config: Configuration) => Promise<Configuration>;
  present: (checkoutUrl: string, callbacks?: PresentCallbacks) => void;
  preload: (
    checkoutUrl: string,
    options?: PreloadOptions,
  ) => CheckoutPreloadSubscription | undefined;
  clearPreload: () => void;
  dismiss: () => void;
  version: Maybe<string>;
}

const ShopifyCheckoutContext = React.createContext<Context>(
  null as unknown as Context,
);

interface Props {
  features?: Partial<Features>;
  configuration?: Configuration;
}

export function ShopifyCheckoutProvider({
  features,
  configuration,
  children,
}: PropsWithChildren<Props>) {
  const [acceleratedCheckoutsAvailable, setAcceleratedCheckoutsAvailable] =
    useState(false);
  const instance = useRef<ShopifyCheckout | null>(null);

  if (!instance.current) {
    instance.current = new ShopifyCheckout(configuration, features);
  }
  const checkout = instance.current;
  // The constructor already applied the initial configuration.
  const lastAppliedConfiguration = useRef(configuration);

  useEffect(() => {
    if (!configuration) {
      return;
    }

    if (configuration !== lastAppliedConfiguration.current) {
      checkout.setConfig(configuration).catch(error => {
        // eslint-disable-next-line no-console
        console.error(
          '[ShopifyCheckoutKit] Failed to apply the configuration prop with',
          error,
        );
      });
      lastAppliedConfiguration.current = configuration;
    }

    setAcceleratedCheckoutsAvailable(checkout.acceleratedCheckoutsReady);
  }, [checkout, configuration]);

  const present = useCallback(
    (checkoutUrl: string, callbacks?: PresentCallbacks) => {
      if (checkoutUrl) {
        checkout.present(checkoutUrl, callbacks);
      }
    },
    [checkout],
  );

  const preload = useCallback(
    (checkoutUrl: string, options?: PreloadOptions) => {
      if (checkoutUrl) {
        return checkout.preload(checkoutUrl, options);
      }

      return undefined;
    },
    [checkout],
  );

  const clearPreload = useCallback(() => {
    checkout.clearPreload();
  }, [checkout]);

  const dismiss = useCallback(() => {
    checkout.dismiss();
  }, [checkout]);

  const setConfig = useCallback(
    (config: Configuration) => checkout.setConfig(config),
    [checkout],
  );

  const getConfig = useCallback(() => {
    return checkout.getConfig();
  }, [checkout]);

  const context = useMemo((): Context => {
    return {
      acceleratedCheckoutsAvailable,
      dismiss,
      clearPreload,
      setConfig,
      getConfig,
      present,
      preload,
      version: checkout.version,
    };
  }, [
    acceleratedCheckoutsAvailable,
    checkout,
    dismiss,
    getConfig,
    clearPreload,
    setConfig,
    present,
    preload,
  ]);

  return (
    <ShopifyCheckoutContext.Provider value={context}>
      {children}
    </ShopifyCheckoutContext.Provider>
  );
}

export function useShopifyCheckout() {
  const context = React.useContext(ShopifyCheckoutContext);
  if (!context) {
    throw new Error(
      'useShopifyCheckout must be used from within a ShopifyCheckoutContext',
    );
  }
  return context;
}

export default ShopifyCheckoutContext;
