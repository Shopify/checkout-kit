import {describe, test, expect} from 'vitest';

import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';
import {Client} from '../src/client';
import {url} from '../src/url';
import {
  Delegations,
  SPEC_VERSION,
  notificationDescriptors,
  requestDescriptors,
} from '../src/generated/ProtocolNotifications';

describe('EmbeddedCheckoutProtocol facade', () => {
  test('exposes the spec version', () => {
    expect(EmbeddedCheckoutProtocol.specVersion).toBe(SPEC_VERSION);
  });

  test('re-exports the delegations, url helper, and Client class', () => {
    expect(EmbeddedCheckoutProtocol.Delegations).toBe(Delegations);
    expect(EmbeddedCheckoutProtocol.url).toBe(url);
    expect(EmbeddedCheckoutProtocol.Client).toBe(Client);
  });

  test('merges notification and request descriptors under Event', () => {
    expect(EmbeddedCheckoutProtocol.Event).toEqual({
      ...notificationDescriptors,
      ...requestDescriptors,
    });
  });
});
