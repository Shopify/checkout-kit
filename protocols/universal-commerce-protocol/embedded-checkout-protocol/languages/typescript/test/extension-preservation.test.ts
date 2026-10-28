import {expect, test} from 'vitest';

import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';
import {Convert} from '../src/generated/Models';

// Smallest counterexample from the generated-model round-trip property.
test('Convert preserves an own __proto__ handler key without changing the map prototype', () => {
  const wire = {
    id: 'checkout-1', currency: 'USD', status: 'incomplete',
    line_items: [], links: [], totals: [],
    ucp: {
      version: EmbeddedCheckoutProtocol.specVersion,
      payment_handlers: JSON.parse('{"__proto__":[]}'),
    },
  };
  const checkout = Convert.toCheckout(JSON.stringify(wire));

  expect(Object.hasOwn(checkout.ucp.paymentHandlers, '__proto__')).toBe(true);
  expect(Object.getPrototypeOf(checkout.ucp.paymentHandlers)).toBe(Object.prototype);
  expect(JSON.parse(Convert.checkoutToJson(checkout))).toEqual(wire);
});

test('preserves unknown top-level and nested extension keys through Convert round-trip', () => {
  const wire = {
    id: 'checkout-123',
    currency: 'USD',
    line_items: [],
    links: [],
    status: 'incomplete',
    totals: [],
    ucp: {payment_handlers: {}, version: EmbeddedCheckoutProtocol.specVersion},
    signals: {
      'dev.ucp.buyer_ip': '203.0.113.7',
      'com.example.device_id': 'abc-123',
    },
    'com.example.foo': 'bar',
  };

  const checkout = Convert.toCheckout(JSON.stringify(wire));
  const roundTripped = JSON.parse(Convert.checkoutToJson(checkout));

  expect(roundTripped['com.example.foo']).toBe('bar');
  expect(roundTripped.signals['dev.ucp.buyer_ip']).toBe('203.0.113.7');
  expect(roundTripped.signals['com.example.device_id']).toBe('abc-123');
});
