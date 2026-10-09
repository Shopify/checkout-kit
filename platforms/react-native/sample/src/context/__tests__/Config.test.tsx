jest.unmock('react-native');

import React from 'react';
import {Text} from 'react-native';
import type {RenderResult} from '@testing-library/react-native';
import {render, waitFor} from '@testing-library/react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import {ConfigProvider, useConfig} from '../Config';
import {AppearanceOption, ThemeProvider, useTheme} from '../Theme';
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

function AppearanceProbe() {
  const {appConfig} = useConfig();
  const {appearance} = useTheme();

  return <Text testID="probe">{`${appConfig.appearance}|${appearance}`}</Text>;
}

function renderProviders(seedAppearance: AppearanceOption) {
  return render(
    <ThemeProvider
      cornerRadius={30}
      defaultValue={AppearanceOption.appAutomatic}>
      <ConfigProvider
        config={{
          appearance: seedAppearance,
          buyerIdentityMode: BuyerIdentityMode.Guest,
          checkoutPreloadingEnabled: true,
        }}>
        <AppearanceProbe />
      </ConfigProvider>
    </ThemeProvider>,
  );
}

async function expectResolvedAppearance(
  probe: RenderResult,
  expected: AppearanceOption,
) {
  await waitFor(() =>
    expect(probe.getByTestId('probe').props.children).toBe(
      `${expected}|${expected}`,
    ),
  );
}

describe('ConfigProvider appearance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the seeded appearance to the app config and the theme', async () => {
    getStoredConfig.mockResolvedValue(null);

    await expectResolvedAppearance(
      renderProviders(AppearanceOption.appDark),
      AppearanceOption.appDark,
    );
  });

  it('restores a stored appearance into the app config and the theme', async () => {
    getStoredConfig.mockResolvedValue(
      JSON.stringify({appearance: AppearanceOption.appLight}),
    );

    await expectResolvedAppearance(
      renderProviders(AppearanceOption.appDark),
      AppearanceOption.appLight,
    );
  });
});
