import type {CheckoutEventHandlers} from './checkout';
import type {
  ApplePayContactField,
  CheckoutAppearanceType,
  CheckoutColorScheme,
  LogLevel,
} from './enums';
export {
  AcceleratedCheckoutWallet,
  ApplePayContactField,
  CheckoutAppearanceType,
  CheckoutColorScheme,
  LogLevel,
} from './enums';
export type {
  Checkout,
  CheckoutStartEvent,
  CheckoutUpdateEvent,
  CheckoutCompleteEvent,
  CheckoutFailureEvent,
  CheckoutLink,
  CheckoutLinkAction,
  CheckoutEventHandlers,
} from './checkout';

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

/**
 * Colors of the native elements around checkout. Each field has the same name
 * as the matching color field of the native `CheckoutColors` (iOS) or `Colors`
 * (Android).
 *
 * Each value is a HEX color: `#RRGGBB`, or `#AARRGGBB` with opacity. Omitted or
 * invalid values use the native default for the appearance.
 */
export interface CheckoutColors {
  /**
   * The background color shown behind the checkout web content.
   */
  webViewBackgroundColor?: string;
  /**
   * The background color of the checkout header.
   */
  headerBackgroundColor?: string;
  /**
   * The color of the checkout title in the header.
   */
  headerTitleColor?: string;
  /**
   * The color of the progress indicator shown while checkout loads.
   */
  progressIndicatorColor?: string;
  /**
   * The tint of the close button. `null` uses the native default.
   */
  closeIconTintColor?: string | null;
  /**
   * The color of the border under the header when checkout content scrolls
   * beneath it. `null` uses the native default.
   */
  headerBorderColor?: string | null;
}

/**
 * Colors for iOS.
 */
export type IosColors = CheckoutColors;

/**
 * Colors for Android.
 */
export interface AndroidColors extends CheckoutColors {
  /**
   * The color of the drag handle. `null` follows `headerTitleColor`.
   */
  dragHandleColor?: string | null;
}

/**
 * Colors for the automatic color scheme. The top-level colors apply in light
 * and dark mode. Colors in `light` or `dark` override them in that mode.
 */
export type AutomaticColors<Palette extends CheckoutColors = CheckoutColors> =
  Palette & {
    /**
     * Colors that override the shared colors in light mode.
     */
    light?: Palette | null;
    /**
     * Colors that override the shared colors in dark mode.
     */
    dark?: Palette | null;
  };

/**
 * Automatic colors for iOS.
 */
export type IosAutomaticColors = AutomaticColors<IosColors>;

/**
 * Automatic colors for Android.
 */
export type AndroidAutomaticColors = AutomaticColors<AndroidColors>;

/**
 * Platform-specific colors. Each platform reads only its own key.
 */
export interface PlatformColors<Ios, Android> {
  /**
   * Colors that the iOS SDK uses.
   */
  ios?: Ios | null;
  /**
   * Colors that the Android SDK uses.
   */
  android?: Android | null;
}

/**
 * How checkout is styled. Mirrors the native `CheckoutAppearance`.
 *
 * - `app`: uses the given `colorScheme` (default `automatic`) with optional
 *   platform colors.
 * - `storefront`: uses the storefront's branding with optional platform colors
 *   for the native elements around checkout.
 *
 * Each `appearance` replaces the previous one. Colors that it does not give
 * use the native defaults. See README.md for more details.
 */
export type CheckoutAppearance =
  | {
      type: CheckoutAppearanceType.app;
      colorScheme: CheckoutColorScheme.light | CheckoutColorScheme.dark;
      colors?: PlatformColors<IosColors, AndroidColors> | null;
    }
  | {
      type: CheckoutAppearanceType.app;
      /**
       * @default CheckoutColorScheme.automatic
       */
      colorScheme?: CheckoutColorScheme.automatic;
      colors?: PlatformColors<IosAutomaticColors, AndroidAutomaticColors> | null;
    }
  | {
      type: CheckoutAppearanceType.storefront;
      colors?: PlatformColors<IosColors, AndroidColors> | null;
    };

interface CommonConfiguration {
  /**
   * Sets the title of the Checkout sheet.
   *
   * When omitted, each platform uses its default localized title.
   *
   * For per-locale localization, either provide translated values through the
   * platform resource files or use this runtime value in a locale listener.
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
   * Omit this field to keep the native SDK default. Read the value back with
   * `getConfig()` instead of assuming a default here.
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
   * loaded checkout origin and Shopify-owned `shop.app` and `shop.com` domains
   * (including their subdomains).
   *
   * The native surface is open by default: when this is empty (the default),
   * messages from any origin are accepted. Provide one or more origins to
   * restrict which origins are trusted. Entries may be exact origins
   * (`https://example.com`), wildcard subdomains (`https://*.example.com`), or
   * `'*'` to explicitly disable origin validation.
   *
   * Rejected messages are never silently dropped: the native SDK logs each
   * rejection as a warning with the message origin and reason.
   *
   * @default [] (all origins trusted)
   */
  allowedMessageOrigins?: string[];
  /**
   * Sends anonymous diagnostic metrics to Shopify. Set to `false` to opt out.
   *
   * @default true
   */
  telemetry?: boolean;
}

export type Configuration = CommonConfiguration & {
  acceleratedCheckouts?: AcceleratedCheckoutConfiguration;
  /**
   * The checkout appearance. Omit it to keep the current appearance.
   * `getConfig()` reports the appearance type and color scheme, not the
   * colors. See README.md for more details.
   */
  appearance?: CheckoutAppearance;
};

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

/** Lifecycle callbacks and link policy for a checkout presentation. */
export interface PresentCallbacks extends CheckoutEventHandlers {
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

/** A stable, machine-readable reason why a preload failed. */
export type PreloadFailureReason =
  | 'httpError'
  | 'navigationFailed'
  | 'webContentUnavailable'
  | 'protocolError'
  | 'unknown';

/** The observable lifecycle state of a preloaded checkout. */
export type PreloadState =
  | {type: 'idle'; reason?: string}
  | {type: 'loading'}
  | {type: 'ready'}
  | {
      type: 'failed';
      reason: PreloadFailureReason;
      statusCode?: number;
    };

/** Optional callbacks for a single `preload(...)` invocation. */
export interface PreloadOptions {
  /**
   * Fires immediately with the initial native state and whenever it changes.
   * Preload failures are performance signals and do not prevent a later
   * `present(...)` call from loading checkout normally.
   */
  onStateChange?: (state: PreloadState) => void;
}

/** Observation returned by `preload(...)`. */
export interface CheckoutPreloadSubscription {
  /** The latest state delivered by the native SDK. */
  readonly state: PreloadState;
  /**
   * Stops delivering state changes to this observer. This does not cancel or
   * invalidate the cached checkout.
   */
  remove(): void;
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
   * @param callbacks Lifecycle callbacks and native link policy. Callbacks remain
   * active until dismissal, including after completion or failure. Programmatic
   * `dismiss()` stops them without firing `onDismiss` or `onFail`. Repeated calls
   * while checkout is active or closing are ignored, including across instances.
   * Ignored attempts do not fire callbacks.
   */
  present(checkoutURL: string, callbacks?: PresentCallbacks): void;
  /**
   * Dismiss the presented checkout. Like native programmatic dismissal, this
   * invokes neither `onDismiss` nor `onFail`.
   */
  dismiss(): void;
  /**
   * Preload the checkout for faster presentation.
   *
   * @param checkoutURL The URL of the checkout to preload.
   * @param options Optional callbacks for observing preload state.
   */
  preload(
    checkoutURL: string,
    options?: PreloadOptions,
  ): CheckoutPreloadSubscription;
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
   * Stops consumer callbacks and cancels pending geolocation responses.
   * The native checkout remains open and tracked until its session ends.
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
