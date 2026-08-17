import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

type IosColorsSpec = {
  tintColor?: string;
  backgroundColor?: string;
  closeButtonColor?: string;
};

type AndroidColorsBaseSpec = {
  progressIndicator?: string;
  backgroundColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  closeButtonColor?: string;
};

type AndroidColorsSpec = {
  progressIndicator?: string;
  backgroundColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  closeButtonColor?: string;
  light?: AndroidColorsBaseSpec;
  dark?: AndroidColorsBaseSpec;
};

type ColorsSpec = {
  ios?: IosColorsSpec;
  android?: AndroidColorsSpec;
};

type ConfigurationSpec = {
  title?: string;
  colorScheme?: string;
  logLevel?: string;
  preloading?: boolean;
  allowedMessageOrigins?: string[];
  colors?: ColorsSpec;
};

type ConfigurationResultSpec = {
  colorScheme: string;
  logLevel: string;
  preloading: boolean;
  title?: string;
  tintColor?: string;
  backgroundColor?: string;
  closeButtonColor?: string;
  allowedMessageOrigins: string[];
};

export interface Spec extends TurboModule {
  readonly onDispatch: CodegenTypes.EventEmitter<string>;

  present(
    checkoutUrl: string,
    subscribedMethods: string[],
  ): void;
  preload(checkoutUrl: string): void;
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
