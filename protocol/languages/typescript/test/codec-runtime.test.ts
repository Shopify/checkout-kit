import {expect, test} from 'vitest';

import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';
import {
  CheckoutModel,
  InstrumentsChangeResultUcpModel,
  PostalAddressModel,
} from '../src/generated/ProtocolRenameMap';
import {
  decodeProtocolObject,
  encodeProtocolObject,
  ProtocolValidationError,
  type ProtocolValidationReason,
} from '../src/protocol_codec_runtime';

const wire = {
  id: 'checkout-123',
  currency: 'USD',
  line_items: [],
  links: [],
  status: 'incomplete',
  totals: [],
  ucp: {version: EmbeddedCheckoutProtocol.specVersion},
  x_partner_data: {nested_key: 'value'},
  'com.example.foo': 'bar',
};

test('camelizes known schema fields on decode', () => {
  const decoded = decodeProtocolObject(wire, CheckoutModel, 'Checkout') as Record<
    string,
    unknown
  >;

  expect(decoded.lineItems).toEqual([]);
  expect('line_items' in decoded).toBe(false);
});

test('preserves unknown extension keys unchanged on decode', () => {
  const decoded = decodeProtocolObject(wire, CheckoutModel, 'Checkout') as Record<
    string,
    unknown
  >;

  expect(decoded.x_partner_data).toEqual({nested_key: 'value'});
  expect(decoded['com.example.foo']).toBe('bar');
  expect('xPartnerData' in decoded).toBe(false);
});

test('round-trips extension keys through decode + encode', () => {
  const decoded = decodeProtocolObject(wire, CheckoutModel, 'Checkout');
  const encoded = encodeProtocolObject(decoded, CheckoutModel) as Record<
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
    CheckoutModel,
    'Checkout',
  ) as Record<string, Array<Record<string, unknown>>>;

  expect(decoded.lineItems[0].parentId).toBe('parent-1');
  expect(decoded.lineItems[0].quantity).toBe(2);
  expect('parent_id' in decoded.lineItems[0]).toBe(false);
});

test('renames fields inside map values', () => {
  const decoded = decodeProtocolObject(
    {payment_handlers: {stripe: [{available_instruments: ['card']}]}},
    InstrumentsChangeResultUcpModel,
    'InstrumentsChangeResultUcp',
  ) as Record<string, Record<string, Array<Record<string, unknown>>>>;

  const handler = decoded.paymentHandlers.stripe[0];
  expect(handler.availableInstruments).toEqual(['card']);
  expect('available_instruments' in handler).toBe(false);
});

test('decodes compact rename entries for later model IDs', () => {
  const decoded = decodeProtocolObject(
    {street_address: '151 O’Connor St', address_country: 'CA'},
    PostalAddressModel,
    'PostalAddress',
  );

  expect(decoded).toEqual({streetAddress: '151 O’Connor St', addressCountry: 'CA'});
});

test('throws when a required string field is not a string', () => {
  expectValidationError(
    () => decodeProtocolObject({...wire, currency: 123}, CheckoutModel, 'Checkout'),
    'Checkout.currency',
    'invalid_type',
  );
});

test('treats structured-cloned undefined properties as absent without changing extension payloads', () => {
  const checkout = structuredClone({
    ...wire,
    buyer: {email: 'buyer@example.test', first_name: undefined},
    fulfillment: undefined,
    order: undefined,
    x_partner_data: {nested_key: 'value', optional_key: undefined},
  });
  const omitted = {
    ...wire,
    buyer: {email: 'buyer@example.test'},
    x_partner_data: {nested_key: 'value', optional_key: undefined},
  };

  expect(Object.hasOwn(checkout, 'order')).toBe(true);
  expect(decodeProtocolObject(checkout, CheckoutModel, 'Checkout')).toStrictEqual(
    decodeProtocolObject(omitted, CheckoutModel, 'Checkout'),
  );
  const decoded = decodeProtocolObject(checkout, CheckoutModel, 'Checkout');
  expect(decoded).not.toHaveProperty('order');
  expect(decoded).not.toHaveProperty('fulfillment');
  expect(decoded.buyer).not.toHaveProperty('firstName');
  expect(decoded.x_partner_data).toBe(checkout.x_partner_data);
  expect(checkout.order).toBeUndefined();
  expect(Object.hasOwn(checkout.buyer, 'first_name')).toBe(true);
});

test('decodes direct objects and JSON-serialized delivery the same way', () => {
  const checkout = structuredClone({
    ...wire,
    order: undefined,
    fulfillment: undefined,
  });
  const serializedCheckout = JSON.parse(JSON.stringify(checkout));

  expect(decodeProtocolObject(checkout, CheckoutModel, 'Checkout')).toStrictEqual(
    decodeProtocolObject(serializedCheckout, CheckoutModel, 'Checkout'),
  );
});

test('preserves schema-valid null instead of treating it as absent', () => {
  const decoded = decodeProtocolObject(
    {
      ...wire,
      fulfillment: {
        available_methods: [
          {line_item_ids: [], type: 'shipping', fulfillable_on: null},
        ],
        methods: undefined,
      },
    },
    CheckoutModel,
    'Checkout',
  );

  expect(decoded.fulfillment).toStrictEqual({
    availableMethods: [{lineItemIds: [], type: 'shipping', fulfillableOn: null}],
  });
});

test.each(['currency', 'totals', 'ucp'])(
  'rejects an undefined required Checkout.%s',
  field => {
    expectValidationError(
      () =>
        decodeProtocolObject(
          {...wire, [field]: undefined},
          CheckoutModel,
          'Checkout',
        ),
      `Checkout.${field}`,
      'missing_required',
    );
  },
);

test('rejects undefined and malformed required fields inside a present order', () => {
  const permalink_url = 'https://example.test/orders/order-1';

  expectValidationError(
    () =>
      decodeProtocolObject(
        {...wire, order: {id: undefined, permalink_url}},
        CheckoutModel,
        'Checkout',
      ),
    'Checkout.order.id',
    'missing_required',
  );
  expectValidationError(
    () =>
      decodeProtocolObject(
        {...wire, order: {id: 'order-1', permalink_url: undefined}},
        CheckoutModel,
        'Checkout',
      ),
    'Checkout.order.permalink_url',
    'missing_required',
  );
  expectValidationError(
    () => decodeProtocolObject({...wire, order: 123}, CheckoutModel, 'Checkout'),
    'Checkout.order',
    'invalid_type',
  );
});

test('requires the version of a present ucp object', () => {
  expectValidationError(
    () =>
      decodeProtocolObject(
        {...wire, ucp: {version: undefined}},
        CheckoutModel,
        'Checkout',
      ),
    'Checkout.ucp.version',
    'missing_required',
  );
});

test.each([
  [
    'order.id',
    {order: {id: 123, permalink_url: 'https://example.test/orders/order-1'}},
  ],
  ['order.permalink_url', {order: {id: 'order-1', permalink_url: null}}],
  ['ucp.version', {ucp: {version: {value: '2026-04-08'}}}],
])('rejects non-string Checkout.%s', (field, nested) => {
  expectValidationError(
    () => decodeProtocolObject({...wire, ...nested}, CheckoutModel, 'Checkout'),
    `Checkout.${field}`,
    'invalid_type',
  );
});

test('does not accept inherited required fields', () => {
  const inheritedCheckout = Object.create(wire) as Record<string, unknown>;
  expectValidationError(
    () => decodeProtocolObject(inheritedCheckout, CheckoutModel, 'Checkout'),
    'Checkout.currency',
    'missing_required',
  );

  const inheritedOrder = Object.create({id: 'order-1'}) as Record<
    string,
    unknown
  >;
  inheritedOrder.permalink_url = 'https://example.test/orders/order-1';
  expectValidationError(
    () =>
      decodeProtocolObject(
        {...wire, order: inheritedOrder},
        CheckoutModel,
        'Checkout',
      ),
    'Checkout.order.id',
    'missing_required',
  );
});

test('does not include a value in its validation error', () => {
  const malformedValue = {private_url: 'https://example.test/private/order-123'};
  expectValidationError(
    () =>
      decodeProtocolObject(
        {...wire, currency: malformedValue},
        CheckoutModel,
        'Checkout',
      ),
    'Checkout.currency',
    'invalid_type',
  );
  expect(new ProtocolValidationError('Checkout.raw\nsecret', 'invalid_type')).toMatchObject({
    modelPath: 'ProtocolObject',
    message: 'Invalid ProtocolObject',
  });
});

function expectValidationError(
  decode: () => unknown,
  modelPath: string,
  reason: ProtocolValidationReason,
) {
  try {
    decode();
    throw new Error('Expected protocol validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(ProtocolValidationError);
    expect(error).toMatchObject({
      modelPath,
      reason,
      message: `Invalid ${modelPath}`,
    });
  }
}
