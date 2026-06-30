import {describe, test, expect} from 'vitest';

import {
  PARSE_ERROR_CODE,
  PARSE_ERROR_MESSAGE,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  decodeProtocolMessage,
  isRequest,
  encodeJSONRPCResult,
  encodeJSONRPCError,
} from '../languages/typescript/src/codec';
import {url} from '../languages/typescript/src/url';
import {
  SPEC_VERSION,
  Delegations,
  checkoutProtocolRequestCatalog,
  requestDescriptors,
  embeddedCheckoutMethods,
} from '../languages/typescript/src/generated/ProtocolNotifications';
import {Convert} from '../languages/typescript/src/generated/Models';

const CHECKOUT_ENVELOPE = {
  id: 'checkout-123',
  currency: 'USD',
  status: 'incomplete',
  line_items: [],
  totals: [],
  links: [],
  ucp: {
    version: '2026-04-08',
    payment_handlers: {},
  },
};

const RESULT_FIXTURE = {
  ucp: {
    status: 'success',
    version: '2026-04-08',
  },
};

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
    });
  });

  test('embedded methods cover notifications and requests', () => {
    expect(embeddedCheckoutMethods.has('ec.start')).toBe(true);
    expect(embeddedCheckoutMethods.has('ec.ready')).toBe(true);
    expect(
      embeddedCheckoutMethods.has('ec.payment.instruments_change_request'),
    ).toBe(true);
    expect(embeddedCheckoutMethods.size).toBe(14);
  });
});

describe('codec', () => {
  test('exposes JSON-RPC error constants', () => {
    expect(PARSE_ERROR_CODE).toBe(-32700);
    expect(PARSE_ERROR_MESSAGE).toBe('Parse error');
    expect(INVALID_PARAMS_CODE).toBe(-32602);
    expect(INVALID_PARAMS_MESSAGE).toBe('Invalid params');
  });

  test('decodes a request when an id is present', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'ec.ready',
        id: 7,
        params: {delegate: []},
      }),
    );

    expect(message).toBeDefined();
    expect(message?.method).toBe('ec.ready');
    expect(message?.id).toBe(7);
    expect(message?.params).toEqual({delegate: []});
    expect(isRequest(message)).toBe(true);
  });

  test('treats a missing id as a notification', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: {}}),
    );

    expect(message?.id).toBeUndefined();
    expect(isRequest(message)).toBe(false);
  });

  test('treats an explicit null id as a request', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: null}),
    );

    expect(message?.id).toBeNull();
    expect(isRequest(message)).toBe(true);
  });

  test('drops a non-integer numeric id', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 1.5}),
    );

    expect(message?.id).toBeUndefined();
    expect(isRequest(message)).toBe(false);
  });

  test('returns undefined for malformed messages', () => {
    expect(decodeProtocolMessage('{not json')).toBeUndefined();
    expect(decodeProtocolMessage('5')).toBeUndefined();
    expect(
      decodeProtocolMessage(JSON.stringify({jsonrpc: '2.0', id: 1})),
    ).toBeUndefined();
  });

  test('encodes a result envelope', () => {
    expect(JSON.parse(encodeJSONRPCResult(7, {ok: true}))).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: {ok: true},
    });
  });

  test('encodes an error envelope', () => {
    expect(
      JSON.parse(
        encodeJSONRPCError(7, INVALID_PARAMS_CODE, INVALID_PARAMS_MESSAGE),
      ),
    ).toEqual({
      jsonrpc: '2.0',
      id: 7,
      error: {code: -32602, message: 'Invalid params'},
    });
  });
});

describe('url handshake', () => {
  test('appends the spec version', () => {
    expect(url('https://shop.example/checkout')).toBe(
      'https://shop.example/checkout?ec_version=2026-04-08',
    );
  });

  test('replaces an existing protocol version and preserves other query params', () => {
    const result = url('https://shop.example/c?ec_version=old&foo=bar');

    expect(result).toContain('foo=bar');
    expect(result.match(/ec_version=/g)).toHaveLength(1);
    expect(result).toContain('ec_version=2026-04-08');
  });

  test('encodes delegations, auth, and color scheme', () => {
    const result = url('https://shop.example/c', {
      delegations: [Delegations.paymentCredential, Delegations.windowOpen],
      auth: 'a b',
      colorScheme: 'dark',
    });

    expect(result).toContain('ec_delegate=payment.credential,window.open');
    expect(result).toContain('ec_auth=a%20b');
    expect(result).toContain('ec_color_scheme=dark');
  });

  test('preserves the fragment', () => {
    const result = url('https://shop.example/c#section');

    expect(result.endsWith('#section')).toBe(true);
    expect(result).toContain('ec_version=2026-04-08');
  });
});

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
