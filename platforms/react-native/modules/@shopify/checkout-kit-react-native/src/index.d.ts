import type {CheckoutException} from './errors';
import type {ProtocolHandlers} from './protocol';
import type {ApplePayContactField, ColorScheme, LogLevel} from './enums';
export {
  AcceleratedCheckoutWallet,
  ApplePayContactField,
  ColorScheme,
  LogLevel,
} from './enums';
export type {
  Checkout,
  CheckoutProtocolPayloads,
  ErrorResponse,
  ProtocolHandlers,
} from './protocol';

export type Maybe<T> = T | undefined;

/**
 * Configuration options for Checkout Kit features
 */
export interface Features {
  /**
   * When enabled, checkout handles Android geolocation permission requests internally.
   * If disabled, applications must pass an `onGeolocationRequest` callback to
   * `present()` and resolve each request with `event.respond(allow)`.
   */
  handleGeolocationRequests: boolean;
}

export interface IosColors {
  /**
   * A HEX color value for customizing the color of the progress bar.
   */
  tintColor?: string;
  /**
   * A HEX color value for customizing the background color of the webview.
   */
  backgroundColor?: string;
  /**
   * A HEX color value for customizing the color of the close button.
   */
  closeButtonColor?: string;
}

export interface AndroidColors {
  /**
   * A HEX color value for customizing the color of the progress bar.
   */
  progressIndicator: string;
  /**
   * A HEX color value for customizing the background color of the webview.
   */
  backgroundColor: string;
  /**
   * A HEX color value for customizing the background color of the webview header.
   */
  headerBackgroundColor: string;
  /**
   * A HEX color value for customizing the text color of the webview header.
   */
  headerTextColor: string;
  /**
   * A HEX color value for customizing the color of the close button.
   */
  closeButtonColor?: string;
}

export interface AndroidAutomaticColors {
  /**
   * Color overrides when the theme preference is 'light'.
   */
  light: AndroidColors;
  /**
   * Color overrides when the theme preference is 'dark'.
   */
  dark: AndroidColors;
}

export interface CommonConfiguration {
  /**
   * Sets the title of the Checkout sheet.
   *
   * * Important: This will only modify the Checkout Sheet on iOS, not Android.
   *
   * To implement localization support for iOS:
   *  1. Create a "Localizable.xcstrings" file under "ios/{YourApplication}"
   *  2. Set a translated value for a "shopify_checkout_sheet_title" key
   *
   * To implement localization support for Android:
   *  1. Open the "android/app/src/main/res/values/strings.xml" file
   *  2. Add "<string name="checkout_web_view_title">Checkout</string>"
   */
  title?: string;
  /**
   * Sets the log level for Checkout Kit.
   * Controls the verbosity of logs emitted by the native SDK.
   *
   * @default LogLevel.error
   */
  logLevel?: LogLevel;
  /**
   * Enables best-effort checkout preloading before presentation.
   *
   * @default true
   */
  preloading?: boolean;
  /**
   * Origins trusted to send incoming checkout messages, in addition to the
   * loaded checkout origin and `shop.app` (including its subdomains).
   *
   * The native surface is open by default: when this is empty (the default),
   * messages from any origin are accepted. Provide one or more origins to
   * restrict which origins are trusted. Entries may be exact origins
   * (`https://example.com`), wildcard subdomains (`https://*.example.com`), or
   * `'*'` to explicitly disable origin validation.
   *
   * Rejected messages are logged by the native SDK at debug level; they are
   * never silently dropped.
   *
   * @default [] (all origins trusted)
   */
  allowedMessageOrigins?: string[];
  /**
   * Invoked when an incoming checkout message is rejected by origin
   * validation. Treat the payload as untrusted.
   */
  onMessageRejected?: (detail: RejectedMessage) => void;
}

export interface RejectedMessage {
  origin: string;
  message: string;
  reason: string;
}

export type Configuration = CommonConfiguration & {
  acceleratedCheckouts?: AcceleratedCheckoutConfiguration;
} & (
    | {
        /**
         * The selected color scheme for the checkout. See README.md for more details.
         */
        colorScheme?: ColorScheme.web | ColorScheme.light | ColorScheme.dark;
        /**
         * Platform-specific color overrides
         */
        colors?: {
          ios?: IosColors;
          android?: AndroidColors;
        };
      }
    | {
        /**
         * The selected color scheme for the checkout. See README.md for more details.
         */
        colorScheme?: ColorScheme.automatic;
        /**
         * Platform-specific color overrides
         */
        colors?: {
          ios?: IosColors;
          android?: AndroidAutomaticColors;
        };
      }
  );

export interface GeolocationRequestEvent {
  /**
   * The WebView origin requesting geolocation access.
   */
  origin: string;
  /**
   * Resolves the pending Android WebView geolocation request.
   *
   * This does not request OS location permissions. Consumers should request or
   * check Android permissions first, then call `respond(...)` with the resolved
   * allow/deny value.
   */
  respond: (allow: boolean) => void;
}

/**
 * Per-call SDK callbacks for `present(url, callbacks, protocol)`.
 *
 * Exactly one of `onClose` or `onFail` fires per `present(...)` invocation,
 * after which the callbacks are released.
 *
 * `onGeolocationRequest` may fire any number of times during a single
 * `present(...)` call while the checkout sheet is open.
 */
export interface PresentCallbacks {
  /**
   * Fires when the checkout sheet is dismissed without a terminal error.
   * Mirrors `DefaultCheckoutEventProcessor.onCheckoutCanceled` on Android
   * and the iOS Swift SDK's `onClose` callback.
   */
  onClose?: () => void;
  /**
   * Fires when the checkout sheet terminates with an error.
   * Mirrors `DefaultCheckoutEventProcessor.onCheckoutFailed` on Android
   * and the iOS Swift SDK's `onFail` callback.
   */
  onFail?: (error: CheckoutException) => void;
  /**
   * Fires when the checkout sheet requests geolocation permissions.
   * Only Android currently delivers this callback; on iOS the
   * `present()` call accepts the handle but never invokes it.
   *
   * When set, this overrides the default internal handler driven by
   * `features.handleGeolocationRequests`. The consumer is responsible
   * for resolving Android permissions and calling `event.respond(allow)`.
   */
  onGeolocationRequest?: (event: GeolocationRequestEvent) => void;
}

/**
 * Customer information for personalized accelerated checkout.
 *
 * Use `accessToken` for buyers authenticated with Shopify Customer Accounts.
 * Use `email` and `phoneNumber` together for buyers identified by contact
 * fields. These modes are mutually exclusive.
 */
export type AcceleratedCheckoutCustomer =
  | {accessToken: string; email?: never; phoneNumber?: never}
  | {accessToken?: never; email: string; phoneNumber: string};

/**
 * Configuration for AcceleratedCheckouts
 */
export interface AcceleratedCheckoutConfiguration {
  /**
   * The storefront domain (e.g., "your-shop.myshopify.com")
   */
  storefrontDomain: string;

  /**
   * The storefront access token with `write_cart_wallet_payments` scope
   */
  storefrontAccessToken: string;

  /**
   * Customer information for personalized checkout.
   *
   * Provide either an authenticated Customer Account `accessToken`, or provide
   * both `email` and `phoneNumber` for contact-field identification.
   */
  customer?: AcceleratedCheckoutCustomer;
  /**
   * Enable and configure accelerated checkout wallets.
   */
  wallets?: {
    /**
     * Apple Pay specific configuration.
     * When provided, Apple Pay buttons can render and the Apple Pay sheet will
     * request the specified buyer contact fields.
     */
    applePay?: {
      /**
       * Buyer contact fields to request in the Apple Pay sheet.
       * Supported values:
       *  - 'email': request the buyer's email address
       *  - 'phone': request the buyer's phone number
       */
      contactFields: ApplePayContactField[];
      /**
       * The Apple Merchant Identifier used to sign Apple Pay payment requests on iOS.
       * Example: 'merchant.com.yourcompany'
       */
      merchantIdentifier: string;
      /**
       * Restrict the countries available for shipping during the Apple Pay flow.
       * Expects ISO 3166-1 alpha-2 country codes (e.g., "US", "CA", "GB").
       * @default null (all countries supported, as per Shop configuration)
       */
      supportedShippingCountries?: string[];
    };
  };
}

export interface ShopifyCheckoutKit {
  /**
   * The version number of the Shopify Checkout SDK.
   */
  readonly version: string;
  /**
   * Present the checkout.
   *
   * @param checkoutURL The URL of the checkout to display.
   * @param callbacks Optional per-call SDK callbacks. Exactly one of
   * `onClose` or `onFail` fires per call, after which the callbacks are
   * released.
   * @param protocol Optional per-call Checkout Protocol event handlers.
   */
  present(
    checkoutURL: string,
    callbacks?: PresentCallbacks,
    protocol?: ProtocolHandlers,
  ): void;
  /**
   * Preload the checkout for faster presentation.
   *
   * @param checkoutURL The URL of the checkout to preload.
   */
  preload(checkoutURL: string): void;
  /**
   * Clear any checkout cached by `preload`.
   */
  invalidate(): void;
  /**
   * Configure the checkout. See README.md for more details.
   */
  setConfig(config: Configuration): void;
  /**
   * Return the current config for the checkout. See README.md for more details.
   */
  getConfig(): Configuration;
  /**
   * Cleans up any event callbacks to prevent memory leaks.
   */
  teardown(): void;

  /**
   * Configure AcceleratedCheckouts for Shop Pay and Apple Pay buttons
   */
  configureAcceleratedCheckouts(
    config: AcceleratedCheckoutConfiguration,
  ): boolean;

  /**
   * Check if accelerated checkout is available for the given cart or product
   */
  isAcceleratedCheckoutAvailable(): boolean;
}
