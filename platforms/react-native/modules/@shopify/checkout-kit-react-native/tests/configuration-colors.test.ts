import {TurboModuleRegistry} from 'react-native';
import {
  CheckoutAppearanceType,
  ColorScheme,
  LogLevel,
  ShopifyCheckout,
} from '../src';
import type {
  AndroidAutomaticColors,
  AndroidColors,
  Colors,
  Configuration,
  IosAutomaticColors,
  IosColors,
} from '../src';
import {__resetDispatchEventParityForTests} from '../src/dispatch-events';

jest.mock('react-native');

const nativeModule = TurboModuleRegistry.getEnforcing(
  'ShopifyCheckoutKit',
) as any;

describe('appearance configuration', () => {
  beforeEach(() => {
    __resetDispatchEventParityForTests();
    nativeModule.getConstants.mockReturnValue({
      version: '4.0.0-test',
      dispatchEventTypes: [
        'complete',
        'dismiss',
        'fail',
        'geolocationRequest',
        'linkClick',
        'start',
        'update',
      ],
    });
    nativeModule.setConfig.mockClear();
  });

  it('uses the native color names on both platforms', () => {
    const colors: Colors = {
      webViewBackground: '#112233',
      headerBackground: '#445566',
      headerFont: '#778899',
      progressIndicator: '#AABBCC',
      closeIconTint: null,
      headerBorderColor: null,
    };
    const ios: IosColors = colors;
    const android: AndroidColors = colors;
    const configuration: Configuration = {
      appearance: {
        type: CheckoutAppearanceType.app,
        colorScheme: ColorScheme.light,
        colors: {ios, android},
      },
    };
    const checkout = new ShopifyCheckout();

    checkout.setConfig(configuration);

    expect(nativeModule.setConfig).toHaveBeenCalledWith(configuration);
    expect(ios).toEqual(android);
  });

  it('supports shared and independent automatic overrides on both platforms', () => {
    const colors = {
      progressIndicator: '#112233',
      light: {closeIconTint: null},
      dark: {progressIndicator: '#445566'},
    };
    const ios: IosAutomaticColors = colors;
    const android: AndroidAutomaticColors = colors;
    const configuration: Configuration = {
      appearance: {
        type: CheckoutAppearanceType.app,
        colorScheme: ColorScheme.automatic,
        colors: {ios, android},
      },
    };
    const checkout = new ShopifyCheckout();

    checkout.setConfig(configuration);

    expect(nativeModule.setConfig).toHaveBeenCalledWith(configuration);
    expect(ios).toEqual(android);
  });

  it('keeps drag handle customization specific to Android', () => {
    const iosHasDragHandle: 'dragHandleColor' extends keyof IosColors
      ? true
      : false = false;
    const androidHasDragHandle: 'dragHandleColor' extends keyof AndroidColors
      ? true
      : false = true;
    const android: AndroidColors = {dragHandleColor: '#112233'};

    expect(iosHasDragHandle).toBe(false);
    expect(androidHasDragHandle).toBe(true);
    expect(android.dragHandleColor).toBe('#112233');
  });

  it('forwards storefront appearance with colors verbatim', () => {
    const configuration: Configuration = {
      appearance: {
        type: CheckoutAppearanceType.storefront,
        colors: {android: {dragHandleColor: '#112233'}},
      },
    };
    const checkout = new ShopifyCheckout();

    checkout.setConfig(configuration);

    expect(nativeModule.setConfig).toHaveBeenCalledWith(configuration);
  });

  it('does not resend previous appearance with unrelated configuration updates', () => {
    const checkout = new ShopifyCheckout({
      appearance: {
        type: CheckoutAppearanceType.app,
        colorScheme: ColorScheme.dark,
        colors: {ios: {progressIndicator: '#112233'}},
      },
    });
    nativeModule.setConfig.mockClear();

    checkout.setConfig({logLevel: LogLevel.debug, preloading: false});

    expect(nativeModule.setConfig).toHaveBeenCalledTimes(1);
    expect(nativeModule.setConfig).toHaveBeenCalledWith({
      logLevel: LogLevel.debug,
      preloading: false,
    });
  });

  it('does not merge previous colors when replacing the appearance', () => {
    const checkout = new ShopifyCheckout({
      appearance: {
        type: CheckoutAppearanceType.app,
        colorScheme: ColorScheme.dark,
        colors: {ios: {progressIndicator: '#112233'}},
      },
    });
    nativeModule.setConfig.mockClear();

    checkout.setConfig({appearance: {type: CheckoutAppearanceType.app}});

    expect(nativeModule.setConfig).toHaveBeenCalledTimes(1);
    expect(nativeModule.setConfig).toHaveBeenCalledWith({
      appearance: {type: CheckoutAppearanceType.app},
    });
  });

  it('forwards explicit color resets inside the appearance', () => {
    const checkout = new ShopifyCheckout();

    checkout.setConfig({
      appearance: {type: CheckoutAppearanceType.storefront, colors: null},
    });

    expect(nativeModule.setConfig).toHaveBeenCalledTimes(1);
    expect(nativeModule.setConfig).toHaveBeenCalledWith({
      appearance: {type: CheckoutAppearanceType.storefront, colors: null},
    });
  });
});
