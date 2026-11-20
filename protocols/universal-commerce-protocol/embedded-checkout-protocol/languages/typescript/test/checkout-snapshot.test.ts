import {expect, test} from 'vitest';
import {decodeCheckoutSnapshot, ProtocolValidationError} from '../src';

const snapshot = {
  id: 'checkout-1',
  currency: 'USD',
  status: 'incomplete',
  line_items: [],
  links: [],
  totals: [],
};

test('decodes Kit snapshots without protocol metadata', () => {
  expect(decodeCheckoutSnapshot(snapshot)).toEqual({
    id: 'checkout-1', currency: 'USD', status: 'incomplete',
    lineItems: [], links: [], totals: [],
  });
  const withMetadata = {...snapshot, ucp: {version: 'ignored'}};
  expect(decodeCheckoutSnapshot(withMetadata)).not.toHaveProperty('ucp');
  expect(withMetadata).toHaveProperty('ucp.version', 'ignored');
});

test('converts schema fields while retaining extension and dictionary keys', () => {
  const decoded = decodeCheckoutSnapshot({
    ...snapshot,
    buyer: {first_name: 'Test', merchant_field: {nested_key: true}},
    actions: {'com.example.verify': [{id: 'a1', config: {custom_key: true}}]},
    attribution: {source_name: 'sample'},
    signals: {buyer_signal: {custom_key: 1}},
    custom_extension: {line_items: ['unchanged']},
    policies: [{id: 'p1', type: 'return', applies_to: ['$.line_items[0]']}],
    order: {id: 'order-1', permalink_url: 'https://example.test/orders/1'},
  });
  expect(decoded).toMatchObject({
    buyer: {firstName: 'Test', merchant_field: {nested_key: true}},
    actions: {'com.example.verify': [{id: 'a1', config: {custom_key: true}}]},
    attribution: {source_name: 'sample'},
    signals: {buyer_signal: {custom_key: 1}},
    custom_extension: {line_items: ['unchanged']},
    policies: [{appliesTo: ['$.line_items[0]']}],
    order: {permalinkUrl: 'https://example.test/orders/1'},
  });
});

test('treats undefined optional fields as absent', () => {
  const decoded = decodeCheckoutSnapshot({...snapshot, order: undefined, fulfillment: undefined});
  expect(decoded).not.toHaveProperty('order');
  expect(decoded).not.toHaveProperty('fulfillment');
});

test.each([null, [], 'checkout', 123])('reports invalid root snapshots through the validation contract', value => {
  expect(() => decodeCheckoutSnapshot(value)).toThrow(ProtocolValidationError);
  expect(() => decodeCheckoutSnapshot(value)).toThrow(expect.objectContaining({
    modelPath: 'Checkout',
    reason: 'invalid_type',
  }));
});

test.each(['id', 'currency', 'status'])('reports invalid snapshot %s through the validation contract', field => {
  expect(() => decodeCheckoutSnapshot({...snapshot, [field]: 123})).toThrow(
    expect.objectContaining({
      name: 'ProtocolValidationError',
      modelPath: `Checkout.${field}`,
      reason: 'invalid_type',
    }),
  );
});

test('reports a missing nested order field through the validation contract', () => {
  expect(() => decodeCheckoutSnapshot({...snapshot, order: {id: 'order-1'}})).toThrow(
    expect.objectContaining({
      name: 'ProtocolValidationError',
      modelPath: 'Checkout.order.permalink_url',
      reason: 'missing_required',
    }),
  );
});

test.each([
  {}, {...snapshot, line_items: null}, {...snapshot, totals: undefined},
])('rejects malformed snapshots', value => {
  expect(() => decodeCheckoutSnapshot(value)).toThrow(TypeError);
});


test('preserves __proto__ as an own extension without inheriting checkout fields', () => {
  const extension = JSON.parse('{"__proto__":{"order":{"id":1}}}');
  const decoded = decodeCheckoutSnapshot({...snapshot, ...extension, buyer: extension});
  expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
  expect(Object.prototype.hasOwnProperty.call(decoded, '__proto__')).toBe(true);
  expect(decoded.__proto__).toEqual({order: {id: 1}});
  expect(decoded).not.toHaveProperty('order');
  expect(Object.getPrototypeOf(decoded.buyer)).toBe(Object.prototype);
  expect(Object.prototype.hasOwnProperty.call(decoded.buyer, '__proto__')).toBe(true);
});

test.each([
  {...snapshot, lineItems: 'extension'},
  {lineItems: 'extension', ...snapshot},
  {...snapshot, continueUrl: 123},
  {...snapshot, buyer: {first_name: 'Test', firstName: 123}},
  {...snapshot, order: {id: 'order-1', permalink_url: 'https://example.test', permalinkUrl: 123}},
])('rejects extensions that occupy schema aliases regardless of key order', value => {
  expect(() => decodeCheckoutSnapshot(value)).toThrow(TypeError);
});
