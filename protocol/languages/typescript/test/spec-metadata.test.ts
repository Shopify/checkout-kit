import {readFileSync} from 'node:fs';
import {describe, test, expect} from 'vitest';

import {
  SPEC_VERSION,
  Delegations,
  checkoutProtocolRequestCatalog,
  embeddedCheckoutMethods,
} from '../src/generated/ProtocolNotifications';

const {protocolVersion} = JSON.parse(
  readFileSync(new URL('../../../source-lock.json', import.meta.url), 'utf8'),
);

describe('spec metadata', () => {
  test('exposes the pinned spec version', () => {
    expect(SPEC_VERSION).toBe(protocolVersion);
  });

  // Catch skipped regeneration in every language even when fixtures use the
  // generated constants. These files are emitted by the codegen commands in CI.
  test.each([
    [
      'Swift',
      '../../swift/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Generated/EmbeddedCheckoutProtocol+Event.swift',
      'public static let specVersion =',
    ],
    [
      'Kotlin',
      '../../kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/EmbeddedCheckoutProtocol.kt',
      'public const val SPEC_VERSION: String =',
    ],
  ])('keeps the generated %s version aligned with the lockfile', (_language, file, declaration) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(source).toContain(`${declaration} "${protocolVersion}"`);
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
