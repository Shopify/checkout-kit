/* eslint-disable no-new */
/* eslint-disable no-console */

import {
  LifecycleEventParseError,
  ShopifyCheckout,
  CheckoutErrorCode,
  InternalError,
  ConfigurationError,
  CheckoutHTTPError,
  CheckoutClientError,
  CheckoutExpiredError,
  GenericError,
  AcceleratedCheckoutWallet,
  RenderState,
  LogLevel,
  ColorScheme,
  CheckoutNativeErrorType,
  type Configuration,
  type AcceleratedCheckoutConfiguration,
} from '../src';
import type {ApplePayContactField} from '../src/index.d';
import {TurboModuleRegistry, PermissionsAndroid, Platform} from 'react-native';

const NativeModule = TurboModuleRegistry.getEnforcing(
  'ShopifyCheckoutKit',
) as any;

const checkoutUrl = 'https://shopify.com/checkout';
const config: Configuration = {
  colorScheme: ColorScheme.automatic,
};

jest.mock('react-native');

global.console = {
  ...global.console,
  error: jest.fn(),
  warn: jest.fn(),
};

describe('Exports', () => {
  describe('AcceleratedCheckoutWallet enum', () => {
    it('exports correct wallet types', () => {
      expect(AcceleratedCheckoutWallet.shopPay).toBe('shopPay');
      expect(AcceleratedCheckoutWallet.applePay).toBe('applePay');
    });
  });

  describe('RenderState enum', () => {
    it('exports correct render states', () => {
      expect(RenderState.Loading).toBe('loading');
      expect(RenderState.Rendered).toBe('rendered');
      expect(RenderState.Error).toBe('error');
    });
  });

  describe('LogLevel enum', () => {
    it('exports correct log levels', () => {
      expect(LogLevel.debug).toBe('debug');
      expect(LogLevel.error).toBe('error');
    });
  });
});

type Dispatch = (envelopeJson: string) => void;

function lastDispatch(): Dispatch {
  const dispatch = NativeModule.present.mock.calls[
    NativeModule.present.mock.calls.length - 1
  ][1] as Dispatch | null;
  if (!dispatch) {
    throw new Error(
      'Expected the last present() call to receive a non-null dispatcher',
    );
  }
  return dispatch;
}

describe('ShopifyCheckoutKit', () => {
  afterEach(() => {
    NativeModule.setConfig.mockReset();
    jest.clearAllMocks();
  });

  describe('instantiation', () => {
    it('calls `setConfig` with the specified config on instantiation', () => {
      new ShopifyCheckout(config);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(config);
    });

    it('does not call `setConfig` if no config was specified on instantiation', () => {
      new ShopifyCheckout();
      expect(NativeModule.setConfig).not.toHaveBeenCalled();
    });
  });

  describe('setConfig', () => {
    it('calls the `setConfig` on the Native Module', () => {
      const instance = new ShopifyCheckout();
      instance.setConfig(config);
      expect(NativeModule.setConfig).toHaveBeenCalledTimes(1);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(config);
    });

    it('calls `setConfig` with logLevel configuration', () => {
      const instance = new ShopifyCheckout();
      const configWithLogLevel: Configuration = {
        colorScheme: ColorScheme.automatic,
        logLevel: LogLevel.debug,
      };
      instance.setConfig(configWithLogLevel);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(configWithLogLevel);
    });
  });

  describe('present', () => {
    it('calls `present` with a null dispatcher when no callbacks are provided on iOS', () => {
      Platform.OS = 'ios';
      const instance = new ShopifyCheckout();
      instance.present(checkoutUrl);
      expect(NativeModule.present).toHaveBeenCalledTimes(1);
      expect(NativeModule.present).toHaveBeenCalledWith(checkoutUrl, null);
    });

    it('calls `present` with a dispatcher when callbacks are provided', () => {
      const instance = new ShopifyCheckout();
      instance.present(checkoutUrl, {onClose: jest.fn()});
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(Function),
      );
    });

    it('invokes `onClose` when the dispatcher receives a close envelope', () => {
      const instance = new ShopifyCheckout();
      const onClose = jest.fn();
      instance.present(checkoutUrl, {onClose});
<<<<<<< HEAD
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(Function),
        null,
        null,
      );
      const nativeOnClose = NativeModule.present.mock.calls[0][1] as () => void;
      nativeOnClose();
||||||| parent of 2b6a1474 (feat: explore dynamic dispatch for checkout delegate)
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(Function),
        null,
        null,
      );
      const nativeOnClose = NativeModule.present.mock
        .calls[0][1] as () => void;
      nativeOnClose();
=======
      lastDispatch()(JSON.stringify({type: 'close'}));
>>>>>>> 2b6a1474 (feat: explore dynamic dispatch for checkout delegate)
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores a close envelope when no `onClose` handler was provided', () => {
      const instance = new ShopifyCheckout();
      instance.present(checkoutUrl, {onFail: jest.fn()});
      expect(() => lastDispatch()(JSON.stringify({type: 'close'}))).not.toThrow();
    });

    describe('onFail callback', () => {
      const internalError = {
        __typename: CheckoutNativeErrorType.InternalError,
        message: 'Something went wrong',
        code: CheckoutErrorCode.unknown,
        recoverable: true,
      };

      const configError = {
        __typename: CheckoutNativeErrorType.ConfigurationError,
        message: 'Storefront Password Required',
        code: CheckoutErrorCode.storefrontPasswordRequired,
        recoverable: false,
      };

      const clientError = {
        __typename: CheckoutNativeErrorType.CheckoutClientError,
        message: 'Storefront Password Required',
        code: CheckoutErrorCode.storefrontPasswordRequired,
        recoverable: false,
      };

      const networkError = {
        __typename: CheckoutNativeErrorType.CheckoutHTTPError,
        message: 'Checkout not found',
        code: CheckoutErrorCode.httpError,
        statusCode: 400,
        recoverable: false,
      };

      const expiredError = {
        __typename: CheckoutNativeErrorType.CheckoutExpiredError,
        message: 'Customer Account Required',
        code: CheckoutErrorCode.cartExpired,
        recoverable: false,
      };

      it.each([
        {error: internalError, constructor: InternalError},
        {error: configError, constructor: ConfigurationError},
        {error: clientError, constructor: CheckoutClientError},
        {error: networkError, constructor: CheckoutHTTPError},
        {error: expiredError, constructor: CheckoutExpiredError},
      ])(
        `parses the fail envelope payload into a typed CheckoutException ($error.__typename)`,
        ({
          error,
          constructor,
        }: {
          error: any;
          constructor: new (...args: any[]) => any;
        }) => {
          const instance = new ShopifyCheckout();
          const onFail = jest.fn();
          instance.present(checkoutUrl, {onFail});
          lastDispatch()(JSON.stringify({type: 'fail', payload: error}));
          const calledWith = onFail.mock.calls[0][0];
          expect(calledWith).toBeInstanceOf(constructor);
          expect(calledWith).not.toHaveProperty('__typename');
          expect(calledWith).toHaveProperty('code');
          expect(calledWith).toHaveProperty('message');
          expect(calledWith).toHaveProperty('recoverable');
        },
      );

      it('falls back to GenericError when the payload has no recognised __typename', () => {
        const instance = new ShopifyCheckout();
        const onFail = jest.fn();
        instance.present(checkoutUrl, {onFail});
        const error = {
          __typename: 'UnknownError',
          message: 'Something went wrong',
        };
        lastDispatch()(JSON.stringify({type: 'fail', payload: error}));
        const calledWith = onFail.mock.calls[0][0];
        expect(calledWith).toBeInstanceOf(GenericError);
      });

      it('ignores a fail envelope when no `onFail` handler was provided', () => {
        const instance = new ShopifyCheckout();
        const onClose = jest.fn();
        instance.present(checkoutUrl, {onClose});
        expect(() =>
          lastDispatch()(
            JSON.stringify({type: 'fail', payload: internalError}),
          ),
        ).not.toThrow();
      });
    });

    describe('onGeolocationRequest callback', () => {
      it('parses the geolocationRequest envelope payload and surfaces the typed event', () => {
        const instance = new ShopifyCheckout();
        const onGeolocationRequest = jest.fn();
        instance.present(checkoutUrl, {onGeolocationRequest});
        lastDispatch()(
          JSON.stringify({
            type: 'geolocationRequest',
            payload: {origin: 'https://shopify.com'},
          }),
        );
        expect(onGeolocationRequest).toHaveBeenCalledWith({
          origin: 'https://shopify.com',
        });
      });
    });

    describe('envelope parsing', () => {
      it('logs a LifecycleEventParseError when the envelope is invalid JSON', () => {
        const instance = new ShopifyCheckout();
        const onClose = jest.fn();
        instance.present(checkoutUrl, {onClose});
        lastDispatch()('not-json');
        expect(onClose).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          expect.any(LifecycleEventParseError),
          'not-json',
        );
      });

      it('silently ignores envelopes with unknown `type` values', () => {
        const instance = new ShopifyCheckout();
        const onClose = jest.fn();
        const onFail = jest.fn();
        instance.present(checkoutUrl, {onClose, onFail});
        expect(() =>
          lastDispatch()(JSON.stringify({type: 'unknown', payload: {}})),
        ).not.toThrow();
        expect(onClose).not.toHaveBeenCalled();
        expect(onFail).not.toHaveBeenCalled();
      });
    });
  });

  describe('dismiss', () => {
    it('calls `dismiss`', () => {
      const instance = new ShopifyCheckout();
      instance.dismiss();
      expect(NativeModule.dismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('returns the parsed config from the Native Module', () => {
      const instance = new ShopifyCheckout();
      expect(instance.getConfig()).toStrictEqual({
        colorScheme: ColorScheme.automatic,
        logLevel: LogLevel.error,
      });
      expect(NativeModule.getConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('Geolocation', () => {
    const geolocationEnvelope = JSON.stringify({
      type: 'geolocationRequest',
      payload: {origin: 'https://shopify.com'},
    });

    async function flush() {
      await new Promise<void>(resolve => setTimeout(resolve));
    }

    describe('Android', () => {
      const originalPlatform = Platform.OS;

      beforeEach(() => {
        Platform.OS = 'android';
      });

      afterAll(() => {
        Platform.OS = originalPlatform;
      });

      it('passes a dispatcher when the default handler is enabled, even without callbacks', () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(
          checkoutUrl,
          expect.any(Function),
        );
      });

      it('passes a null dispatcher when no callbacks and the default handler is disabled', () => {
        const instance = new ShopifyCheckout(undefined, {
          handleGeolocationRequests: false,
        });
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(checkoutUrl, null);
      });

      it('handles geolocation permission grant correctly', async () => {
        const mockPermissions = {
          'android.permission.ACCESS_COARSE_LOCATION': 'granted',
          'android.permission.ACCESS_FINE_LOCATION': 'denied',
        };

        (
          PermissionsAndroid.requestMultiple as unknown as {
            mockResolvedValue: (v: any) => void;
          }
        ).mockResolvedValue(mockPermissions);

        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
        ]);
        expect(NativeModule.initiateGeolocationRequest).toHaveBeenCalledWith(
          true,
        );
      });

      it('handles geolocation permission denial correctly', async () => {
        const mockPermissions = {
          'android.permission.ACCESS_COARSE_LOCATION': 'denied',
          'android.permission.ACCESS_FINE_LOCATION': 'denied',
        };

        (
          PermissionsAndroid.requestMultiple as unknown as {
            mockResolvedValue: (v: any) => void;
          }
        ).mockResolvedValue(mockPermissions);

        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
        ]);
        expect(NativeModule.initiateGeolocationRequest).toHaveBeenCalledWith(
          false,
        );
      });

      it('prefers a per-call `onGeolocationRequest` handler over the default handler', async () => {
        const instance = new ShopifyCheckout();
        const onGeolocationRequest = jest.fn();
        instance.present(checkoutUrl, {onGeolocationRequest});
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(onGeolocationRequest).toHaveBeenCalledWith({
          origin: 'https://shopify.com',
        });
        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(
          NativeModule.initiateGeolocationRequest,
        ).not.toHaveBeenCalled();
      });

      it('does not run the default handler when the feature is disabled', async () => {
        const instance = new ShopifyCheckout(undefined, {
          handleGeolocationRequests: false,
        });
        instance.present(checkoutUrl, {onClose: jest.fn()});
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(
          NativeModule.initiateGeolocationRequest,
        ).not.toHaveBeenCalled();
      });
    });

    describe('iOS', () => {
      const originalPlatform = Platform.OS;

      beforeEach(() => {
        Platform.OS = 'ios';
      });

      afterAll(() => {
        Platform.OS = originalPlatform;
      });

      it('passes a null dispatcher by default — no default geolocation handling on iOS', () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(checkoutUrl, null);
      });

      it('does not run the default geolocation handler on iOS even if dispatcher fires', async () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl, {onClose: jest.fn()});
        lastDispatch()(geolocationEnvelope);
        await flush();

<<<<<<< HEAD
        expect(NativeModule.initiateGeolocationRequest).not.toHaveBeenCalled();
||||||| parent of 2b6a1474 (feat: explore dynamic dispatch for checkout delegate)
        expect(
          NativeModule.initiateGeolocationRequest,
        ).not.toHaveBeenCalled();
=======
        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(
          NativeModule.initiateGeolocationRequest,
        ).not.toHaveBeenCalled();
>>>>>>> 2b6a1474 (feat: explore dynamic dispatch for checkout delegate)
      });

      it('tears down gracefully', () => {
        const sheet = new ShopifyCheckout();

        expect(() => sheet.teardown()).not.toThrow();
      });
    });
  });

  describe('Feature Management', () => {
    it('returns true for undefined features (feature fallback)', () => {
      // Create instance without any features to test fallback
      const instance = new ShopifyCheckout(undefined, {});

      // Access private method via type assertion to test featureEnabled
      const featureEnabled = (instance as any).featureEnabled(
        'handleGeolocationRequests',
      );
      expect(featureEnabled).toBe(true);
    });

    it('returns false when feature is explicitly disabled', () => {
      // Create instance with feature explicitly disabled
      const instance = new ShopifyCheckout(undefined, {
        handleGeolocationRequests: false,
      });

      // Access private method via type assertion to test featureEnabled
      const featureEnabled = (instance as any).featureEnabled(
        'handleGeolocationRequests',
      );
      expect(featureEnabled).toBe(false);
    });

    it('returns true when feature is explicitly enabled', () => {
      // Create instance with feature explicitly enabled
      const instance = new ShopifyCheckout(undefined, {
        handleGeolocationRequests: true,
      });

      // Access private method via type assertion to test featureEnabled
      const featureEnabled = (instance as any).featureEnabled(
        'handleGeolocationRequests',
      );
      expect(featureEnabled).toBe(true);
    });
  });

  describe('LifecycleEventParseError', () => {
    it('creates error without Error.captureStackTrace', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;
      delete (Error as any).captureStackTrace;

      const error = new LifecycleEventParseError('test message');
      expect(error.name).toBe('LifecycleEventParseError');
      expect(error.message).toBe('test message');

      // Restore
      if (originalCaptureStackTrace) {
        Error.captureStackTrace = originalCaptureStackTrace;
      }
    });

    it('creates error with Error.captureStackTrace', () => {
      const mockCaptureStackTrace = jest.fn();
      Error.captureStackTrace = mockCaptureStackTrace;

      const error = new LifecycleEventParseError('test message');
      expect(error.name).toBe('LifecycleEventParseError');
      expect(mockCaptureStackTrace).toHaveBeenCalledWith(
        error,
        LifecycleEventParseError,
      );
    });
  });

  describe('Accelerated Checkout', () => {
    const acceleratedConfig: AcceleratedCheckoutConfiguration = {
      storefrontDomain: 'test-shop.myshopify.com',
      storefrontAccessToken: 'shpat_test_token',
      customer: {
        email: 'test@example.com',
        phoneNumber: '+1234567890',
        accessToken: 'customer-access-token',
      },
      wallets: {
        applePay: {
          contactFields: ['email', 'phone'] as ApplePayContactField[],
          merchantIdentifier: 'merchant.com.test',
        },
      },
    };

    beforeEach(() => {
      Platform.OS = 'ios';
      Platform.Version = '17.0';
      NativeModule.configureAcceleratedCheckouts.mockReset();
      NativeModule.isAcceleratedCheckoutAvailable.mockReset();
    });

    describe('configureAcceleratedCheckouts', () => {
      it('calls native configureAcceleratedCheckouts with correct parameters on iOS', async () => {
        const instance = new ShopifyCheckout();
        NativeModule.configureAcceleratedCheckouts.mockReturnValue(true);

        const result =
          instance.configureAcceleratedCheckouts(acceleratedConfig);

        expect(result).toBe(true);
        expect(NativeModule.configureAcceleratedCheckouts).toHaveBeenCalledWith(
          'test-shop.myshopify.com',
          'shpat_test_token',
          'test@example.com',
          '+1234567890',
          'customer-access-token',
          'merchant.com.test',
          ['email', 'phone'],
          [],
        );
      });

      it('calls native configureAcceleratedCheckouts with null customer data when not provided', async () => {
        const instance = new ShopifyCheckout();
        const minimalConfig = {
          storefrontDomain: 'test-shop.myshopify.com',
          storefrontAccessToken: 'shpat_test_token',
        };
        NativeModule.configureAcceleratedCheckouts.mockReturnValue(true);

        instance.configureAcceleratedCheckouts(minimalConfig);

        expect(NativeModule.configureAcceleratedCheckouts).toHaveBeenCalledWith(
          'test-shop.myshopify.com',
          'shpat_test_token',
          null,
          null,
          null,
          null,
          [],
          [],
        );
      });

      it('returns false on Android', async () => {
        Platform.OS = 'android';
        const instance = new ShopifyCheckout();

        const result =
          instance.configureAcceleratedCheckouts(acceleratedConfig);

        expect(result).toBe(false);
        expect(
          NativeModule.configureAcceleratedCheckouts,
        ).not.toHaveBeenCalled();
      });

      it('validates required storefrontDomain', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig = {
          ...acceleratedConfig,
          storefrontDomain: '',
        };
        const expectedError = new Error('`storefrontDomain` is required');

        expect(instance.configureAcceleratedCheckouts(invalidConfig)).toBe(
          false,
        );
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('validates required storefrontAccessToken', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig = {
          ...acceleratedConfig,
          storefrontAccessToken: '',
        };

        const expectedError = new Error('`storefrontAccessToken` is required');

        expect(instance.configureAcceleratedCheckouts(invalidConfig)).toBe(
          false,
        );
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('validates required merchantIdentifier when Apple Pay is configured', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig = {
          ...acceleratedConfig,
          wallets: {
            applePay: {
              contactFields: ['email'] as ApplePayContactField[],
              merchantIdentifier: '',
            },
          },
        };

        const expectedError = new Error(
          '`wallets.applePay.merchantIdentifier` is required',
        );

        expect(instance.configureAcceleratedCheckouts(invalidConfig)).toBe(
          false,
        );
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('validates required contactFields when Apple Pay is configured', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig = {
          ...acceleratedConfig,
          wallets: {
            applePay: {
              contactFields: ['invalid'],
              merchantIdentifier: 'merchant.test.com',
            },
          },
        };

        const expectedError = new Error(
          `'wallets.applePay.contactFields' contains unexpected values. Expected "email, phone", received "invalid"`,
        );

        expect(
          instance.configureAcceleratedCheckouts(invalidConfig as any),
        ).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('does not throw when Apple Pay wallet is not configured', () => {
        const instance = new ShopifyCheckout();
        const configWithoutApplePay = {
          storefrontDomain: 'test-shop.myshopify.com',
          storefrontAccessToken: 'shpat_test_token',
        };
        NativeModule.configureAcceleratedCheckouts.mockReturnValue(true);

        expect(
          instance.configureAcceleratedCheckouts(configWithoutApplePay),
        ).toBe(true);
      });

      it('throws when a non-string value is given for supportedShippingCountries', () => {
        const instance = new ShopifyCheckout();
        const invalidConfig = {
          ...acceleratedConfig,
          wallets: {
            applePay: {
              contactFields: [],
              merchantIdentifier: 'merchant.test.com',
              supportedShippingCountries: [NaN],
            },
          },
        };

        const expectedError = new Error(
          `'wallets.applePay.supportedShippingCountries' contains unexpected values. Expects ISO 3166-1 alpha-2 country codes (e.g., "US", "CA", "GB").`,
        );

        expect(
          instance.configureAcceleratedCheckouts(invalidConfig as any),
        ).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('calls configureAcceleratedCheckouts with an empty array for supportShippingCountries when omitted', async () => {
        const instance = new ShopifyCheckout();

        instance.configureAcceleratedCheckouts({
          ...acceleratedConfig,
          wallets: {
            applePay: {
              contactFields: [],
              merchantIdentifier: 'merchant.test.com',
            },
          },
        });

        expect(NativeModule.configureAcceleratedCheckouts).toHaveBeenCalledWith(
          'test-shop.myshopify.com',
          'shpat_test_token',
          'test@example.com',
          '+1234567890',
          'customer-access-token',
          'merchant.test.com',
          [],
          [],
        );
      });

      it('calls configureAcceleratedCheckouts with supportShippingCountries when given', async () => {
        const instance = new ShopifyCheckout();

        instance.configureAcceleratedCheckouts({
          ...acceleratedConfig,
          wallets: {
            applePay: {
              contactFields: [],
              merchantIdentifier: 'merchant.test.com',
              supportedShippingCountries: ['IE', 'CA'],
            },
          },
        });

        expect(NativeModule.configureAcceleratedCheckouts).toHaveBeenCalledWith(
          'test-shop.myshopify.com',
          'shpat_test_token',
          'test@example.com',
          '+1234567890',
          'customer-access-token',
          'merchant.test.com',
          [],
          ['IE', 'CA'],
        );
      });
    });

    describe('isAcceleratedCheckoutAvailable', () => {
      it('calls native isAcceleratedCheckoutAvailable on iOS', () => {
        const instance = new ShopifyCheckout();
        NativeModule.isAcceleratedCheckoutAvailable.mockReturnValue(true);

        const result = instance.isAcceleratedCheckoutAvailable();

        expect(result).toBe(true);
        expect(
          NativeModule.isAcceleratedCheckoutAvailable,
        ).toHaveBeenCalledTimes(1);
      });

      it('returns false on Android', () => {
        Platform.OS = 'android';
        const instance = new ShopifyCheckout();

        const result = instance.isAcceleratedCheckoutAvailable();

        expect(result).toBe(false);
        expect(
          NativeModule.isAcceleratedCheckoutAvailable,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
