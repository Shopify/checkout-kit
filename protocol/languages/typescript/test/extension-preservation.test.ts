import {expect, test} from 'vitest';

import {Convert} from '../src/generated/Models';

test('preserves unknown top-level and nested extension keys through Convert round-trip', () => {
  const wire = {
    id: 'checkout-123',
    currency: 'USD',
    line_items: [],
    links: [],
    status: 'incomplete',
    totals: [],
    ucp: {payment_handlers: {}, version: '2026-04-08'},
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
