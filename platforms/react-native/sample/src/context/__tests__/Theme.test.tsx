jest.unmock('react-native');

import {
  CheckoutAppearanceType,
  CheckoutColorScheme,
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
    '../../../../internal/core/src/enums',
  ),
  ApplePayStyle: {automatic: 'automatic'},
}));

describe('getCheckoutAppearance', () => {
  it('sends an automatic app appearance without colors so the native SDKs decide', () => {
    expect(getCheckoutAppearance(AppearanceOption.appAutomatic)).toEqual({
      type: CheckoutAppearanceType.app,
      colorScheme: CheckoutColorScheme.automatic,
    });
  });

  it('sends a light app appearance with the light palette', () => {
    const checkoutColors = {
      webViewBackgroundColor: lightColors.webViewBackgroundColor,
      progressIndicatorColor: lightColors.progressIndicatorColor,
      headerBackgroundColor: lightColors.headerBackgroundColor,
      headerTitleColor: lightColors.headerTitleColor,
      closeIconTintColor: lightColors.closeIconTintColor,
    };

    expect(getCheckoutAppearance(AppearanceOption.appLight)).toEqual({
      type: CheckoutAppearanceType.app,
      colorScheme: CheckoutColorScheme.light,
      colors: {ios: checkoutColors, android: checkoutColors},
    });
  });

  it('sends a dark app appearance with the dark palette', () => {
    const appearance = getCheckoutAppearance(AppearanceOption.appDark);

    expect(appearance).toMatchObject({
      type: CheckoutAppearanceType.app,
      colorScheme: CheckoutColorScheme.dark,
      colors: {
        ios: {webViewBackgroundColor: darkColors.webViewBackgroundColor},
        android: {webViewBackgroundColor: darkColors.webViewBackgroundColor},
      },
    });
  });

  it('sends a storefront appearance with the web palette', () => {
    const appearance = getCheckoutAppearance(AppearanceOption.storefront);

    expect(appearance).toEqual({
      type: CheckoutAppearanceType.storefront,
      colors: expect.objectContaining({
        ios: expect.objectContaining({
          webViewBackgroundColor: webColors.webViewBackgroundColor,
        }),
        android: expect.objectContaining({
          webViewBackgroundColor: webColors.webViewBackgroundColor,
        }),
      }),
    });
  });
});
