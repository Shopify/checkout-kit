export const PARSE_ERROR_CODE = -32700;
export const PARSE_ERROR_MESSAGE = 'Parse error';
export const INVALID_PARAMS_CODE = -32602;
export const INVALID_PARAMS_MESSAGE = 'Invalid params';
export const METHOD_NOT_FOUND_CODE = -32601;
export const METHOD_NOT_FOUND_MESSAGE = 'Method not found';
export const INTERNAL_ERROR_CODE = -32603;
export const INTERNAL_ERROR_MESSAGE = 'Internal error';

export type JSONRPCID = string | number | null;

export type DecodedMessage =
  | {
      readonly kind: 'request';
      readonly method: string;
      readonly id: JSONRPCID;
      readonly params: unknown;
    }
  | {
      readonly kind: 'notification';
      readonly method: string;
      readonly params: unknown;
    };

function normalizeId(id: unknown): JSONRPCID | undefined {
  if (id === undefined) {
    return undefined;
  }
  if (id === null) {
    return null;
  }
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'number' && Number.isInteger(id)) {
    return id;
  }
  return undefined;
}

export function decodeProtocolMessage(
  message: string,
): DecodedMessage | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }

  const envelope = parsed as {
    method?: unknown;
    id?: unknown;
    params?: unknown;
  };

  if (typeof envelope.method !== 'string') {
    return undefined;
  }

  const id = normalizeId(envelope.id);
  if (id === undefined) {
    return {
      kind: 'notification',
      method: envelope.method,
      params: envelope.params,
    };
  }

  return {
    kind: 'request',
    method: envelope.method,
    id,
    params: envelope.params,
  };
}

export function encodeJSONRPCResult(id: JSONRPCID, result: unknown): string {
  return JSON.stringify({jsonrpc: '2.0', id, result});
}

export function encodeJSONRPCError(
  id: JSONRPCID,
  code: number,
  message: string,
): string {
  return JSON.stringify({jsonrpc: '2.0', id, error: {code, message}});
}
