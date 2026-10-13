import type { NotificationDescriptor, RequestDescriptor } from './descriptors';
export interface DecodeErrorContext {
    method: string;
    error: unknown;
    params: unknown;
}
export declare class Client {
    private readonly notifications;
    private readonly requests;
    private decodeErrorHandler?;
    onDecodeError(handler: (context: DecodeErrorContext) => void): this;
    on<Message extends {
        readonly params: unknown;
    }, Result>(descriptor: RequestDescriptor<Message, Result>, handler: (message: Message) => Result | Promise<Result>): this;
    on<Message extends {
        readonly params: unknown;
    }>(descriptor: NotificationDescriptor<Message>, handler: (message: Message) => void): this;
    process(message: string): Promise<string | undefined>;
}
