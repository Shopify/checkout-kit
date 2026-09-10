import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';

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
  return JSON.parse(bytes);
}

describe('wire-version compatibility', () => {
  test.each(['2026-08-25', '2026-04-08'])('decodes and preserves the %s checkout', (version) => {
    const wire = fixture('checkout-' + version).params.checkout;
    const checkout = decodeCheckout(wire);
    const converted = Convert.toCheckout(JSON.stringify(wire));
    expect(checkout.ucp.version).toBe(version);
    expect(converted.ucp.version).toBe(version);
    expect(checkout.fulfillment!.methods![0].type).toBe(version === '2026-08-25' ? 'drone_delivery' : 'shipping');
    for (const decoded of [checkout, converted]) {
      const location = decoded.fulfillment!.methods![1].destinations![0];
      expect(location.id).toBe('location-1');
      expect(location.name).toBe('Example Pickup Store');
      // April retail locations predate the August destination discriminator.
      expect(location.type).toBe(version === '2026-08-25' ? 'business_location' : undefined);
      expect(location.address!.streetAddress).toBe('456 Example Avenue');
      expect(location.address!.extendedAddress).toBe('Suite 2');
      expect(location.address!.addressLocality).toBe('Example City');
      expect(location.address!.addressRegion).toBe('NY');
      expect(location.address!.addressCountry).toBe('US');
      expect(location.address!.postalCode).toBe('10002');
    }
    expect(encodeProtocolObject(checkout, 'Checkout')).toEqual(wire);
    expect(JSON.parse(Convert.checkoutToJson(converted))).toEqual(wire);
    if (version === '2026-08-25') {
      expect(checkout.ucp.mapOrder).toEqual({payment_handlers: ['com.example.wallet']});
      expect(checkout.fulfillment!.availableMethods![0].type).toBe('drone_delivery');
    }
  });

  test('retains April error-payload compatibility', () => {
    const wire = fixture('error-2026-04-08').params.error;
    const error = decodeErrorResponse(wire);
    expect(error.ucp.version).toBe('2026-04-08');
    expect(error.messages[0].content).toBe('Try again.');
  });
});
