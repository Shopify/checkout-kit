import {test, expect} from 'vitest';

import {
  generatedCheckoutProtocol,
  generatedCheckoutProtocolPayloadDecoders,
} from '../languages/typescript/src/generated/ProtocolNotifications';

const EXPECTED_PROTOCOL = {
  error: 'ec.error',
  start: 'ec.start',
  complete: 'ec.complete',
  messagesChange: 'ec.messages.change',
  lineItemsChange: 'ec.line_items.change',
  buyerChange: 'ec.buyer.change',
  totalsChange: 'ec.totals.change',
  paymentChange: 'ec.payment.change',
  fulfillmentChange: 'ec.fulfillment.change',
};

const EXPECTED_REQUEST_METHODS = [
  'ec.ready',
  'ec.auth',
  'ec.payment.instruments_change_request',
  'ec.payment.credential_request',
  'ec.window.open_request',
  'ec.fulfillment.address_change_request',
];

test('exposes exactly the ec.* notification protocol map', () => {
  expect({...generatedCheckoutProtocol}).toEqual(EXPECTED_PROTOCOL);
});

test('wires a payload decoder for every notification method', () => {
  expect(Object.keys(generatedCheckoutProtocolPayloadDecoders).sort()).toEqual(
    Object.values(EXPECTED_PROTOCOL).sort(),
  );

  for (const decode of Object.values(generatedCheckoutProtocolPayloadDecoders)) {
    expect(typeof decode).toBe('function');
  }
});

test('excludes ec.* request methods that define a result', () => {
  const methods = Object.values(generatedCheckoutProtocol);

  for (const requestMethod of EXPECTED_REQUEST_METHODS) {
    expect(
      methods,
      `${requestMethod} defines a result and must not be a notification`,
    ).not.toContain(requestMethod);
  }
});
