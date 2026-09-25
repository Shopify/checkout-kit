import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';

import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';
import {Convert} from '../src/generated/Models';
import {decodeCheckout, decodeErrorResponse} from '../src/generated/ProtocolCodecs';
import {encodeProtocolObject} from '../src/protocol_codec_runtime';

function fixture(name: string) {
  const bytes = readFileSync(new URL('./fixtures/' + name + '.json', import.meta.url), 'utf8');
  // SwiftPM bundles resources inside its test target; JVM tests use classpath
  // resources. Keep the three harness-native copies byte-for-byte equivalent.
  for (const directory of [
    '../../swift/Tests/EmbeddedCheckoutProtocolTests/Fixtures/',
    '../../kotlin/embedded-checkout-protocol/src/test/resources/',
  ]) {
    expect(readFileSync(new URL(directory + name + '.json', import.meta.url), 'utf8')).toBe(bytes);
  }
  return JSON.parse(bytes.replaceAll('{{SPEC_VERSION}}', EmbeddedCheckoutProtocol.specVersion));
}

describe('pinned protocol payloads', () => {
  test.each(['checkout-shipping', 'checkout-custom-fulfillment'])('decodes and preserves %s', (name) => {
    const customFulfillment = name === 'checkout-custom-fulfillment';
    const wire = fixture(name).params.checkout;
    const checkout = decodeCheckout(wire);
    const converted = Convert.toCheckout(JSON.stringify(wire));
    expect(checkout.ucp.version).toBe(EmbeddedCheckoutProtocol.specVersion);
    expect(converted.ucp.version).toBe(EmbeddedCheckoutProtocol.specVersion);
    expect(checkout.fulfillment!.methods![0].type).toBe(customFulfillment ? 'drone_delivery' : 'shipping');
    const expectedDescription =
      customFulfillment
        ? {
            plain: 'Arrives in 3-5 business days',
            markdown: 'Arrives in **3-5 business days**',
            html: '<p>Arrives in <strong>3-5 business days</strong></p>',
          }
        : {plain: 'Arrives in 3-5 business days'};
    for (const decoded of [checkout, converted]) {
      expect(decoded.fulfillment!.methods![0].groups![0].options![0].description).toEqual(
        expectedDescription,
      );
      const location = decoded.fulfillment!.methods![1].destinations![0];
      expect(location.id).toBe('location-1');
      expect(location.name).toBe('Example Pickup Store');
      expect(location.type).toBe('business_location');
      expect(location.address!.streetAddress).toBe('456 Example Avenue');
      expect(location.address!.extendedAddress).toBe('Suite 2');
      expect(location.address!.addressLocality).toBe('Example City');
      expect(location.address!.addressRegion).toBe('NY');
      expect(location.address!.addressCountry).toBe('US');
      expect(location.address!.postalCode).toBe('10002');
    }
    expect(checkout.fulfillment!.methods![0].destinations![0].type).toBe('shipping_address');
    expect(encodeProtocolObject(checkout, 'Checkout')).toEqual(wire);
    expect(JSON.parse(Convert.checkoutToJson(converted))).toEqual(wire);
    expect(checkout.ucp.mapOrder).toEqual(
      customFulfillment ? {payment_handlers: ['com.example.wallet']} : undefined,
    );
    expect(checkout.fulfillment!.availableMethods![0].type).toBe(
      customFulfillment ? 'drone_delivery' : 'shipping',
    );
  });

  test('decodes an error payload', () => {
    const wire = fixture('error').params.error;
    const error = decodeErrorResponse(wire);
    expect(error.ucp.version).toBe(EmbeddedCheckoutProtocol.specVersion);
    expect(error.messages[0].content).toBe('Try again.');
    expect(error.messages[0].severity).toBe('unrecoverable');
  });
});
