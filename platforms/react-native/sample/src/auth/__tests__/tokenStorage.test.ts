import * as SecureStore from 'expo-secure-store';
import {clearTokens, getEmail, getTokens, saveEmail, saveTokens} from '../tokenStorage';
import type {OAuthTokenResult} from '../types';

beforeEach(async () => {
  await (SecureStore as typeof SecureStore & {clear: () => Promise<void>}).clear();
  jest.clearAllMocks();
});

describe('tokenStorage', () => {
  const tokens: OAuthTokenResult = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    expiresAt: 123456,
    idToken: 'id-token',
    tokenType: 'bearer',
  };

  it('persists tokens in SecureStore', async () => {
    await saveTokens(tokens);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'customer_account_tokens',
      JSON.stringify(tokens),
    );
    await expect(getTokens()).resolves.toEqual(tokens);
  });

  it('clears tokens and email from SecureStore', async () => {
    await saveTokens(tokens);
    await saveEmail('buyer@example.com');

    await clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'customer_account_tokens',
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'customer_account_email',
    );
    await expect(getTokens()).resolves.toBeNull();
    await expect(getEmail()).resolves.toBeNull();
  });
});
