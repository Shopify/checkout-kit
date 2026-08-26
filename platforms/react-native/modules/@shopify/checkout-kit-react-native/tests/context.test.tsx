import React from 'react';
import {render, act} from '@testing-library/react-native';
import {Platform, TurboModuleRegistry} from 'react-native';
import {
  ShopifyCheckoutProvider,
  useShopifyCheckout,
} from '../src/context';
import {
  ApplePayContactField,
  CheckoutProtocol,
  ColorScheme,
  type Configuration,
} from '../src';
import {__resetPreloadForTests} from '../src/preload';

const checkoutUrl = 'https://shopify.com/checkout';
const config: Configuration = {
  colorScheme: ColorScheme.automatic,
};

jest.mock('react-native');

const NativeModule = TurboModuleRegistry.getEnforcing(
  'ShopifyCheckoutKit',
) as any;

const HookTestComponent = ({
  onHookValue,
}: {
  onHookValue: (value: any) => void;
}) => {
  const hookValue = useShopifyCheckout();
  onHookValue(hookValue);
  return null;
};

const MockChild = () => null;

describe('ShopifyCheckoutProvider', () => {
  const TestComponent = ({children}: {children: React.ReactNode}) => (
    <ShopifyCheckoutProvider configuration={config}>
      {children}
    </ShopifyCheckoutProvider>
  );

  afterEach(() => {
    __resetPreloadForTests();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const component = render(
      <TestComponent>
        <MockChild />
      </TestComponent>,
    );

    expect(component).toBeTruthy();
  });

  it('creates ShopifyCheckout instance with configuration', () => {
    render(
      <TestComponent>
        <MockChild />
      </TestComponent>,
    );

    expect(
      NativeModule.setConfig,
    ).toHaveBeenCalledWith(config);
  });

  it('skips configuration when no configuration is provided', () => {
    render(
      <ShopifyCheckoutProvider>
        <MockChild />
      </ShopifyCheckoutProvider>,
    );

    expect(
      NativeModule.setConfig,
    ).not.toHaveBeenCalled();
    expect(
      NativeModule.configureAcceleratedCheckouts,
    ).not.toHaveBeenCalled();
  });

  it('configures accelerated checkouts when provided', async () => {
    (Platform as any).Version = '17.0';
    (
      NativeModule.configureAcceleratedCheckouts as unknown as {
        mockReturnValue: any;
      }
    ).mockReturnValue(true);

    const configWithAccelerated: Configuration = {
      ...config,
      acceleratedCheckouts: {
        storefrontDomain: 'test-shop.myshopify.com',
        storefrontAccessToken: 'shpat_test_token',
        customer: {
          email: 'test@example.com',
          phoneNumber: '+123',
        },
        wallets: {
          applePay: {
            merchantIdentifier: 'merchant.test',
            contactFields: [ApplePayContactField.email],
          },
        },
      },
    };

    render(
      <ShopifyCheckoutProvider configuration={configWithAccelerated}>
        <MockChild />
      </ShopifyCheckoutProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      NativeModule.configureAcceleratedCheckouts,
    ).toHaveBeenCalledWith(
      'test-shop.myshopify.com',
      'shpat_test_token',
      'test@example.com',
      '+123',
      null,
      'merchant.test',
      ['email'],
      [],
    );
  });

  it('reuses the same instance across re-renders', () => {
    const {rerender} = render(
      <TestComponent>
        <MockChild />
      </TestComponent>,
    );

    rerender(
      <TestComponent>
        <MockChild />
      </TestComponent>,
    );

    expect(
      NativeModule.setConfig.mock.calls,
    ).toHaveLength(2);
  });
});

describe('useShopifyCheckout', () => {
  const Wrapper = ({children}: {children: React.ReactNode}) => (
    <ShopifyCheckoutProvider configuration={config}>
      {children}
    </ShopifyCheckoutProvider>
  );

  afterEach(() => {
    __resetPreloadForTests();
    jest.clearAllMocks();
  });

  it('provides present function and calls native present when no callbacks are passed', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.present(checkoutUrl);
    });

    expect(NativeModule.present).toHaveBeenCalledWith(
      checkoutUrl,
      [],
    );
  });

  it('subscribes to dispatch events when callbacks are supplied', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    const onClose = jest.fn();
    const onFail = jest.fn();
    const onGeolocationRequest = jest.fn();

    act(() => {
      hookValue.present(checkoutUrl, {onClose, onFail, onGeolocationRequest});
    });

    expect(NativeModule.onDispatch).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(NativeModule.present).toHaveBeenCalledWith(
      checkoutUrl,
      [],
    );
  });

  it('forwards protocol handlers through the provider present function', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.present(checkoutUrl, undefined, {
        [CheckoutProtocol.start]: jest.fn(),
      });
    });

    expect(NativeModule.onDispatch).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(NativeModule.present).toHaveBeenCalledWith(
      checkoutUrl,
      [CheckoutProtocol.start],
    );
  });

  it('does not call present with empty checkoutUrl', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.present('');
    });

    expect(
      NativeModule.present,
    ).not.toHaveBeenCalled();
  });

  it('provides preload function and forwards observation options', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    const onStateChange = jest.fn();
    let subscription: {state: unknown; remove(): void} | undefined;
    act(() => {
      subscription = hookValue.preload(checkoutUrl, {onStateChange});
    });

    expect(NativeModule.preload).toHaveBeenCalledWith(
      checkoutUrl,
      expect.any(String),
    );
    expect(subscription?.state).toEqual({type: 'idle'});
  });

  it('does not preload an empty checkout URL', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    let subscription;
    act(() => {
      subscription = hookValue.preload('');
    });

    expect(subscription).toBeUndefined();
    expect(NativeModule.preload).not.toHaveBeenCalled();
  });

  it('provides invalidate function', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.invalidate();
    });

    expect(NativeModule.invalidateCache).toHaveBeenCalled();
  });

  it('provides dismiss function', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.dismiss();
    });

    expect(NativeModule.dismiss).toHaveBeenCalled();
  });

  it('provides setConfig function', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    const newConfig = {colorScheme: ColorScheme.light};

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    act(() => {
      hookValue.setConfig(newConfig);
    });

    expect(
      NativeModule.setConfig,
    ).toHaveBeenCalledWith(newConfig);
  });

  it('provides getConfig function', async () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    const config = hookValue.getConfig();
    expect(config).toEqual({
      colorScheme: 'automatic',
      logLevel: 'error',
      preloading: true,
    });

    expect(NativeModule.getConfig).toHaveBeenCalled();
  });

  it('provides version from the instance', () => {
    let hookValue: any;
    const onHookValue = (value: any) => {
      hookValue = value;
    };

    render(
      <Wrapper>
        <HookTestComponent onHookValue={onHookValue} />
      </Wrapper>,
    );

    expect(hookValue.version).toBe('0.7.0');
  });

});

describe('ShopifyCheckoutContext without provider', () => {
  it('throws error when hook is used without provider', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<HookTestComponent onHookValue={() => {}} />);
    }).toThrow(
      'useShopifyCheckout must be used from within a ShopifyCheckoutContext',
    );

    errorSpy.mockRestore();
  });
});
