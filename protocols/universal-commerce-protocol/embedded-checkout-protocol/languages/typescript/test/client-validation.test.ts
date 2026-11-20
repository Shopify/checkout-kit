import {expect, test, vi} from 'vitest';

import {
  Client,
  EmbeddedCheckoutProtocol,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  ProtocolValidationError,
  windowOpenSuccess,
  type DecodeErrorContext,
} from '../src';

const {Event, specVersion} = EmbeddedCheckoutProtocol;

test.each([
  {method: 'ec.ready', params: {}, modelPath: 'ReadyRequest.delegate', reason: 'missing_required'},
  {method: 'ec.window.open_request', params: {}, modelPath: 'WindowOpenRequest.url', reason: 'missing_required'},
  {method: 'ec.window.open_request', params: {url: null}, modelPath: 'WindowOpenRequest.url', reason: 'invalid_type'},
  {method: 'ec.window.open_request', params: {url: 123}, modelPath: 'WindowOpenRequest.url', reason: 'invalid_type'},
])('rejects malformed $method params $params without invoking its handler', async ({method, params, modelPath, reason}) => {
  const handler = vi.fn(() => windowOpenSuccess());
  const errors: DecodeErrorContext[] = [];
  const client = new Client()
    .onDecodeError(context => errors.push(context))
    .on(Event.ready, handler)
    .on(Event.windowOpen, handler);

  const response = await client.process(JSON.stringify({jsonrpc: '2.0', id: 'bad', method, params}));

  expect(JSON.parse(response!)).toEqual({
    jsonrpc: '2.0', id: 'bad',
    error: {code: INVALID_PARAMS_CODE, message: INVALID_PARAMS_MESSAGE},
  });
  expect(handler).not.toHaveBeenCalled();
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatchObject({method, params});
  expect(errors[0].error).toBeInstanceOf(ProtocolValidationError);
  expect(errors[0].error).toMatchObject({modelPath, reason});

  // A valid request on the same client proves rejection was not caused by
  // missing registration or a disabled dispatch path.
  const valid = method === 'ec.ready' ? {delegate: []} : {url: 'https://example.test/return'};
  const accepted = await client.process(JSON.stringify({jsonrpc: '2.0', id: 'good', method, params: valid}));
  expect(JSON.parse(accepted!)).toEqual({jsonrpc: '2.0', id: 'good', result: windowOpenSuccess()});
  expect(handler).toHaveBeenCalledExactlyOnceWith({jsonrpc: '2.0', id: 'good', method, params: valid});
  expect(errors).toHaveLength(1);
});

test.each([
  {error: {ucp: {version: specVersion}}, field: 'messages'},
  {error: {messages: []}, field: 'ucp'},
])('drops an error notification missing $field and reports its validation failure', async ({error, field}) => {
  const handler = vi.fn();
  const errors: DecodeErrorContext[] = [];
  const client = new Client()
    .onDecodeError(context => errors.push(context))
    .on(Event.error, handler);

  expect(await client.process(JSON.stringify({jsonrpc: '2.0', method: 'ec.error', params: {error}})))
    .toBeUndefined();
  expect(handler).not.toHaveBeenCalled();
  expect(errors).toHaveLength(1);
  expect(errors[0].error).toBeInstanceOf(ProtocolValidationError);
  expect(errors[0].error).toMatchObject({modelPath: `ErrorResponse.${field}`, reason: 'missing_required'});

  const valid = {messages: [], ucp: {version: specVersion}};
  expect(await client.process(JSON.stringify({jsonrpc: '2.0', method: 'ec.error', params: {error: valid}})))
    .toBeUndefined();
  expect(handler).toHaveBeenCalledExactlyOnceWith({jsonrpc: '2.0', method: 'ec.error', params: {error: valid}});
  expect(errors).toHaveLength(1);
});
