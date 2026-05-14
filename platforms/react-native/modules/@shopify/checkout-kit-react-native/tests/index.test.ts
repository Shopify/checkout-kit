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

describe('ShopifyCheckoutKit', () => {
  // @ts-expect-error "eventEmitter is private"
  const eventEmitter = ShopifyCheckout.eventEmitter;

  afterEach(() => {
    NativeModule.setConfig.mockReset();
    jest.clearAllMocks();
  });

  describe('instantiation', () => {
    it('calls `setConfig` with the specified config on instantiation', () => {
      new ShopifyCheckout(config);
      expect(
        NativeModule.setConfig,
      ).toHaveBeenCalledWith(config);
    });

    it('does not call `setConfig` if no config was specified on instantiation', () => {
      new ShopifyCheckout();
      expect(
        NativeModule.setConfig,
      ).not.toHaveBeenCalled();
    });
  });

  describe('setConfig', () => {
    it('calls the `setConfig` on the Native Module', () => {
      const instance = new ShopifyCheckout();
      instance.setConfig(config);
      expect(
        NativeModule.setConfig,
      ).toHaveBeenCalledTimes(1);
      expect(
        NativeModule.setConfig,
      ).toHaveBeenCalledWith(config);
    });

    it('calls `setConfig` with logLevel configuration', () => {
      const instance = new ShopifyCheckout();
      const configWithLogLevel: Configuration = {
        colorScheme: ColorScheme.automatic,
        logLevel: LogLevel.debug,
      };
      instance.setConfig(configWithLogLevel);
      expect(
        NativeModule.setConfig,
      ).toHaveBeenCalledWith(configWithLogLevel);
    });
  });

  describe('preload', () => {
    it('calls `preload` with a checkout URL', () => {
      const instance = new ShopifyCheckout();
      instance.preload(checkoutUrl);
      expect(
        NativeModule.preload,
      ).toHaveBeenCalledTimes(1);
      expect(
        NativeModule.preload,
      ).toHaveBeenCalledWith(checkoutUrl);
    });
  });

  describe('invalidate', () => {
    it('calls `invalidateCache`', () => {
      const instance = new ShopifyCheckout();
      instance.invalidate();
      expect(
        NativeModule.invalidateCache,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('present', () => {
    it('calls `present` with the checkout URL and null callbacks when none are provided', () => {
      const instance = new ShopifyCheckout();
      instance.present(checkoutUrl);
      expect(NativeModule.present).toHaveBeenCalledTimes(1);
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        null,
        null,
        null,
      );
    });

    it('forwards the `onClose` callback to native and invokes the user handler when fired', () => {
      const instance = new ShopifyCheckout();
      const onClose = jest.fn();
      instance.present(checkoutUrl, {onClose});
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(Function),
        null,
        null,
      );
      const nativeOnClose = NativeModule.present.mock
        .calls[0][1] as () => void;
      nativeOnClose();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('forwards an `onFail` JSON wrapper to native when `onFail` is provided', () => {
      const instance = new ShopifyCheckout();
      const onFail = jest.fn();
      instance.present(checkoutUrl, {onFail});
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        null,
        expect.any(Function),
        null,
      );
    });

    it('forwards an `onGeolocationRequest` JSON wrapper to native when `onGeolocationRequest` is provided', () => {
      const instance = new ShopifyCheckout();
      const onGeolocationRequest = jest.fn();
      instance.present(checkoutUrl, {onGeolocationRequest});
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        null,
        null,
        expect.any(Function),
      );
    });

    describe('onGeolocationRequest callback', () => {
      it('parses the native JSON payload and surfaces the typed event to the consumer', () => {
        const instance = new ShopifyCheckout();
        const onGeolocationRequest = jest.fn();
        instance.present(checkoutUrl, {onGeolocationRequest});
        const nativeOnGeolocationRequest = NativeModule.present.mock
          .calls[0][3] as (raw: string) => void;
        nativeOnGeolocationRequest(
          JSON.stringify({origin: 'https://shopify.com'}),
        );
        expect(onGeolocationRequest).toHaveBeenCalledWith({
          origin: 'https://shopify.com',
        });
      });

      it('logs a LifecycleEventParseError and does not invoke `onGeolocationRequest` when payload is invalid JSON', () => {
        const instance = new ShopifyCheckout();
        const onGeolocationRequest = jest.fn();
        instance.present(checkoutUrl, {onGeolocationRequest});
        const nativeOnGeolocationRequest = NativeModule.present.mock
          .calls[0][3] as (raw: string) => void;
        nativeOnGeolocationRequest('not-json');
        expect(onGeolocationRequest).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          expect.any(LifecycleEventParseError),
          'not-json',
        );
      });
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
        `parses the native JSON payload into a typed CheckoutException ($error.__typename)`,
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
          const nativeOnFail = NativeModule.present.mock.calls[0][2] as (
            raw: string,
          ) => void;
          nativeOnFail(JSON.stringify(error));
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
        const nativeOnFail = NativeModule.present.mock.calls[0][2] as (
          raw: string,
        ) => void;
        nativeOnFail(JSON.stringify(error));
        const calledWith = onFail.mock.calls[0][0];
        expect(calledWith).toBeInstanceOf(GenericError);
      });

      it('logs a LifecycleEventParseError and does not invoke `onFail` when payload is invalid JSON', () => {
        const instance = new ShopifyCheckout();
        const onFail = jest.fn();
        instance.present(checkoutUrl, {onFail});
        const nativeOnFail = NativeModule.present.mock.calls[0][2] as (
          raw: string,
        ) => void;
        nativeOnFail('not-json');
        expect(onFail).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          expect.any(LifecycleEventParseError),
          'not-json',
        );
      });
    });
  });

  describe('dismiss', () => {
    it('calls `dismiss`', () => {
      const instance = new ShopifyCheckout();
      instance.dismiss();
      expect(
        NativeModule.dismiss,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('returns the parsed config from the Native Module', () => {
      const instance = new ShopifyCheckout();
      expect(instance.getConfig()).toStrictEqual({
        preloading: true,
        colorScheme: ColorScheme.automatic,
        logLevel: LogLevel.error,
      });
      expect(
        NativeModule.getConfig,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Geolocation', () => {
    const defaultConfig = {};

    async function emitGeolocationRequest() {
      await new Promise<void>(resolve => {
        eventEmitter.emit('geolocationRequest', {
          origin: 'https://shopify.com',
        });
        setTimeout(resolve);
      });
    }

    describe('Android', () => {
      const originalPlatform = Platform.OS;

      beforeEach(() => {
        Platform.OS = 'android';
      });

      afterAll(() => {
        Platform.OS = originalPlatform;
      });

      it('subscribes to geolocation requests on Android when feature is enabled', () => {
        new ShopifyCheckout(defaultConfig);

        expect(eventEmitter.addListener).toHaveBeenCalledWith(
          'geolocationRequest',
          expect.any(Function),
        );
      });

      it('does not subscribe to geolocation requests when feature is disabled', () => {
        new ShopifyCheckout(defaultConfig, {
          handleGeolocationRequests: false,
        });

        expect(eventEmitter.addListener).not.toHaveBeenCalledWith(
          'geolocationRequest',
          expect.any(Function),
        );
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

        new ShopifyCheckout();

        await emitGeolocationRequest();

        expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
        ]);
        expect(
          NativeModule.initiateGeolocationRequest,
        ).toHaveBeenCalledWith(true);
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

        new ShopifyCheckout();

        await emitGeolocationRequest();

        expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
        ]);
        expect(
          NativeModule.initiateGeolocationRequest,
        ).toHaveBeenCalledWith(false);
      });

      it('cleans up geolocation callback on teardown', () => {
        const sheet = new ShopifyCheckout();
        const mockRemove = jest.fn();

        // @ts-expect-error
        sheet.geolocationCallback = {
          remove: mockRemove,
        };

        sheet.teardown();

        expect(mockRemove).toHaveBeenCalled();
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

      it('does not subscribe to geolocation requests', () => {
        new ShopifyCheckout();

        expect(eventEmitter.addListener).not.toHaveBeenCalledWith(
          'geolocationRequest',
          expect.any(Function),
        );
      });

      it('does not call the native function, even if an event is emitted', async () => {
        new ShopifyCheckout();

        await emitGeolocationRequest();

        expect(
          NativeModule.initiateGeolocationRequest,
        ).not.toHaveBeenCalled();
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
        expect(
          NativeModule.configureAcceleratedCheckouts,
        ).toHaveBeenCalledWith(
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

        expect(
          NativeModule.configureAcceleratedCheckouts,
        ).toHaveBeenCalledWith(
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

        expect(
          instance.configureAcceleratedCheckouts(invalidConfig),
        ).toBe(false);
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

        expect(
          instance.configureAcceleratedCheckouts(invalidConfig),
        ).toBe(false);
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

        expect(
          instance.configureAcceleratedCheckouts(invalidConfig),
        ).toBe(false);
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

        expect(
          NativeModule.configureAcceleratedCheckouts,
        ).toHaveBeenCalledWith(
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

        expect(
          NativeModule.configureAcceleratedCheckouts,
        ).toHaveBeenCalledWith(
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
