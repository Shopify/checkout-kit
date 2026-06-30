export const PARSE_ERROR_CODE = -32700;
export const PARSE_ERROR_MESSAGE = 'Parse error';
export const INVALID_PARAMS_CODE = -32602;
export const INVALID_PARAMS_MESSAGE = 'Invalid params';

export type JSONRPCID = string | number | null;

export interface JSONRPCMessage {
  readonly jsonrpc: string;
  readonly method: string;
  readonly id: JSONRPCID | undefined;
  readonly params: unknown;
}

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

export function decodeProtocolMessage(message: string): JSONRPCMessage | undefined {
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
    jsonrpc?: unknown;
    method?: unknown;
    id?: unknown;
    params?: unknown;
  };

  if (typeof envelope.method !== 'string') {
    return undefined;
  }

  return {
    jsonrpc: typeof envelope.jsonrpc === 'string' ? envelope.jsonrpc : '2.0',
    method: envelope.method,
    id: normalizeId(envelope.id),
    params: envelope.params,
  };
}

export function isRequest(message: JSONRPCMessage): boolean {
  return message.id !== undefined;
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
