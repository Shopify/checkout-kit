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

  test('decode camelizes the checkout envelope for delegated requests', () => {
    const decoded = requestDescriptors.paymentInstrumentsChange.decode({
      checkout: CHECKOUT_ENVELOPE,
    });

    expect(decoded.checkout.id).toBe('checkout-123');
    expect(decoded.checkout.lineItems[0].totals[0].displayText).toBe(
      'Subtotal',
    );
    expect(decoded.checkout.buyer.firstName).toBe('Ada');
    expect(decoded.checkout.context.addressCountry).toBe('CA');
    expect(
      decoded.checkout.ucp.paymentHandlers['com.shopify.payments'][0]
        .availableInstruments,
    ).toHaveLength(1);
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
  test('decode camelizes the checkout envelope', () => {
    const decoded = notificationDescriptors.start.decode({
      checkout: CHECKOUT_ENVELOPE,
    });

    expect(decoded.checkout.id).toBe('checkout-123');
    expect(decoded.checkout.lineItems[0].item.imageUrl).toBe(
      'https://cdn.example.com/products/beanie.png',
    );
    expect(decoded.checkout.fulfillment.methods[0].lineItemIds).toEqual([
      'line-1',
      'line-2',
    ]);
    expect(decoded.checkout.payment.instruments[0].handlerId).toBe(
      'com.shopify.payments',
    );
    expect(decoded.checkout['com.example.custom'].loyalty_tier).toBe('gold');
  });

  test('decode camelizes the error envelope', () => {
    const decoded = notificationDescriptors.error.decode({
      error: {
        messages: [],
        ucp: {version: '2026-04-08', status: 'error', payment_handlers: {}},
      },
    });

    expect(decoded.error.ucp.status).toBe('error');
  });
});
