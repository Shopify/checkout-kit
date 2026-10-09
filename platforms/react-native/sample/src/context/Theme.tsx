import type {PropsWithChildren} from 'react';
import React, {createContext, useCallback, useMemo, useState} from 'react';
import type {ColorSchemeName} from 'react-native';
import {Appearance, useColorScheme} from 'react-native';
import type {Theme} from '@react-navigation/native';
import {DarkTheme, DefaultTheme} from '@react-navigation/native';
import type {CheckoutAppearance} from '@shopify/checkout-kit-react-native';
import {
  CheckoutAppearanceType,
  ColorScheme,
} from '@shopify/checkout-kit-react-native';

export enum AppearanceOption {
  storefront = 'storefront',
  appAutomatic = 'appAutomatic',
  appLight = 'appLight',
  appDark = 'appDark',
}

interface Context {
  cornerRadius: number;
  colors: Colors;
  appearance: AppearanceOption;
  preference: ColorSchemeName;
  setAppearance: (appearance: AppearanceOption) => void;
}

export const darkColors: Colors = {
  background: '#1D1D1F',
  backgroundSubdued: '#222',
  border: '#333336',
  text: '#fff',
  textSubdued: '#eee',
  primary: '#0B96F1',
  primaryText: '#fff',
  secondary: '#0087ff',
  secondaryText: '#fff',

  webViewBackground: '#1D1D1F',
  progressIndicator: '#0B96F1',
  headerBackground: '#1D1D1F',
  headerFont: '#ffffff',
  closeIconTint: '#ffffff',
};

export const lightColors: Colors = {
  background: '#eee',
  backgroundSubdued: '#fff',
  border: '#eee',
  text: '#000',
  textSubdued: '#a3a3a3',
  primary: '#0087ff',
  primaryText: '#fff',
  secondary: '#000',
  secondaryText: '#fff',

  webViewBackground: '#ffffff',
  progressIndicator: '#0087ff',
  headerBackground: '#ffffff',
  headerFont: '#000000',
  closeIconTint: '#000000',
};

export const webColors: Colors = {
  background: '#f0f0e8',
  backgroundSubdued: '#e8e8e0',
  border: '#d0d0cd',
  text: '#2d2a38',
  textSubdued: '#a3a3a3',
  primary: '#2c2a38',
  primaryText: '#0087ff',
  secondary: '#2d2a38',
  secondaryText: '#fff',

  webViewBackground: '#f0f0e8',
  progressIndicator: '#2c2a38',
  headerBackground: '#f0f0e8',
  headerFont: '#2c2a38',
  closeIconTint: '#2c2a38',
};

const ThemeContext = createContext<Context>({
  cornerRadius: 35,
  appearance: AppearanceOption.appAutomatic,
  colors: lightColors,
  preference: Appearance.getColorScheme(),
  setAppearance() {},
});

export interface Colors {
  background: string;
  backgroundSubdued: string;
  border: string;
  text: string;
  textSubdued: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  webViewBackground: string;
  progressIndicator: string;
  headerBackground: string;
  headerFont: string;
  closeIconTint: string;
}

export function getNavigationTheme(
  appearance: AppearanceOption,
  preference: ColorSchemeName,
): Theme {
  const colors = getColors(appearance, preference);
  const primary = '#0087ff';

  const light = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary,
      background: colors.background,
      card: colors.backgroundSubdued,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  const dark = {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      primary,
      background: colors.background,
      card: colors.backgroundSubdued,
      text: colors.primaryText,
      border: colors.border,
      notification: colors.primary,
    },
  };

  const web = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary,
      background: colors.background,
      card: colors.backgroundSubdued,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  switch (appearance) {
    case AppearanceOption.appAutomatic:
      return preference === 'dark' ? dark : light;
    case AppearanceOption.appDark:
      return dark;
    case AppearanceOption.storefront:
      return web;
    default:
      return light;
  }
}

export function getColors(
  appearance: AppearanceOption,
  preference: ColorSchemeName = null,
): Colors {
  switch (appearance) {
    case AppearanceOption.appAutomatic:
      return preference === 'dark' ? darkColors : lightColors;
    case AppearanceOption.appDark:
      return darkColors;
    case AppearanceOption.storefront:
      return webColors;
    default:
      return lightColors;
  }
}

export function getCheckoutAppearance(
  appearance: AppearanceOption,
): CheckoutAppearance {
  if (appearance === AppearanceOption.appAutomatic) {
    return {
      type: CheckoutAppearanceType.app,
      colorScheme: ColorScheme.automatic,
    };
  }

  const palette = getColors(appearance);
  const checkoutColors = {
    webViewBackground: palette.webViewBackground,
    headerBackground: palette.headerBackground,
    headerFont: palette.headerFont,
    progressIndicator: palette.progressIndicator,
    closeIconTint: palette.closeIconTint,
  };
  const colors = {ios: checkoutColors, android: checkoutColors};

  if (appearance === AppearanceOption.storefront) {
    return {type: CheckoutAppearanceType.storefront, colors};
  }

  return {
    type: CheckoutAppearanceType.app,
    colorScheme:
      appearance === AppearanceOption.appDark
        ? ColorScheme.dark
        : ColorScheme.light,
    colors,
  };
}

export const ThemeProvider: React.FC<
  PropsWithChildren<{defaultValue: AppearanceOption; cornerRadius: number}>
> = ({
  children,
  defaultValue = AppearanceOption.appAutomatic,
  cornerRadius,
}) => {
  const preference = useColorScheme();
  const [appearance, setAppearanceInternal] =
    useState<AppearanceOption>(defaultValue);

  const setAppearance = useCallback((appearance: AppearanceOption) => {
    if (appearance === AppearanceOption.appAutomatic) {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(
        appearance === AppearanceOption.appDark ? 'dark' : 'light',
      );
    }
    setAppearanceInternal(appearance);
  }, []);

  const value = useMemo(
    () => ({
      cornerRadius,
      colors: getColors(appearance, preference),
      preference,
      appearance,
      setAppearance,
    }),
    [preference, appearance, setAppearance, cornerRadius],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);
