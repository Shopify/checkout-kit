import {describe, test, expect} from 'vitest';

import {Client} from '../src/client';
import {
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  METHOD_NOT_FOUND_CODE,
  METHOD_NOT_FOUND_MESSAGE,
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
} from '../src/codec';
import {
  notificationDescriptors,
  requestDescriptors,
} from '../src/generated/ProtocolNotifications';
import {Convert} from '../src/generated/Models';
import {CHECKOUT_ENVELOPE, RESULT_FIXTURE} from './fixtures';

describe('Client', () => {
  const READY_PARAMS = {delegate: ['payment.credential'], auth: {type: 'oauth'}};

  test('dispatches a notification to its registered handler', async () => {
    const received = [];
    const client = new Client().on(notificationDescriptors.start, checkout =>
      received.push(checkout),
    );

    const response = await client.process(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'ec.start',
        params: {checkout: CHECKOUT_ENVELOPE},
      }),
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
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'ec.start',
          params: {checkout: CHECKOUT_ENVELOPE},
        }),
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

  test('ignores a notification whose params fail to decode', async () => {
    const received = [];
    const client = new Client().on(notificationDescriptors.start, checkout =>
      received.push(checkout),
    );

    await expect(
      client.process(
        JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: {}}),
      ),
    ).resolves.toBeUndefined();
    await expect(
      client.process(
        JSON.stringify({jsonrpc: '2.0', method: 'ec.start', params: null}),
      ),
    ).resolves.toBeUndefined();

    expect(received).toHaveLength(0);
  });

  test('routes a request whose optional params are absent', async () => {
    const client = new Client().on(requestDescriptors.auth, () =>
      Convert.toAuthResult(JSON.stringify(RESULT_FIXTURE)),
    );

    const response = await client.process(
      JSON.stringify({jsonrpc: '2.0', method: 'ec.auth', id: 11}),
    );

    expect(JSON.parse(response)).toEqual({
      jsonrpc: '2.0',
      id: 11,
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
