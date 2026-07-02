import type { NotificationDescriptor, RequestDescriptor } from './descriptors';
export declare class Client {
    private readonly notifications;
    private readonly requests;
    on<Message extends {
        readonly params: unknown;
    }, Result>(descriptor: RequestDescriptor<Message, Result>, handler: (message: Message) => Result | Promise<Result>): this;
    on<Message extends {
        readonly params: unknown;
    }>(descriptor: NotificationDescriptor<Message>, handler: (message: Message) => void): this;
    process(message: string): Promise<string | undefined>;
}
