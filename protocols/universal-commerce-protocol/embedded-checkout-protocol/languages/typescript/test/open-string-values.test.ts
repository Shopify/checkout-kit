import {describe, expect, test} from 'vitest';

import {Convert} from '../src/generated/Models';
import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';

const CHECKOUT_ENVELOPE = {
  id: 'checkout-123',
  currency: 'USD',
  line_items: [],
  links: [],
  status: 'incomplete',
  totals: [],
  ucp: {payment_handlers: {}, version: EmbeddedCheckoutProtocol.specVersion},
};

describe('open protocol string values', () => {
  test('decodes and re-encodes a checkout with a future status', () => {
    const wire = {...CHECKOUT_ENVELOPE, status: 'on_hold'};
    const checkout = Convert.toCheckout(JSON.stringify(wire));

    expect(checkout.status).toBe('on_hold');
    expect(JSON.parse(Convert.checkoutToJson(checkout))).toEqual(wire);
  });

  test('encodes a future status accepted by the public TypeScript type', () => {
    const checkout = Convert.toCheckout(JSON.stringify(CHECKOUT_ENVELOPE));
    checkout.status = 'on_hold';

    expect(JSON.parse(Convert.checkoutToJson(checkout)).status).toBe('on_hold');
  });

  test.each([null, 42, true, {}, []].map(status => ({status})))('rejects a non-string status: $status', ({status}) => {
    expect(() => Convert.toCheckout(JSON.stringify({...CHECKOUT_ENVELOPE, status}))).toThrow();
    const checkout = Convert.toCheckout(JSON.stringify(CHECKOUT_ENVELOPE));
    Object.assign(checkout, {status});
    expect(() => Convert.checkoutToJson(checkout)).toThrow();
  });

  test('still requires the status field', () => {
    const {status: _status, ...wire} = CHECKOUT_ENVELOPE;

    expect(() => Convert.toCheckout(JSON.stringify(wire))).toThrow();
  });
});
