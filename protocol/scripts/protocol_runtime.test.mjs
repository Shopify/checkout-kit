import {describe, test, expect} from 'vitest';

import {Client} from '../languages/typescript/src/client';
import {
  PARSE_ERROR_CODE,
  PARSE_ERROR_MESSAGE,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  METHOD_NOT_FOUND_CODE,
  METHOD_NOT_FOUND_MESSAGE,
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  decodeProtocolMessage,
  encodeJSONRPCResult,
  encodeJSONRPCError,
} from '../languages/typescript/src/codec';
import {url} from '../languages/typescript/src/url';
import {
  SPEC_VERSION,
  Delegations,
  checkoutProtocolRequestCatalog,
  notificationDescriptors,
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
    expect(message?.kind).toBe('request');
    expect(message?.method).toBe('ec.ready');
    expect(message?.id).toBe(7);
    expect(message?.params).toEqual({delegate: []});
  });

  test('treats a missing id as a notification', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: {}}),
    );

    expect(message?.kind).toBe('notification');
    expect(message?.id).toBeUndefined();
  });

  test('treats an explicit null id as a request', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: null}),
    );

    expect(message?.kind).toBe('request');
    expect(message?.id).toBeNull();
  });

  test('drops a non-integer numeric id to a notification', () => {
    const message = decodeProtocolMessage(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 1.5}),
    );

    expect(message?.kind).toBe('notification');
    expect(message?.id).toBeUndefined();
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

describe('Client', () => {
  const READY_PARAMS = {delegate: ['payment.credential'], auth: {type: 'oauth'}};

  test('dispatches a notification to its registered handler', async () => {
    const received = [];
    const client = new Client().on(notificationDescriptors.start, checkout =>
      received.push(checkout),
    );

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: CHECKOUT_ENVELOPE}),
    );

    expect(response).toBeUndefined();
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('checkout-123');
    expect(received[0].lineItems).toEqual([]);
  });

  test('ignores a notification with no registered handler', async () => {
    const client = new Client();

    await expect(
      client.process(
        JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: CHECKOUT_ENVELOPE}),
      ),
    ).resolves.toBeUndefined();
  });

  test('routes a request through decode, handler, and encode', async () => {
    let handledPayload;
    const client = new Client().on(requestDescriptors.ready, payload => {
      handledPayload = payload;
      return Convert.toReadyResult(JSON.stringify(RESULT_FIXTURE));
    });

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 7, params: READY_PARAMS}),
    );

    expect(handledPayload).toEqual(READY_PARAMS);
    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: RESULT_FIXTURE,
    });
  });

  test('awaits an async request handler', async () => {
    const client = new Client().on(requestDescriptors.ready, async () =>
      Promise.resolve(Convert.toReadyResult(JSON.stringify(RESULT_FIXTURE))),
    );

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 'r-1', params: READY_PARAMS}),
    );

    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 'r-1',
      result: RESULT_FIXTURE,
    });
  });

  test('returns method_not_found for an unregistered request', async () => {
    const client = new Client();

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.auth', id: 9, params: {type: 'oauth'}}),
    );

    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 9,
      error: {code: METHOD_NOT_FOUND_CODE, message: METHOD_NOT_FOUND_MESSAGE},
    });
  });

  test('returns invalid_params when the payload fails to decode', async () => {
    const client = new Client().on(requestDescriptors.paymentInstrumentsChange, () => {
      throw new Error('handler should not run');
    });

    const response = await client.process(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'ec.payment.instruments_change_request',
        id: 3,
        params: {checkout: {}},
      }),
    );

    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 3,
      error: {code: INVALID_PARAMS_CODE, message: INVALID_PARAMS_MESSAGE},
    });
  });

  test('returns internal_error when the handler throws', async () => {
    const client = new Client().on(requestDescriptors.ready, () => {
      throw new Error('boom');
    });

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 5, params: READY_PARAMS}),
    );

    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 5,
      error: {code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE},
    });
  });

  test('ignores a malformed message', async () => {
    const client = new Client();

    await expect(client.process('{not json')).resolves.toBeUndefined();
  });
});
