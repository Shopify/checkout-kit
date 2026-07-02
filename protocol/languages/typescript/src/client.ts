import {
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  METHOD_NOT_FOUND_CODE,
  METHOD_NOT_FOUND_MESSAGE,
  decodeProtocolMessage,
  encodeJSONRPCError,
  encodeJSONRPCResult,
} from './codec';
import type {NotificationDescriptor, RequestDescriptor} from './descriptors';

interface NotificationEntry {
  decode(params: unknown): unknown;
  handle(message: unknown): void;
}

interface RequestEntry {
  decode(params: unknown): unknown;
  encode(result: unknown): unknown;
  handle(message: unknown): unknown | Promise<unknown>;
}

export class Client {
  private readonly notifications = new Map<string, NotificationEntry>();
  private readonly requests = new Map<string, RequestEntry>();

  on<Message extends {readonly params: unknown}, Result>(
    descriptor: RequestDescriptor<Message, Result>,
    handler: (message: Message) => Result | Promise<Result>,
  ): this;
  on<Message extends {readonly params: unknown}>(
    descriptor: NotificationDescriptor<Message>,
    handler: (message: Message) => void,
  ): this;
  on(
    descriptor:
      | NotificationDescriptor<{readonly params: unknown}>
      | RequestDescriptor<{readonly params: unknown}, unknown>,
    handler: (message: never) => unknown,
  ): this {
    if ('encode' in descriptor) {
      this.requests.set(descriptor.method, {
        decode: descriptor.decode,
        encode: descriptor.encode,
        handle: handler as (message: unknown) => unknown,
      });
    } else {
      this.notifications.set(descriptor.method, {
        decode: descriptor.decode,
        handle: handler as (message: unknown) => void,
      });
    }
    return this;
  }

  async process(message: string): Promise<string | undefined> {
    const decoded = decodeProtocolMessage(message);
    if (decoded === undefined) {
      return undefined;
    }

    if (decoded.kind === 'notification') {
      const entry = this.notifications.get(decoded.method);
      if (entry !== undefined) {
        let params: unknown;
        try {
          params = entry.decode(decoded.params);
        } catch {
          return undefined;
        }
        entry.handle({jsonrpc: '2.0', method: decoded.method, params});
      }
      return undefined;
    }

    const entry = this.requests.get(decoded.method);
    if (entry === undefined) {
      return encodeJSONRPCError(
        decoded.id,
        METHOD_NOT_FOUND_CODE,
        METHOD_NOT_FOUND_MESSAGE,
      );
    }

    let params: unknown;
    try {
      params = entry.decode(decoded.params);
    } catch {
      return encodeJSONRPCError(
        decoded.id,
        INVALID_PARAMS_CODE,
        INVALID_PARAMS_MESSAGE,
      );
    }

    try {
      const result = await entry.handle({
        jsonrpc: '2.0',
        method: decoded.method,
        id: decoded.id,
        params,
      });
      return encodeJSONRPCResult(decoded.id, entry.encode(result));
    } catch {
      return encodeJSONRPCError(
        decoded.id,
        INTERNAL_ERROR_CODE,
        INTERNAL_ERROR_MESSAGE,
      );
    }
  }
}
