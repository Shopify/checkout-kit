/* eslint-disable no-new */
/* eslint-disable no-console */

import {
  DispatchEventParityError,
  LifecycleEventParseError,
  ShopifyCheckout,
  CheckoutErrorCode,
  CheckoutException,
  AcceleratedCheckoutWallet,
  RenderState,
  LogLevel,
  ColorScheme,
  type Configuration,
  type AcceleratedCheckoutConfiguration,
  type AcceleratedCheckoutCustomer,
} from '../src';
import {__resetDispatchEventParityForTests} from '../src/dispatch-events';
import {__resetPreloadForTests} from '../src/preload';
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

beforeEach(() => {
  // Parity verification is memoised per-process; reset it so each test
  // exercises a fresh check against whatever mock constants are in play.
  __resetDispatchEventParityForTests();
  NativeModule.getConstants.mockReturnValue({
    version: '0.7.0',
    dispatchEventTypes: [
      'start',
      'update',
      'complete',
      'dismiss',
      'fail',
      'linkClick',
      'geolocationRequest',
    ],
  });
});

describe('Type contracts', () => {
  it('rejects invalid AcceleratedCheckoutCustomer shapes at compile time', () => {
    const acceptsCustomer = (customer: AcceleratedCheckoutCustomer) => customer;
    const acceptsConfiguration = (configuration: Configuration) =>
      configuration;

    expect(acceptsCustomer({accessToken: 'customer-access-token'})).toEqual({
      accessToken: 'customer-access-token',
    });
    expect(
      acceptsCustomer({email: 'test@example.com', phoneNumber: '+1234567890'}),
    ).toEqual({email: 'test@example.com', phoneNumber: '+1234567890'});

    expect(
      acceptsConfiguration({
        telemetry: false,
      }).telemetry,
    ).toBe(false);

    expect(
      acceptsConfiguration({
        acceleratedCheckouts: {
          storefrontDomain: 'test-shop.myshopify.com',
          storefrontAccessToken: 'shpat_test_token',
          customer: {
            email: 'test@example.com',
            phoneNumber: '+1234567890',
          },
        },
      }).acceleratedCheckouts?.customer,
    ).toEqual({email: 'test@example.com', phoneNumber: '+1234567890'});

    expect(
      acceptsConfiguration({
        acceleratedCheckouts: {
          storefrontDomain: 'test-shop.myshopify.com',
          storefrontAccessToken: 'shpat_test_token',
          customer: {
            accessToken: 'customer-access-token',
          },
        },
      }).acceleratedCheckouts?.customer,
    ).toEqual({accessToken: 'customer-access-token'});

    // @ts-expect-error - accessToken cannot be mixed with contact fields.
    acceptsCustomer({
      accessToken: 'customer-access-token',
      email: 'test@example.com',
      phoneNumber: '+1234567890',
    });
  });
});

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
      expect(LogLevel.warn).toBe('warn');
      expect(LogLevel.error).toBe('error');
      expect(LogLevel.none).toBe('none');
    });

    it('exports every level the native SDKs support', () => {
      expect(Object.values(LogLevel)).toStrictEqual([
        'debug',
        'warn',
        'error',
        'none',
      ]);
    });
  });

  describe('ColorScheme enum', () => {
    it('exports every scheme both native bridges accept', () => {
      expect(Object.values(ColorScheme)).toStrictEqual([
        'automatic',
        'light',
        'dark',
        'storefront',
      ]);
    });
  });

  describe('CheckoutErrorCode enum', () => {
    it('exports current native checkout error codes', () => {
      expect(CheckoutErrorCode.customerAccountRequired).toBe(
        'customer_account_required',
      );
      expect(CheckoutErrorCode.networkError).toBe('network_error');
      expect(CheckoutErrorCode.webViewNotSupported).toBe(
        'web_view_not_supported',
      );
      expect(CheckoutErrorCode.webContentProcessTerminated).toBe(
        'web_content_process_terminated',
      );
      expect(CheckoutErrorCode.sdkError).toBe('sdk_error');
    });
  });
});

type Dispatch = (envelopeJson: string) => void;

function lastDispatch(): Dispatch {
  const dispatch = NativeModule.onDispatch.mock.calls[
    NativeModule.onDispatch.mock.calls.length - 1
  ]?.[0] as Dispatch | undefined;
  if (!dispatch) {
    throw new Error(
      'Expected the last present() call to subscribe to dispatch events',
    );
  }
  const requestId = NativeModule.present.mock.calls.at(-1)?.[1];
  return json => {
    let envelope;
    try {
      envelope = JSON.parse(json);
    } catch {
      return dispatch(json);
    }
    return dispatch(JSON.stringify({requestId, ...envelope}));
  };
}

type PreloadDispatch = (eventJson: string) => void;

function preloadDispatch(): PreloadDispatch {
  const dispatch = NativeModule.onPreloadStateChange.mock.calls[0]?.[0] as
    | PreloadDispatch
    | undefined;
  if (!dispatch) {
    throw new Error('Expected preload() to subscribe to preload state events');
  }
  const requestId = NativeModule.present.mock.calls.at(-1)?.[1];
  return json => {
    let envelope;
    try {
      envelope = JSON.parse(json);
    } catch {
      return dispatch(json);
    }
    return dispatch(JSON.stringify({requestId, ...envelope}));
  };
}

function preloadRequestId(call = 0): string {
  const requestId = NativeModule.preload.mock.calls[call]?.[1] as
    | string
    | undefined;
  if (!requestId) {
    throw new Error('Expected preload() to receive a request ID');
  }
  return requestId;
}

describe('ShopifyCheckoutKit', () => {
  afterEach(() => {
    __resetPreloadForTests();
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

    it('calls `setConfig` with preloading configuration', () => {
      const instance = new ShopifyCheckout();
      const configWithPreloading: Configuration = {
        colorScheme: ColorScheme.automatic,
        preloading: false,
      };
      instance.setConfig(configWithPreloading);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(configWithPreloading);
    });

    it('calls `setConfig` with title configuration', () => {
      const instance = new ShopifyCheckout();
      const configWithTitle: Configuration = {
        colorScheme: ColorScheme.automatic,
        title: 'Custom Checkout',
      };
      instance.setConfig(configWithTitle);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(configWithTitle);
    });

    it('calls `setConfig` with allowedMessageOrigins configuration', () => {
      const instance = new ShopifyCheckout();
      const configWithAllowedOrigins: Configuration = {
        colorScheme: ColorScheme.automatic,
        allowedMessageOrigins: ['https://example.com', 'https://*.example.com'],
      };
      instance.setConfig(configWithAllowedOrigins);
      expect(NativeModule.setConfig).toHaveBeenCalledWith(
        configWithAllowedOrigins,
      );
    });
  });

  describe('preload', () => {
    it('calls `preload` with a checkout URL', () => {
      const instance = new ShopifyCheckout();
      const subscription = instance.preload(checkoutUrl);

      expect(NativeModule.preload).toHaveBeenCalledTimes(1);
      expect(NativeModule.preload).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(String),
      );
      expect(subscription.state).toEqual({type: 'idle'});
    });

    it('delivers native preload state changes and updates the state snapshot', () => {
      const onStateChange = jest.fn();
      const instance = new ShopifyCheckout();
      const subscription = instance.preload(checkoutUrl, {onStateChange});
      const requestId = preloadRequestId();

      preloadDispatch()(JSON.stringify({requestId, type: 'loading'}));
      preloadDispatch()(JSON.stringify({requestId, type: 'ready'}));

      expect(onStateChange).toHaveBeenNthCalledWith(1, {type: 'loading'});
      expect(onStateChange).toHaveBeenNthCalledWith(2, {type: 'ready'});
      expect(subscription.state).toEqual({type: 'ready'});
    });

    it('normalizes preload failures with HTTP status codes', () => {
      const onStateChange = jest.fn();
      const instance = new ShopifyCheckout();
      const subscription = instance.preload(checkoutUrl, {onStateChange});

      preloadDispatch()(
        JSON.stringify({
          requestId: preloadRequestId(),
          type: 'failed',
          reason: 'httpError',
          statusCode: 503,
        }),
      );

      expect(onStateChange).toHaveBeenCalledWith({
        type: 'failed',
        reason: 'httpError',
        statusCode: 503,
      });
      expect(subscription.state).toEqual({
        type: 'failed',
        reason: 'httpError',
        statusCode: 503,
      });
    });

    it('normalizes unavailable web content preload failures', () => {
      const onStateChange = jest.fn();
      const instance = new ShopifyCheckout();
      const subscription = instance.preload(checkoutUrl, {onStateChange});

      preloadDispatch()(
        JSON.stringify({
          requestId: preloadRequestId(),
          type: 'failed',
          reason: 'webContentUnavailable',
        }),
      );

      expect(onStateChange).toHaveBeenCalledWith({
        type: 'failed',
        reason: 'webContentUnavailable',
      });
      expect(subscription.state).toEqual({
        type: 'failed',
        reason: 'webContentUnavailable',
      });
    });

    it('uses one native event subscription across repeated preload calls', () => {
      const firstOnStateChange = jest.fn();
      const secondOnStateChange = jest.fn();
      const instance = new ShopifyCheckout();

      instance.preload(checkoutUrl, {onStateChange: firstOnStateChange});
      const firstRequestId = preloadRequestId(0);
      instance.preload(checkoutUrl, {onStateChange: secondOnStateChange});
      const secondRequestId = preloadRequestId(1);

      preloadDispatch()(
        JSON.stringify({requestId: firstRequestId, type: 'ready'}),
      );
      preloadDispatch()(
        JSON.stringify({requestId: secondRequestId, type: 'ready'}),
      );

      expect(NativeModule.onPreloadStateChange).toHaveBeenCalledTimes(1);
      expect(firstOnStateChange).not.toHaveBeenCalled();
      expect(secondOnStateChange).toHaveBeenCalledWith({type: 'ready'});
    });

    it('stops delivering state changes after remove', () => {
      const onStateChange = jest.fn();
      const instance = new ShopifyCheckout();
      const subscription = instance.preload(checkoutUrl, {onStateChange});
      const requestId = preloadRequestId();

      subscription.remove();
      preloadDispatch()(JSON.stringify({requestId, type: 'ready'}));

      expect(onStateChange).not.toHaveBeenCalled();
      expect(subscription.state).toEqual({type: 'idle'});
    });
  });

  describe('invalidate', () => {
    it('calls `invalidateCache` on the Native Module', () => {
      const instance = new ShopifyCheckout();
      instance.invalidate();

      expect(NativeModule.invalidateCache).toHaveBeenCalledTimes(1);
    });
  });

  describe('present', () => {
    const checkout = {
      id: 'checkout-1',
      currency: 'USD',
      status: 'incomplete',
      line_items: [],
      links: [],
      totals: [],
    };

    it.each(['open', 'handled', 'cancel'] as const)(
      'passes the %s link policy and a session ID to native',
      linkAction => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl, {linkAction});
        expect(NativeModule.present).toHaveBeenCalledWith(
          checkoutUrl,
          expect.any(String),
          linkAction,
        );
      },
    );

    it('defaults to native link opening', () => {
      new ShopifyCheckout().present(checkoutUrl);
      expect(NativeModule.present).toHaveBeenCalledWith(
        checkoutUrl,
        expect.any(String),
        'open',
      );
    });

    it('delivers snapshots and keeps completion separate from dismissal', () => {
      const remove = jest.fn();
      NativeModule.onDispatch.mockReturnValueOnce({remove});
      const callbacks = {
        onStart: jest.fn(),
        onUpdate: jest.fn(),
        onComplete: jest.fn(),
        onDismiss: jest.fn(),
      };
      new ShopifyCheckout().present(checkoutUrl, callbacks);
      const dispatch = lastDispatch();
      for (const type of ['start', 'update', 'complete'])
        dispatch(JSON.stringify({type, payload: {checkout}}));
      for (const handler of [
        callbacks.onStart,
        callbacks.onUpdate,
        callbacks.onComplete,
      ]) {
        expect(handler).toHaveBeenCalledWith({
          checkout: {...checkout, lineItems: [], line_items: undefined},
        });
      }
      expect(remove).not.toHaveBeenCalled();
      expect(callbacks.onDismiss).not.toHaveBeenCalled();
      dispatch(JSON.stringify({type: 'dismiss'}));
      expect(callbacks.onDismiss).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledTimes(1);
      dispatch(JSON.stringify({type: 'dismiss'}));
      expect(callbacks.onDismiss).toHaveBeenCalledTimes(1);
    });

    it('delivers failure as an error event and releases the session', () => {
      const remove = jest.fn();
      NativeModule.onDispatch.mockReturnValueOnce({remove});
      const onFail = jest.fn();
      new ShopifyCheckout().present(checkoutUrl, {onFail});
      lastDispatch()(
        JSON.stringify({
          type: 'fail',
          payload: {
            error: {
              code: 'http_error',
              message: 'Unavailable',
              statusCode: 503,
            },
          },
        }),
      );
      const {error} = onFail.mock.calls[0][0];
      expect(error).toBeInstanceOf(CheckoutException);
      expect(error.code).toBe(CheckoutErrorCode.httpError);
      expect(error.statusCode).toBe(503);
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('delivers a link notification', () => {
      const onLinkClick = jest.fn();
      new ShopifyCheckout().present(checkoutUrl, {
        linkAction: 'handled',
        onLinkClick,
      });
      lastDispatch()(
        JSON.stringify({
          type: 'linkClick',
          payload: {url: 'https://example.test/policy'},
        }),
      );
      expect(onLinkClick).toHaveBeenCalledWith({
        url: 'https://example.test/policy',
      });
    });

    it('ignores queued events from earlier presentations', () => {
      const instance = new ShopifyCheckout();
      const first = jest.fn();
      const second = jest.fn();
      instance.present(checkoutUrl, {onDismiss: first});
      const oldDispatch = lastDispatch();
      const oldId = NativeModule.present.mock.calls.at(-1)[1];
      instance.present(checkoutUrl, {onDismiss: second});
      oldDispatch(JSON.stringify({type: 'dismiss'}));
      lastDispatch()(JSON.stringify({requestId: oldId, type: 'dismiss'}));
      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
      lastDispatch()(JSON.stringify({type: 'dismiss'}));
      expect(second).toHaveBeenCalledTimes(1);
    });

    it.each(['dismiss', 'fail'])(
      'allows presenting again inside the %s callback',
      type => {
        const instance = new ShopifyCheckout();
        const nextRemove = jest.fn();
        NativeModule.onDispatch
          .mockReturnValueOnce({remove: jest.fn()})
          .mockReturnValueOnce({remove: nextRemove});
        const nextDismiss = jest.fn();
        const again = () =>
          instance.present(checkoutUrl, {onDismiss: nextDismiss});
        instance.present(checkoutUrl, {onDismiss: again, onFail: again});
        lastDispatch()(
          JSON.stringify({
            type,
            payload: {error: {code: 'sdk_error', message: 'Failed'}},
          }),
        );
        expect(nextRemove).not.toHaveBeenCalled();
        lastDispatch()(JSON.stringify({type: 'dismiss'}));
        expect(nextDismiss).toHaveBeenCalledTimes(1);
      },
    );

    it('releases callbacks even if consumer code throws', () => {
      const remove = jest.fn();
      NativeModule.onDispatch.mockReturnValueOnce({remove});
      new ShopifyCheckout().present(checkoutUrl, {
        onDismiss: () => {
          throw new Error('consumer');
        },
      });
      expect(() => lastDispatch()(JSON.stringify({type: 'dismiss'}))).toThrow(
        'consumer',
      );
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it('keeps callbacks until native programmatic dismissal finishes', () => {
      const instance = new ShopifyCheckout();
      const onDismiss = jest.fn();
      instance.present(checkoutUrl, {onDismiss});
      instance.dismiss();
      expect(onDismiss).not.toHaveBeenCalled();
      lastDispatch()(JSON.stringify({type: 'dismiss'}));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('stops callbacks on teardown', () => {
      const instance = new ShopifyCheckout();
      const onDismiss = jest.fn();
      instance.present(checkoutUrl, {onDismiss});
      const dispatch = lastDispatch();
      instance.teardown();
      dispatch(JSON.stringify({type: 'dismiss'}));
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it.each([
      'not-json',
      '{}',
      JSON.stringify({type: 'start', payload: {checkout: {}}}),
      JSON.stringify({type: 'fail', payload: {}}),
    ])('logs malformed events without exposing their contents', json => {
      new ShopifyCheckout().present(checkoutUrl);
      lastDispatch()(json);
      expect(console.error).toHaveBeenCalledWith(
        expect.any(LifecycleEventParseError),
      );
    });

    it('rejects incompatible native lifecycle event sets', () => {
      NativeModule.getConstants.mockReturnValue({
        version: 'old',
        dispatchEventTypes: ['close', 'fail'],
      });
      expect(() => new ShopifyCheckout()).toThrow(DispatchEventParityError);
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
        preloading: true,
        telemetry: true,
      });
      expect(NativeModule.getConfig).toHaveBeenCalledTimes(1);
    });

    it('reports the native log level rather than a local default', () => {
      NativeModule.getConfig.mockReturnValueOnce({
        colorScheme: 'storefront',
        logLevel: 'warn',
        preloading: true,
      });

      const instance = new ShopifyCheckout();

      expect(instance.getConfig().logLevel).toBe(LogLevel.warn);
    });

    it('passes an unrecognised native value through untouched', () => {
      NativeModule.getConfig.mockReturnValueOnce({
        colorScheme: 'sepia',
        logLevel: 'trace',
        preloading: true,
      });

      const instance = new ShopifyCheckout();
      const result = instance.getConfig();

      expect(result.logLevel).toBe('trace');
      expect(result.colorScheme).toBe('sepia');
    });

    it('returns configured allowed message origins', () => {
      NativeModule.getConfig.mockReturnValueOnce({
        colorScheme: 'automatic',
        logLevel: 'error',
        preloading: true,
        allowedMessageOrigins: ['https://example.com'],
      });

      const instance = new ShopifyCheckout();

      expect(instance.getConfig()).toStrictEqual({
        colorScheme: ColorScheme.automatic,
        logLevel: LogLevel.error,
        preloading: true,
        allowedMessageOrigins: ['https://example.com'],
      });
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

      it('subscribes to dispatch events when the default handler is enabled, even without callbacks', () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(
          checkoutUrl,
          expect.any(String),
          'open',
        );
        expect(NativeModule.onDispatch).toHaveBeenCalledWith(
          expect.any(Function),
        );
      });

      it('can present when callbacks and default geolocation are disabled', () => {
        const instance = new ShopifyCheckout(undefined, {
          handleGeolocationRequests: false,
        });
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(
          checkoutUrl,
          expect.any(String),
          'open',
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

        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
          'android.permission.ACCESS_COARSE_LOCATION',
          'android.permission.ACCESS_FINE_LOCATION',
        ]);
        expect(NativeModule.respondToGeolocationRequest).toHaveBeenCalledWith(
          true,
          expect.any(String),
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
        expect(NativeModule.respondToGeolocationRequest).toHaveBeenCalledWith(
          false,
          expect.any(String),
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
          respond: expect.any(Function),
        });
        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(NativeModule.respondToGeolocationRequest).not.toHaveBeenCalled();
      });

      it('responds to the pending native geolocation request from the event', () => {
        const instance = new ShopifyCheckout();
        const onGeolocationRequest = jest.fn();
        instance.present(checkoutUrl, {onGeolocationRequest});
        lastDispatch()(geolocationEnvelope);

        const event = onGeolocationRequest.mock.calls[0][0];
        event.respond(true);

        expect(NativeModule.respondToGeolocationRequest).toHaveBeenCalledWith(
          true,
          expect.any(String),
        );
      });

      it('does not run the default handler when the feature is disabled', async () => {
        const instance = new ShopifyCheckout(undefined, {
          handleGeolocationRequests: false,
        });
        instance.present(checkoutUrl, {onDismiss: jest.fn()});
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(NativeModule.respondToGeolocationRequest).not.toHaveBeenCalled();
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

      it('presents with the default link policy on iOS', () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl);
        expect(NativeModule.present).toHaveBeenCalledWith(
          checkoutUrl,
          expect.any(String),
          'open',
        );
      });

      it('does not run the default geolocation handler on iOS even if dispatcher fires', async () => {
        const instance = new ShopifyCheckout();
        instance.present(checkoutUrl, {onDismiss: jest.fn()});
        lastDispatch()(geolocationEnvelope);
        await flush();

        expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
        expect(NativeModule.respondToGeolocationRequest).not.toHaveBeenCalled();
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
      it('calls native configureAcceleratedCheckouts with contact customer fields on iOS', async () => {
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
          null,
          'merchant.com.test',
          ['email', 'phone'],
          [],
        );
      });

      it('calls native configureAcceleratedCheckouts with authenticated customer access token on iOS', async () => {
        const instance = new ShopifyCheckout();
        NativeModule.configureAcceleratedCheckouts.mockReturnValue(true);

        const result = instance.configureAcceleratedCheckouts({
          ...acceleratedConfig,
          customer: {
            accessToken: 'customer-access-token',
          },
        });

        expect(result).toBe(true);
        expect(NativeModule.configureAcceleratedCheckouts).toHaveBeenCalledWith(
          'test-shop.myshopify.com',
          'shpat_test_token',
          null,
          null,
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

      it('validates mixed customer access token and contact fields', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig: AcceleratedCheckoutConfiguration = {
          ...acceleratedConfig,
          customer: {
            email: 'test@example.com',
            phoneNumber: '+1234567890',
            // @ts-expect-error - accessToken cannot be mixed with contact fields.
            accessToken: 'customer-access-token',
          },
        };

        const expectedError = new Error(
          '`customer` must contain either `accessToken` or both `email` and `phoneNumber`, but not both',
        );

        expect(instance.configureAcceleratedCheckouts(invalidConfig)).toBe(
          false,
        );
        expect(console.error).toHaveBeenCalledWith(
          '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
          expectedError,
        );
      });

      it('validates mixed customer fields by property presence', async () => {
        const instance = new ShopifyCheckout();
        const invalidConfig: AcceleratedCheckoutConfiguration = {
          ...acceleratedConfig,
          customer: {
            accessToken: '',
            // @ts-expect-error - accessToken cannot be mixed with contact fields.
            email: '',
            // @ts-expect-error - accessToken cannot be mixed with contact fields.
            phoneNumber: '',
          },
        };

        const expectedError = new Error(
          '`customer` must contain either `accessToken` or both `email` and `phoneNumber`, but not both',
        );

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
          null,
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
          null,
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
