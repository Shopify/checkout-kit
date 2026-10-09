import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

type IosColorsBaseSpec = {
  webViewBackground?: string;
  headerBackground?: string;
  headerFont?: string;
  progressIndicator?: string;
  closeIconTint?: string | null;
  headerBorderColor?: string | null;
};

type IosColorsSpec = {
  webViewBackground?: string;
  headerBackground?: string;
  headerFont?: string;
  progressIndicator?: string;
  closeIconTint?: string | null;
  headerBorderColor?: string | null;
  light?: IosColorsBaseSpec | null;
  dark?: IosColorsBaseSpec | null;
};

type AndroidColorsBaseSpec = {
  webViewBackground?: string;
  headerBackground?: string;
  headerFont?: string;
  progressIndicator?: string;
  closeIconTint?: string | null;
  headerBorderColor?: string | null;
  dragHandleColor?: string | null;
};

type AndroidColorsSpec = {
  webViewBackground?: string;
  headerBackground?: string;
  headerFont?: string;
  progressIndicator?: string;
  closeIconTint?: string | null;
  headerBorderColor?: string | null;
  dragHandleColor?: string | null;
  light?: AndroidColorsBaseSpec | null;
  dark?: AndroidColorsBaseSpec | null;
};

type ColorsSpec = {
  ios?: IosColorsSpec | null;
  android?: AndroidColorsSpec | null;
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

type ConfigurationSpec = {
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
  invalidateCache(): void;
  setConfig(configuration: ConfigurationSpec): void;
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
