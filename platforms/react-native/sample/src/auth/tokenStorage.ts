import * as SecureStore from 'expo-secure-store';
import type {OAuthTokenResult} from './types';

const TOKENS_KEY = 'customer_account_tokens';
const EMAIL_KEY = 'customer_account_email';

export async function saveTokens(tokens: OAuthTokenResult): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<OAuthTokenResult | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as OAuthTokenResult;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}

export async function saveEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(EMAIL_KEY, email);
}

export async function getEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(EMAIL_KEY);
}
