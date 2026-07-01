export interface NotificationDescriptor<Payload> {
    readonly method: string;
    decode(params: unknown): Payload;
}
export interface RequestDescriptor<Payload, Result> {
    readonly method: string;
    readonly delegation: string | null;
    decode(params: unknown): Payload;
    encode(result: Result): unknown;
}
export declare function notificationDescriptor<Payload>(method: string, decode: (params: unknown) => Payload): NotificationDescriptor<Payload>;
export declare function requestDescriptor<Payload, Result>(method: string, delegation: string | null, decode: (params: unknown) => Payload, encode: (result: Result) => unknown): RequestDescriptor<Payload, Result>;
