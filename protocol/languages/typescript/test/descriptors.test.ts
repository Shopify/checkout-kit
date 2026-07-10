import {describe, test, expect} from 'vitest';

import {
  Delegations,
  notificationDescriptors,
  requestDescriptors,
} from '../src/generated/ProtocolNotifications';
import {Convert} from '../src/generated/Models';
import {CHECKOUT_ENVELOPE, RESULT_FIXTURE} from './fixtures';

describe('request descriptors', () => {
  test('carry their wire method and delegation', () => {
    expect(requestDescriptors.ready.method).toBe('ec.ready');
    expect(requestDescriptors.ready.delegation).toBeNull();
    expect(requestDescriptors.auth.method).toBe('ec.auth');
    expect(requestDescriptors.auth.delegation).toBeNull();
    expect(requestDescriptors.paymentInstrumentsChange.delegation).toBe(
      Delegations.paymentInstrumentsChange,
    );
    expect(requestDescriptors.paymentCredential.delegation).toBe(
      Delegations.paymentCredential,
    );
    expect(requestDescriptors.fulfillmentAddressChange.delegation).toBe(
      Delegations.fulfillmentAddressChange,
    );
  });

  test('decode whole-params requests', () => {
    expect(
      requestDescriptors.ready.decode({
        delegate: ['payment.credential'],
        auth: {type: 'oauth'},
      }),
    ).toEqual({delegate: ['payment.credential'], auth: {type: 'oauth'}});

    expect(requestDescriptors.auth.decode({type: 'oauth'})).toEqual({
      type: 'oauth',
    });
  });

  test('decode defaults absent whole-params to an empty payload', () => {
    expect(requestDescriptors.auth.decode(undefined)).toEqual({});
  });

  test('decode unwraps the checkout envelope for delegated requests', () => {
    const decoded = requestDescriptors.paymentInstrumentsChange.decode({
      checkout: CHECKOUT_ENVELOPE,
    });

    expect(decoded.id).toBe('checkout-123');
    expect(decoded.lineItems).toEqual([]);
  });

  test('encode round-trips a result back to the wire shape', () => {
    const readyResult = Convert.toReadyResult(JSON.stringify(RESULT_FIXTURE));
    expect(requestDescriptors.ready.encode(readyResult)).toEqual(RESULT_FIXTURE);

    const instrumentsResult = Convert.toInstrumentsChangeResult(
      JSON.stringify(RESULT_FIXTURE),
    );
    expect(
      requestDescriptors.paymentInstrumentsChange.encode(instrumentsResult),
    ).toEqual(RESULT_FIXTURE);
  });
});

describe('notification descriptors', () => {
  test('decode unwraps the checkout envelope', () => {
    const decoded = notificationDescriptors.start.decode({
      checkout: CHECKOUT_ENVELOPE,
    });

    expect(decoded.id).toBe('checkout-123');
    expect(decoded.lineItems).toEqual([]);
  });

  test('decode unwraps the error envelope', () => {
    const decoded = notificationDescriptors.error.decode({
      error: {
        messages: [],
        ucp: {version: '2026-04-08', status: 'error', payment_handlers: {}},
      },
    });

    expect(decoded.ucp.status).toBe('error');
  });
});
