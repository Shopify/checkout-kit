import {describe, test, expect} from 'vitest';

import {
  SPEC_VERSION,
  Delegations,
  checkoutProtocolRequestCatalog,
  embeddedCheckoutMethods,
} from '../src/generated/ProtocolNotifications';

describe('spec metadata', () => {
  test('exposes the spec version', () => {
    expect(SPEC_VERSION).toBe('2026-04-08');
  });

  test('exposes the declared delegations', () => {
    expect({...Delegations}).toEqual({
      paymentInstrumentsChange: 'payment.instruments_change',
      paymentCredential: 'payment.credential',
      fulfillmentAddressChange: 'fulfillment.address_change',
      windowOpen: 'window.open',
    });
  });

  test('request catalog maps descriptors to wire methods', () => {
    expect({...checkoutProtocolRequestCatalog}).toEqual({
      ready: 'ec.ready',
      auth: 'ec.auth',
      paymentInstrumentsChange: 'ec.payment.instruments_change_request',
      paymentCredential: 'ec.payment.credential_request',
      fulfillmentAddressChange: 'ec.fulfillment.address_change_request',
      windowOpen: 'ec.window.open_request',
    });
  });

  test('embedded methods cover notifications and requests', () => {
    expect(embeddedCheckoutMethods.has('ec.start')).toBe(true);
    expect(embeddedCheckoutMethods.has('ec.ready')).toBe(true);
    expect(
      embeddedCheckoutMethods.has('ec.payment.instruments_change_request'),
    ).toBe(true);
    expect(embeddedCheckoutMethods.size).toBe(15);
  });
});
