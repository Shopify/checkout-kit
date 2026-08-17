jest.unmock('react-native');

import React from 'react';
import {Text} from 'react-native';
import {render, waitFor} from '@testing-library/react-native';
import {ColorScheme} from '@shopify/checkout-kit-react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import {ConfigProvider, useConfig} from '../Config';
import {ThemeProvider, useTheme} from '../Theme';
import {BuyerIdentityMode} from '../../auth/types';

jest.mock('react-native-encrypted-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

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

const getStoredConfig = EncryptedStorage.getItem as jest.MockedFunction<
  (key: string) => Promise<string | null>
>;

function ColorSchemeProbe() {
  const {appConfig} = useConfig();
  const {colorScheme} = useTheme();

  return (
    <Text testID="probe">{`${appConfig.colorScheme}|${colorScheme}`}</Text>
  );
}

function renderProviders(seedColorScheme: ColorScheme) {
  return render(
    <ThemeProvider cornerRadius={30} defaultValue={ColorScheme.automatic}>
      <ConfigProvider
        config={{
          colorScheme: seedColorScheme,
          buyerIdentityMode: BuyerIdentityMode.Guest,
          checkoutPreloadingEnabled: true,
        }}>
        <ColorSchemeProbe />
      </ConfigProvider>
    </ThemeProvider>,
  );
}

async function expectResolvedColorScheme(
  probe: ReturnType<typeof renderProviders>,
  expected: ColorScheme,
) {
  await waitFor(() =>
    expect(probe.getByTestId('probe').props.children).toBe(
      `${expected}|${expected}`,
    ),
  );
}

describe('ConfigProvider color scheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the seeded scheme to the app config and the theme', async () => {
    getStoredConfig.mockResolvedValue(null);

    await expectResolvedColorScheme(
      renderProviders(ColorScheme.dark),
      ColorScheme.dark,
    );
  });

  it('restores a stored scheme into the app config and the theme', async () => {
    getStoredConfig.mockResolvedValue(
      JSON.stringify({colorScheme: ColorScheme.light}),
    );

    await expectResolvedColorScheme(
      renderProviders(ColorScheme.dark),
      ColorScheme.light,
    );
  });
});
