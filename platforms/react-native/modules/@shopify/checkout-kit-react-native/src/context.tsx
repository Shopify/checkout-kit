import React, {useCallback, useMemo, useRef, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {ShopifyCheckout} from './index';
import type {
  CheckoutPreloadSubscription,
  Configuration,
  Features,
  PreloadOptions,
  PresentCallbacks,
} from './index.d';
import type {ProtocolHandlers} from './protocol';

type Maybe<T> = T | undefined;

interface Context {
  acceleratedCheckoutsAvailable: boolean;
  getConfig: () => Configuration | undefined;
  setConfig: (config: Configuration) => void;
  present: (
    checkoutUrl: string,
    callbacks?: PresentCallbacks,
    protocol?: ProtocolHandlers,
  ) => void;
  preload: (
    checkoutUrl: string,
    options?: PreloadOptions,
  ) => CheckoutPreloadSubscription;
  invalidate: () => void;
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

  useEffect(() => {
    if (!configuration) {
      return;
    }

    checkout.setConfig(configuration);
    setAcceleratedCheckoutsAvailable(checkout.acceleratedCheckoutsReady);
  }, [checkout, configuration]);

  const present = useCallback(
    (
      checkoutUrl: string,
      callbacks?: PresentCallbacks,
      protocol?: ProtocolHandlers,
    ) => {
      if (checkoutUrl) {
        checkout.present(checkoutUrl, callbacks, protocol);
      }
    },
    [checkout],
  );

  const preload = useCallback(
    (checkoutUrl: string, options?: PreloadOptions) =>
      checkout.preload(checkoutUrl, options),
    [checkout],
  );

  const invalidate = useCallback(() => {
    checkout.invalidate();
  }, [checkout]);

  const dismiss = useCallback(() => {
    checkout.dismiss();
  }, [checkout]);

  const setConfig = useCallback(
    (config: Configuration) => {
      checkout.setConfig(config);
    },
    [checkout],
  );

  const getConfig = useCallback(() => {
    return checkout.getConfig();
  }, [checkout]);

  const context = useMemo((): Context => {
    return {
      acceleratedCheckoutsAvailable,
      dismiss,
      invalidate,
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
    invalidate,
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
