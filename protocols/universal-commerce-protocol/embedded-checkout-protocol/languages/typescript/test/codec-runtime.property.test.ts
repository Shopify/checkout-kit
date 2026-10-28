import {deepStrictEqual} from 'node:assert';

import fc from 'fast-check';
import {describe, expect, test} from 'vitest';

import {Convert} from '../src/generated/Models';
import {SPEC_VERSION} from '../src/generated/ProtocolNotifications';
import {
  decodeProtocolObject,
  encodeProtocolObject,
  ProtocolValidationError,
} from '../src/protocol_codec_runtime';
import {propertyOptions} from './property-options';

const text = fc.string({unit: 'binary', maxLength: 24});
const json = fc.jsonValue({maxDepth: 3});
const extensionKey = fc.oneof(
  text.map(key => `com.example.${key}`),
  fc.constantFrom('__proto__', 'constructor', 'prototype'),
);
const extensions = fc.dictionary(extensionKey, json, {maxKeys: 4, noNullPrototype: true});

// Construct a small wire payload independently of the rename map. Keeping
// the fixed envelope small also makes shrunk failures useful as regressions.
const checkout = fc.record({
  id: text,
  status: text.map(value => `future_${value}`),
  topLevelExtensions: extensions,
  buyerExtensions: extensions,
  firstName: text,
  lineItems: fc.array(fc.record({parentId: text, extensions}), {maxLength: 4}),
  paymentHandlers: fc.dictionary(
    fc.oneof(text, fc.constantFrom('__proto__', 'constructor', 'prototype')),
    fc.array(extensions.map(extra => ({
      id: 'handler-1',
      version: SPEC_VERSION,
      available_instruments: [{type: 'card'}],
      ...extra,
    })), {maxLength: 3}),
    // JSON.parse produces ordinary objects; prototype normalization is outside
    // the wire-data round-trip contract.
    {minKeys: 1, maxKeys: 3, noNullPrototype: true},
  ),
}).map(({id, status, topLevelExtensions, buyerExtensions, firstName, lineItems, paymentHandlers}) => ({
  ...topLevelExtensions,
  id,
  currency: 'USD',
  status,
  buyer: {...buyerExtensions, first_name: firstName},
  line_items: lineItems.map(item => ({
    ...item.extensions,
    id: 'line-1',
    item: {id: 'item-1', title: 'Example item', price: 100},
    quantity: 1,
    totals: [],
    parent_id: item.parentId,
  })),
  totals: [],
  links: [],
  ucp: {version: SPEC_VERSION, payment_handlers: paymentHandlers},
}));

describe('codec runtime properties', () => {
  test('round-trips nested extensions and future strings without mutating the input', () => {
    fc.assert(fc.property(checkout, wire => {
      const before = structuredClone(wire);
      const decoded = decodeProtocolObject(wire, 'Checkout') as {
        buyer: {firstName: string};
        lineItems: {parentId: string}[];
        ucp: {paymentHandlers: Record<string, {availableInstruments: unknown}[]>};
      };

      // Independent expectations catch paired encoder/decoder mistakes that
      // could cancel each other out in a round-trip assertion alone.
      expect(decoded.buyer.firstName).toBe(wire.buyer.first_name);
      expect(decoded.lineItems.map(item => item.parentId))
        .toEqual(wire.line_items.map(item => item.parent_id));
      for (const [key, handlers] of Object.entries(wire.ucp.payment_handlers)) {
        expect(Object.hasOwn(decoded.ucp.paymentHandlers, key)).toBe(true);
        expect(decoded.ucp.paymentHandlers[key]!.map(
          handler => handler.availableInstruments,
        )).toEqual(handlers.map(handler => handler.available_instruments));
      }
      expect(Object.getPrototypeOf(decoded.ucp.paymentHandlers)).toBe(Object.prototype);
      // Node compares own `constructor` keys as data. Vitest's strict matcher
      // also treats them as type information, which misidentifies JSON objects.
      deepStrictEqual(encodeProtocolObject(decoded, 'Checkout'), wire);
      deepStrictEqual(wire, before);
    }), propertyOptions());
  });

  test('structured-clone and JSON delivery agree on absent optional model fields', () => {
    fc.assert(fc.property(checkout, fc.subarray(['context', 'order', 'fulfillment']), (wire, fields) => {
      // Isolate optional-field normalization from JSON's unrelated conversion
      // of -0 to 0 inside extension values.
      const canonical = JSON.parse(JSON.stringify(wire)) as typeof wire;
      const direct: Record<string, unknown> = structuredClone(canonical);
      for (const field of fields) direct[field] = undefined;
      const buyer = {...canonical.buyer, first_name: undefined};
      direct.buyer = buyer;
      const serialized = JSON.parse(JSON.stringify(direct));

      deepStrictEqual(
        decodeProtocolObject(direct, 'Checkout'),
        decodeProtocolObject(serialized, 'Checkout'),
      );
      expect(Object.hasOwn(buyer, 'first_name')).toBe(true);
    }), propertyOptions());
  });

  test('reserved camel-case aliases cannot overwrite schema fields', () => {
    fc.assert(fc.property(
      checkout,
      fc.constantFrom(
        ['lineItems', 'line_items'] as const,
        ['continueUrl', 'continue_url'] as const,
        ['expiresAt', 'expires_at'] as const,
      ),
      json,
      (wire, [alias, field], value) => {
        expect(() => decodeProtocolObject({...wire, [alias]: value}, 'Checkout'))
          .toThrowError(expect.objectContaining({
            name: 'ProtocolValidationError',
            modelPath: `Checkout.${field}`,
            reason: 'invalid_type',
          }));
      },
    ), propertyOptions());
  });

  test('invalid required strings fail with an error that excludes payload values', () => {
    fc.assert(fc.property(checkout, fc.constantFrom('id', 'currency'), text, (wire, field, value) => {
      const malformed = {...wire, [field]: {private_value: value}};
      let failure: unknown;
      try {
        decodeProtocolObject(malformed, 'Checkout');
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(ProtocolValidationError);
      expect(failure).toMatchObject({
        modelPath: `Checkout.${field}`,
        reason: 'invalid_type',
        message: `Invalid Checkout.${field}`,
      });
    }), propertyOptions());
  });

  test('generated models round-trip extensions, arbitrary handler keys and future strings', () => {
    fc.assert(fc.property(checkout, wire => {
      const serialized = JSON.stringify(wire);
      const decoded = Convert.toCheckout(serialized);

      expect(decoded.status).toBe(wire.status);
      for (const key of Object.keys(wire.ucp.payment_handlers)) {
        expect(Object.hasOwn(decoded.ucp.paymentHandlers, key)).toBe(true);
      }
      expect(Object.getPrototypeOf(decoded.ucp.paymentHandlers)).toBe(Object.prototype);
      // Convert's public boundary is JSON, which canonicalizes values such as -0.
      deepStrictEqual(JSON.parse(Convert.checkoutToJson(decoded)), JSON.parse(serialized));
    }), propertyOptions());
  });
});
