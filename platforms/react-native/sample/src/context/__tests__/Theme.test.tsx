jest.unmock('react-native');

import {
  CheckoutAppearanceType,
  ColorScheme,
} from '@shopify/checkout-kit-react-native';
import {
  AppearanceOption,
  darkColors,
  getCheckoutAppearance,
  lightColors,
  webColors,
} from '../Theme';

jest.mock('@react-navigation/native', () => ({
  DarkTheme: {dark: true, colors: {}},
  DefaultTheme: {dark: false, colors: {}},
}));

jest.mock('@shopify/checkout-kit-react-native', () => ({
  ...jest.requireActual(
    '../../../../modules/@shopify/checkout-kit-react-native/src/enums',
  ),
  ApplePayStyle: {automatic: 'automatic'},
}));

describe('getCheckoutAppearance', () => {
  it('sends an automatic app appearance without colors so the native SDKs decide', () => {
    expect(getCheckoutAppearance(AppearanceOption.appAutomatic)).toEqual({
      type: CheckoutAppearanceType.app,
      colorScheme: ColorScheme.automatic,
    });
  });

  it('sends a light app appearance with the light palette', () => {
    const checkoutColors = {
      webViewBackground: lightColors.webViewBackground,
      progressIndicator: lightColors.progressIndicator,
      headerBackground: lightColors.headerBackground,
      headerFont: lightColors.headerFont,
      closeIconTint: lightColors.closeIconTint,
    };

    expect(getCheckoutAppearance(AppearanceOption.appLight)).toEqual({
      type: CheckoutAppearanceType.app,
      colorScheme: ColorScheme.light,
      colors: {ios: checkoutColors, android: checkoutColors},
    });
  });

  it('sends a dark app appearance with the dark palette', () => {
    const appearance = getCheckoutAppearance(AppearanceOption.appDark);

    expect(appearance).toMatchObject({
      type: CheckoutAppearanceType.app,
      colorScheme: ColorScheme.dark,
      colors: {
        ios: {webViewBackground: darkColors.webViewBackground},
        android: {webViewBackground: darkColors.webViewBackground},
      },
    });
  });

  it('sends a storefront appearance with the web palette', () => {
    const appearance = getCheckoutAppearance(AppearanceOption.storefront);

    expect(appearance).toEqual({
      type: CheckoutAppearanceType.storefront,
      colors: expect.objectContaining({
        ios: expect.objectContaining({
          webViewBackground: webColors.webViewBackground,
        }),
        android: expect.objectContaining({
          webViewBackground: webColors.webViewBackground,
        }),
      }),
    });
  });
});
