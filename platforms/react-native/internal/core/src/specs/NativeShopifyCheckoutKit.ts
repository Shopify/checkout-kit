import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

type ColorsBaseSpec = {
  webViewBackgroundColor?: string;
  headerBackgroundColor?: string;
  headerTitleColor?: string;
  progressIndicatorColor?: string;
  closeIconTintColor?: string | null;
  headerBorderColor?: string | null;
  dragHandleColor?: string | null;
  // iOS only: colors that reset to the native default. See toNativeConfiguration.
  resetColors?: string[];
};

type PlatformColorsSpec = {
  webViewBackgroundColor?: string;
  headerBackgroundColor?: string;
  headerTitleColor?: string;
  progressIndicatorColor?: string;
  closeIconTintColor?: string | null;
  headerBorderColor?: string | null;
  dragHandleColor?: string | null;
  // iOS only: colors that reset to the native default. See toNativeConfiguration.
  resetColors?: string[];
  light?: ColorsBaseSpec | null;
  dark?: ColorsBaseSpec | null;
};

type ColorsSpec = {
  ios?: PlatformColorsSpec | null;
  android?: PlatformColorsSpec | null;
};

type AppearanceSpec = {
  type: string;
  colorScheme?: string;
  colors?: ColorsSpec | null;
};

type AppearanceResultSpec = {
  type: string;
  colorScheme?: string;
};

export type ConfigurationSpec = {
  title?: string;
  appearance?: AppearanceSpec | null;
  logLevel?: string;
  preloading?: boolean;
  allowedMessageOrigins?: string[];
  telemetry?: boolean;
};

type ConfigurationResultSpec = {
  appearance: AppearanceResultSpec;
  logLevel: string;
  preloading: boolean;
  telemetry: boolean;
  title?: string;
  allowedMessageOrigins: string[];
};

export interface Spec extends TurboModule {
  readonly onDispatch: CodegenTypes.EventEmitter<string>;
  readonly onPreloadStateChange: CodegenTypes.EventEmitter<string>;

  present(
    checkoutUrl: string,
    linkAction: string,
    onResult: (accepted: boolean) => void,
  ): void;
  preload(checkoutUrl: string, requestId: string): void;
  dismiss(): void;
  clearPreload(): void;
  setConfig(configuration: ConfigurationSpec): Promise<ConfigurationResultSpec>;
  getConfig(): ConfigurationResultSpec;
  configureAcceleratedCheckouts(
    storefrontDomain: string,
    storefrontAccessToken: string,
    customerEmail: string | null,
    customerPhoneNumber: string | null,
    customerAccessToken: string | null,
    applePayMerchantIdentifier: string | null,
    applyPayContactFields: string[],
    supportedShippingCountries: string[],
  ): boolean;
  isAcceleratedCheckoutAvailable(): boolean;
  isApplePayAvailable(): boolean;
  respondToGeolocationRequest(allow: boolean): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
  getConstants(): {
    version: string;
    /**
     * SDK lifecycle event types the native dispatcher may emit. Compared
     * against the JS-side canonical list at construction time; a mismatch
     * indicates the host app needs a native rebuild.
     */
    dispatchEventTypes: string[];
  };
}

export default TurboModuleRegistry.getEnforcing<Spec>('ShopifyCheckoutKit');
