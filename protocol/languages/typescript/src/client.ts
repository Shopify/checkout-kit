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
  handle(payload: unknown): void;
}

interface RequestEntry {
  decode(params: unknown): unknown;
  encode(result: unknown): unknown;
  handle(payload: unknown): unknown | Promise<unknown>;
}

export class Client {
  private readonly notifications = new Map<string, NotificationEntry>();
  private readonly requests = new Map<string, RequestEntry>();

  on<Payload>(
    descriptor: NotificationDescriptor<Payload>,
    handler: (payload: Payload) => void,
  ): this;
  on<Payload, Result>(
    descriptor: RequestDescriptor<Payload, Result>,
    handler: (payload: Payload) => Result | Promise<Result>,
  ): this;
  on(
    descriptor:
      | NotificationDescriptor<unknown>
      | RequestDescriptor<unknown, unknown>,
    handler: (payload: never) => unknown,
  ): this {
    if ('encode' in descriptor) {
      this.requests.set(descriptor.method, {
        decode: descriptor.decode,
        encode: descriptor.encode,
        handle: handler as (payload: unknown) => unknown,
      });
    } else {
      this.notifications.set(descriptor.method, {
        decode: descriptor.decode,
        handle: handler as (payload: unknown) => void,
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
        let payload: unknown;
        try {
          payload = entry.decode(decoded.params);
        } catch {
          return undefined;
        }
        entry.handle(payload);
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

    let payload: unknown;
    try {
      payload = entry.decode(decoded.params);
    } catch {
      return encodeJSONRPCError(
        decoded.id,
        INVALID_PARAMS_CODE,
        INVALID_PARAMS_MESSAGE,
      );
    }

    try {
      const result = await entry.handle(payload);
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
