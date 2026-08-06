jest.unmock('react-native');

import {ColorScheme} from '@shopify/checkout-kit-react-native';
import {
  darkColors,
  getCheckoutKitColors,
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

describe('getCheckoutKitColors', () => {
  it('sends no overrides for the automatic scheme so the native SDKs decide', () => {
    expect(getCheckoutKitColors(ColorScheme.automatic, 'dark')).toBeUndefined();
    expect(getCheckoutKitColors(ColorScheme.automatic, 'light')).toBeUndefined();
    expect(getCheckoutKitColors(ColorScheme.automatic, null)).toBeUndefined();
  });

  it('sends the light overrides for the light scheme', () => {
    expect(getCheckoutKitColors(ColorScheme.light, 'dark')).toEqual({
      ios: {
        backgroundColor: lightColors.webviewBackgroundColor,
        tintColor: lightColors.webViewProgressIndicator,
        closeButtonColor: lightColors.webviewCloseButtonColor,
      },
      android: {
        backgroundColor: lightColors.webviewBackgroundColor,
        progressIndicator: lightColors.webViewProgressIndicator,
        headerBackgroundColor: lightColors.webviewBackgroundColor,
        headerTextColor: lightColors.webviewHeaderTextColor,
        closeButtonColor: lightColors.webviewCloseButtonColor,
      },
    });
  });

  it('sends the dark overrides for the dark scheme', () => {
    const colors = getCheckoutKitColors(ColorScheme.dark, 'light');

    expect(colors?.ios?.backgroundColor).toBe(darkColors.webviewBackgroundColor);
    expect(colors?.android?.backgroundColor).toBe(
      darkColors.webviewBackgroundColor,
    );
  });

  it('sends the web overrides for the storefront scheme', () => {
    const colors = getCheckoutKitColors(ColorScheme.storefront, 'dark');

    expect(colors?.ios?.backgroundColor).toBe(webColors.webviewBackgroundColor);
  });
});
