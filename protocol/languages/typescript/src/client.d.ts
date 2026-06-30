import type { NotificationDescriptor, RequestDescriptor } from './descriptors';
export declare class Client {
    private readonly notifications;
    private readonly requests;
    on<Payload>(descriptor: NotificationDescriptor<Payload>, handler: (payload: Payload) => void): this;
    on<Payload, Result>(descriptor: RequestDescriptor<Payload, Result>, handler: (payload: Payload) => Result | Promise<Result>): this;
    process(message: string): Promise<string | undefined>;
}
