import type { JSONRPCID } from './codec';
export interface NotificationMessage<Method extends string, Params> {
    readonly jsonrpc: '2.0';
    readonly method: Method;
    readonly params: Params;
}
export interface RequestMessage<Method extends string, Params> {
    readonly jsonrpc: '2.0';
    readonly method: Method;
    readonly id: JSONRPCID;
    readonly params: Params;
}
export interface NotificationDescriptor<Message extends {
    readonly params: unknown;
}> {
    readonly method: string;
    decode(params: unknown): Message['params'];
}
export interface RequestDescriptor<Message extends {
    readonly params: unknown;
}, Result> {
    readonly method: string;
    readonly delegation: string | null;
    decode(params: unknown): Message['params'];
    encode(result: Result): unknown;
}
export declare function notificationDescriptor<Method extends string, Params>(method: Method, decode: (params: unknown) => Params): NotificationDescriptor<NotificationMessage<Method, Params>>;
export declare function requestDescriptor<Method extends string, Params, Result>(method: Method, delegation: string | null, decode: (params: unknown) => Params, encode: (result: Result) => unknown): RequestDescriptor<RequestMessage<Method, Params>, Result>;
