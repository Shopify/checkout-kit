import {describe, test, expect} from 'vitest';

import {url} from '../src/url';
import {Delegations} from '../src/generated/ProtocolNotifications';

describe('url handshake', () => {
  test('appends the spec version', () => {
    expect(url('https://shop.example/checkout')).toBe(
      'https://shop.example/checkout?ec_version=2026-04-08',
    );
  });

  test('replaces an existing protocol version and preserves other query params', () => {
    const result = url('https://shop.example/c?ec_version=old&foo=bar');

    expect(result).toContain('foo=bar');
    expect(result.match(/ec_version=/g)).toHaveLength(1);
    expect(result).toContain('ec_version=2026-04-08');
  });

  test('encodes delegations, auth, and color scheme', () => {
    const result = url('https://shop.example/c', {
      delegations: [Delegations.paymentCredential, Delegations.windowOpen],
      auth: 'a b',
      colorScheme: 'dark',
    });

    expect(result).toContain('ec_delegate=payment.credential,window.open');
    expect(result).toContain('ec_auth=a%20b');
    expect(result).toContain('ec_color_scheme=dark');
  });

  test('preserves the fragment', () => {
    const result = url('https://shop.example/c#section');

    expect(result.endsWith('#section')).toBe(true);
    expect(result).toContain('ec_version=2026-04-08');
  });
});
