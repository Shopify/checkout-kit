/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import React, {useCallback, useMemo, useRef, useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {ShopifyCheckout} from './index';
import type {Configuration, Features, PresentCallbacks} from './index.d';

type Maybe<T> = T | undefined;

interface Context {
  acceleratedCheckoutsAvailable: boolean;
  getConfig: () => Configuration | undefined;
  setConfig: (config: Configuration) => void;
  present: (checkoutUrl: string, callbacks?: PresentCallbacks) => void;
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
        '[ShopifyCheckoutKit] Providing accessToken with contactFields (email / phoneNumber) is deprecated and will become an error in v4.' +
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
    (checkoutUrl: string, callbacks?: PresentCallbacks) => {
      if (checkoutUrl) {
        instance.current?.present(checkoutUrl, callbacks);
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
