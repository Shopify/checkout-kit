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

test('renames fields inside array elements', () => {
  const decoded = decodeProtocolObject(
    {...wire, line_items: [{parent_id: 'parent-1', quantity: 2}]},
    'Checkout',
  ) as Record<string, Array<Record<string, unknown>>>;

  expect(decoded.lineItems[0].parentId).toBe('parent-1');
  expect(decoded.lineItems[0].quantity).toBe(2);
  expect('parent_id' in decoded.lineItems[0]).toBe(false);
});

test('renames fields inside map values', () => {
  const decoded = decodeProtocolObject(
    {payment_handlers: {stripe: [{available_instruments: ['card']}]}},
    'InstrumentsChangeResultUcp',
  ) as Record<string, Record<string, Array<Record<string, unknown>>>>;

  const handler = decoded.paymentHandlers.stripe[0];
  expect(handler.availableInstruments).toEqual(['card']);
  expect('available_instruments' in handler).toBe(false);
});

test('throws when a required string field is not a string', () => {
  expect(() => decodeProtocolObject({...wire, currency: 123}, 'Checkout')).toThrow(
    'Invalid Checkout',
  );
});
