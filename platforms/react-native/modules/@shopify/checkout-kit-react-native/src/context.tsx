import React, {useCallback, useMemo, useRef, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {ShopifyCheckout} from './index';
import type {Configuration, Features, PresentCallbacks} from './index.d';
import {formatLogPrefix} from './logging';
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

  useEffect(() => {
    if (!instance.current || !configuration) {
      return;
    }

    const customer = configuration.acceleratedCheckouts?.customer;
    if (customer?.accessToken && (customer?.email || customer?.phoneNumber)) {
      // eslint-disable-next-line no-console
      console.warn(
        `${formatLogPrefix('sdk')} Providing accessToken with contactFields (email / phoneNumber) is deprecated and will become an error in v4.` +
          'When the user is authenticated with Customer Accounts, provide accessToken' +
          'When the user is otherwise authenticated, provide email/phoneNumber.',
      );
    }

    instance.current.setConfig(configuration);
    setAcceleratedCheckoutsAvailable(
      instance.current.acceleratedCheckoutsReady,
    );
  }, [configuration]);

  const present = useCallback(
    (
      checkoutUrl: string,
      callbacks?: PresentCallbacks,
      protocol?: ProtocolHandlers,
    ) => {
      if (checkoutUrl) {
        instance.current?.present(checkoutUrl, callbacks, protocol);
      }
    },
    [],
  );

  const dismiss = useCallback(() => {
    instance.current?.dismiss();
  }, []);

  const setConfig = useCallback((config: Configuration) => {
    instance.current?.setConfig(config);
  }, []);

  const getConfig = useCallback(() => {
    return instance.current?.getConfig();
  }, []);

  const context = useMemo((): Context => {
    return {
      acceleratedCheckoutsAvailable,
      dismiss,
      setConfig,
      getConfig,
      present,
      version: instance.current?.version,
    };
  }, [acceleratedCheckoutsAvailable, dismiss, getConfig, setConfig, present]);

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
