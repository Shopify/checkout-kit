import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
} from 'expo-crypto';

function base64URLEncode(value: ArrayBufferLike | string): string {
  if (typeof value === 'string') {
    return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '');
  }

  const bytes = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return base64URLEncode(btoa(binary));
}

export class PKCE {
  static generateCodeVerifier(): string {
    return base64URLEncode(getRandomBytes(32).buffer);
  }

  static async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: CryptoEncoding.BASE64,
    });
    return base64URLEncode(hash);
  }

  static generateState(): string {
    return base64URLEncode(getRandomBytes(27).buffer);
  }
}
