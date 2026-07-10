import {describe, test, expect} from 'vitest';

import {
  PARSE_ERROR_CODE,
  PARSE_ERROR_MESSAGE,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  decodeProtocolMessage,
  encodeJSONRPCResult,
  encodeJSONRPCError,
} from '../src/codec';

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

  test('drops a message whose id is present but invalid', () => {
    expect(
      decodeProtocolMessage(
        JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: 1.5}),
      ),
    ).toBeUndefined();
    expect(
      decodeProtocolMessage(
        JSON.stringify({jsonrpc: '2.0', method: 'ec.ready', id: {}}),
      ),
    ).toBeUndefined();
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
