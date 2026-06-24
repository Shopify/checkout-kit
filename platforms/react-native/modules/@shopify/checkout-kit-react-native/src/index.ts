import {PermissionsAndroid, Platform} from 'react-native';
import type {PermissionStatus} from 'react-native';
import RNShopifyCheckoutKit from './specs/NativeShopifyCheckoutKit';
import {ShopifyCheckoutProvider, useShopifyCheckout} from './context';
import {ApplePayContactField, ColorScheme, LogLevel} from './enums';
import {
  DispatchEventParityError,
  verifyDispatchEventParity,
} from './dispatch-events';
import {coerceConfigurationResult} from './configuration';
import {
  createPresentDispatcher,
  LifecycleEventParseError,
} from './present-dispatcher';
import type {
  AcceleratedCheckoutConfiguration,
  AcceleratedCheckoutCustomer,
  AndroidAutomaticColors,
  AndroidColors,
  Configuration,
  Features,
  GeolocationRequestEvent,
  IosColors,
  PresentCallbacks,
  ShopifyCheckoutKit,
} from './index.d';
import {AcceleratedCheckoutWallet} from './enums';
import type {CheckoutException} from './errors';
import {
  CheckoutExpiredError,
  CheckoutClientError,
  CheckoutHTTPError,
  ConfigurationError,
  InternalError,
  CheckoutNativeErrorType,
  GenericError,
} from './errors';
import {CheckoutErrorCode} from './errors';
import {
  ApplePayLabel,
  ApplePayStyle,
} from './components/AcceleratedCheckoutButtons';
import type {
  AcceleratedCheckoutButtonsProps,
  RenderStateChangeEvent,
} from './components/AcceleratedCheckoutButtons';
import {CheckoutProtocol} from './protocol';
import type {
  Checkout,
  CheckoutProtocolPayloads,
  ErrorResponse,
  ProtocolHandlers,
} from './protocol';

const defaultFeatures: Features = {
  handleGeolocationRequests: true,
};

class ShopifyCheckout implements ShopifyCheckoutKit {
  private features: Features;

  private dispatchSubscription?: {remove: () => void};

  private _acceleratedCheckoutsReady = false;

  // TurboModule constants are immutable for the lifetime of the process —
  // capture once so `version` (and any future constants) can be read without
  // re-crossing the JSI boundary on every access. Reading them here is also
  // the moment we verify that the JS and native dispatch contracts agree.
  private readonly constants = RNShopifyCheckoutKit.getConstants();

  public get acceleratedCheckoutsReady(): boolean {
    return this._acceleratedCheckoutsReady;
  }

  public get version(): string {
    return this.constants.version;
  }

  /**
   * Initializes a new ShopifyCheckout instance
   * @param configuration Optional configuration settings for the checkout
   * @param features Optional feature flags to customize behavior, defaults to defaultFeatures
   */
  constructor(
    configuration?: Configuration,
    features: Partial<Features> = defaultFeatures,
  ) {
    // Fail fast if the bundled native module disagrees with this JS
    // package about which SDK lifecycle events exist. Memoised, so this
    // is a one-time cost per JS process.
    verifyDispatchEventParity(this.constants.dispatchEventTypes);

    this.features = {...defaultFeatures, ...features};

    if (configuration != null) {
      this.setConfig(configuration);
    }
  }

  /**
   * Dismisses the currently displayed checkout sheet
   */
  public dismiss(): void {
    this.releaseDispatchSubscription();
    RNShopifyCheckoutKit.dismiss();
  }

  /**
   * Clears any checkout cached by preload calls.
   */
  public invalidate(): void {
    RNShopifyCheckoutKit.invalidateCache();
  }

  /**
   * Preloads checkout for a given URL to improve presentation performance.
   * @param checkoutUrl The URL of the checkout to preload
   */
  public preload(checkoutUrl: string): void {
    RNShopifyCheckoutKit.preload(checkoutUrl);
  }

  /**
   * Presents the checkout sheet for a given checkout URL.
   *
   * Exactly one of `callbacks.onClose` or `callbacks.onFail` fires per
   * call, after which the per-presentation dispatch subscription is released.
   *
   * @param checkoutUrl The URL of the checkout to display
   * @param callbacks Optional per-call SDK callbacks
   */
  public present(
    checkoutUrl: string,
    callbacks?: PresentCallbacks,
    protocol?: ProtocolHandlers,
  ): void {
    this.releaseDispatchSubscription();

    const {dispatcher, subscribedMethods} = createPresentDispatcher({
      callbacks,
      protocol,
      handleDefaultGeolocationRequests: this.featureEnabled(
        'handleGeolocationRequests',
      ),
      handleDefaultGeolocationRequest: () =>
        this.handleDefaultGeolocationRequest(),
      respondToGeolocationRequest: allow =>
        this.respondToGeolocationRequest(allow),
    });

    if (dispatcher) {
      this.dispatchSubscription = RNShopifyCheckoutKit.onDispatch(
        envelopeJson => {
          const result = dispatcher(envelopeJson);
          if (result.terminal) {
            this.releaseDispatchSubscription();
          }
        },
      );
    }

    RNShopifyCheckoutKit.present(checkoutUrl, subscribedMethods);
  }

  /**
   * Retrieves the current checkout configuration
   * @returns The current Configuration
   */
  public getConfig(): Configuration {
    return coerceConfigurationResult(RNShopifyCheckoutKit.getConfig());
  }

  /**
   * Updates the checkout configuration
   * @param configuration New configuration settings to apply
   */
  public setConfig(configuration: Configuration): void {
    if (configuration.acceleratedCheckouts) {
      this._acceleratedCheckoutsReady = this.configureAcceleratedCheckouts(
        configuration.acceleratedCheckouts,
      );
    }
    RNShopifyCheckoutKit.setConfig(configuration);
  }

  /**
   * Cleans up resources and event listeners used by the checkout sheet.
   * Currently a no-op — retained as part of the public API for forward
   * compatibility with future protocol-client subscriptions.
   */
  public teardown() {
    this.releaseDispatchSubscription();
  }

  /**
   * Configure AcceleratedCheckouts for Shop Pay and Apple Pay buttons
   * @param config Configuration for AcceleratedCheckouts
   */
  public configureAcceleratedCheckouts(
    config: AcceleratedCheckoutConfiguration,
  ): boolean {
    if (!this.acceleratedCheckoutsSupported) {
      return false;
    }

    try {
      this.validateAcceleratedCheckoutsConfiguration(config);

      return RNShopifyCheckoutKit.configureAcceleratedCheckouts(
        config.storefrontDomain,
        config.storefrontAccessToken,
        config.customer?.email || null,
        config.customer?.phoneNumber || null,
        config.customer?.accessToken || null,
        config.wallets?.applePay?.merchantIdentifier || null,
        config.wallets?.applePay?.contactFields || [],
        config.wallets?.applePay?.supportedShippingCountries || [],
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '[ShopifyCheckoutKit] Failed to configure accelerated checkouts with',
        error,
      );
      return false;
    }
  }

  /**
   * Check if accelerated checkout is available for the given cart or product
   * @returns boolean indicating availability
   */
  public isAcceleratedCheckoutAvailable(): boolean {
    if (!this.acceleratedCheckoutsSupported) {
      return false;
    }

    return RNShopifyCheckoutKit.isAcceleratedCheckoutAvailable();
  }

  // --- private

  /**
   * Accelerated Checkouts is only supported from iOS 16.0 onwards
   */
  private get acceleratedCheckoutsSupported(): boolean {
    return Platform.OS === 'ios' && this.majorVersion >= 16;
  }

  private get majorVersion(): number {
    return parseInt(String(Platform.Version), 10);
  }

  private validateAcceleratedCheckoutsConfiguration(
    acceleratedCheckouts: Configuration['acceleratedCheckouts'],
  ) {
    if (!acceleratedCheckouts) {
      return;
    }

    const {storefrontDomain, storefrontAccessToken, customer, wallets} =
      acceleratedCheckouts;

    /**
     * Required Accelerated Checkouts configuration properties
     */
    if (!storefrontDomain) {
      throw new Error('`storefrontDomain` is required');
    }
    if (!storefrontAccessToken) {
      throw new Error('`storefrontAccessToken` is required');
    }

    if (customer) {
      const hasAccessToken = Object.prototype.hasOwnProperty.call(
        customer,
        'accessToken',
      );
      const hasEmail = Object.prototype.hasOwnProperty.call(customer, 'email');
      const hasPhoneNumber = Object.prototype.hasOwnProperty.call(
        customer,
        'phoneNumber',
      );

      if (hasAccessToken && (hasEmail || hasPhoneNumber)) {
        throw new Error(
          '`customer` must contain either `accessToken` or both `email` and `phoneNumber`, but not both',
        );
      }
    }

    /**
     * Validate Apple Pay config if available
     */
    if (wallets?.applePay) {
      const {merchantIdentifier, contactFields, supportedShippingCountries} =
        wallets.applePay;

      if (!merchantIdentifier) {
        throw new Error('`wallets.applePay.merchantIdentifier` is required');
      }

      const expectedContactFields = Object.values(ApplePayContactField);
      const hasInvalidContactFields =
        Array.isArray(contactFields) &&
        contactFields.some(
          value =>
            !expectedContactFields.includes(
              value.toLowerCase() as ApplePayContactField,
            ),
        );

      if (hasInvalidContactFields) {
        throw new Error(
          `'wallets.applePay.contactFields' contains unexpected values. Expected "${expectedContactFields.join(', ')}", received "${contactFields}"`,
        );
      }

      if (
        Array.isArray(supportedShippingCountries) &&
        supportedShippingCountries?.some(country => typeof country !== 'string')
      ) {
        throw new Error(
          `'wallets.applePay.supportedShippingCountries' contains unexpected values. Expects ISO 3166-1 alpha-2 country codes (e.g., "US", "CA", "GB").`,
        );
      }
    }
  }

  /**
   * Checks if a specific feature is enabled in the configuration
   * @param feature The feature to check
   * @returns boolean indicating if the feature is enabled
   */
  private featureEnabled(feature: keyof Features) {
    return this.features[feature] ?? true;
  }

  private releaseDispatchSubscription(): void {
    this.dispatchSubscription?.remove();
    this.dispatchSubscription = undefined;
  }

  /**
   * Resolves the pending Android WebView geolocation permission request.
   * This does not request OS location permissions; callers should check
   * or request Android permissions before responding.
   */
  private respondToGeolocationRequest(allow: boolean): void {
    if (Platform.OS === 'android') {
      RNShopifyCheckoutKit.respondToGeolocationRequest?.(allow);
    }
  }

  /**
   * Default Android geolocation handler — requests platform permissions
   * and forwards the resolved grant state back to the native SDK.
   */
  private async handleDefaultGeolocationRequest() {
    const allowed = await this.requestGeolocation();
    this.respondToGeolocationRequest(allowed);
  }

  /**
   * Requests geolocation permissions on Android
   * @returns Promise<boolean> indicating if permission was granted
   */
  private async requestGeolocation(): Promise<boolean> {
    const coarse = 'android.permission.ACCESS_COARSE_LOCATION';
    const fine = 'android.permission.ACCESS_FINE_LOCATION';
    const results = await PermissionsAndroid.requestMultiple([coarse, fine]);

    return [results[coarse], results[fine]].some(this.permissionGranted);
  }

  /**
   * Checks if the given permission status indicates that permission was granted
   * @param status The permission status to check
   * @returns boolean indicating if the permission was granted
   */
  private permissionGranted(status: PermissionStatus): boolean {
    return status === 'granted';
  }

}

// API
export {
  AcceleratedCheckoutWallet,
  ApplePayContactField,
  ApplePayLabel,
  ApplePayStyle,
  CheckoutProtocol,
  ColorScheme,
  DispatchEventParityError,
  LifecycleEventParseError,
  LogLevel,
  ShopifyCheckout,
  ShopifyCheckoutProvider,
  useShopifyCheckout,
};

// Error classes
export {
  CheckoutClientError,
  CheckoutErrorCode,
  CheckoutExpiredError,
  CheckoutHTTPError,
  CheckoutNativeErrorType,
  ConfigurationError,
  GenericError,
  InternalError,
};

// Types
export type {
  AcceleratedCheckoutButtonsProps,
  AcceleratedCheckoutConfiguration,
  AcceleratedCheckoutCustomer,
  AndroidAutomaticColors,
  AndroidColors,
  Checkout,
  CheckoutException,
  CheckoutProtocolPayloads,
  Configuration,
  ErrorResponse,
  Features,
  GeolocationRequestEvent,
  IosColors,
  PresentCallbacks,
  ProtocolHandlers,
  RenderStateChangeEvent,
};

// Components
export {
  AcceleratedCheckoutButtons,
  RenderState,
} from './components/AcceleratedCheckoutButtons';
