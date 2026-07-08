import {expect, test} from 'vitest';

import {
  decodeProtocolObject,
  encodeProtocolObject,
} from '../src/protocol_codec_runtime';

const wire = {
  id: 'checkout-123',
  currency: 'USD',
  line_items: [],
  links: [],
  status: 'incomplete',
  totals: [],
  ucp: {version: '2026-04-08'},
  x_partner_data: {nested_key: 'value'},
  'com.example.foo': 'bar',
};

test('camelizes known schema fields on decode', () => {
  const decoded = decodeProtocolObject(wire, 'Checkout') as Record<
    string,
    unknown
  >;

  expect(decoded.lineItems).toEqual([]);
  expect('line_items' in decoded).toBe(false);
});

test('preserves unknown extension keys unchanged on decode', () => {
  const decoded = decodeProtocolObject(wire, 'Checkout') as Record<
    string,
    unknown
  >;

  expect(decoded.x_partner_data).toEqual({nested_key: 'value'});
  expect(decoded['com.example.foo']).toBe('bar');
  expect('xPartnerData' in decoded).toBe(false);
});

test('round-trips extension keys through decode + encode', () => {
  const decoded = decodeProtocolObject(wire, 'Checkout');
  const encoded = encodeProtocolObject(decoded, 'Checkout') as Record<
    string,
    unknown
  >;

  expect(encoded.line_items).toEqual([]);
  expect(encoded.x_partner_data).toEqual({nested_key: 'value'});
  expect(encoded['com.example.foo']).toBe('bar');
});
