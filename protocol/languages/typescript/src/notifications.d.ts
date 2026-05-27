import { type GeneratedCheckoutProtocolPayloads } from './generated/ProtocolNotifications';
export declare const CheckoutProtocol: {
    readonly complete: "ec.complete";
    readonly error: "ec.error";
    readonly lineItemsChange: "ec.line_items.change";
    readonly messagesChange: "ec.messages.change";
    readonly start: "ec.start";
    readonly totalsChange: "ec.totals.change";
};
export type CheckoutProtocolMethod = (typeof CheckoutProtocol)[keyof typeof CheckoutProtocol];
export type CheckoutProtocolPayloads = Pick<GeneratedCheckoutProtocolPayloads, CheckoutProtocolMethod>;
export type CheckoutProtocolPayloadDecoder<K extends keyof CheckoutProtocolPayloads> = (payload: unknown) => CheckoutProtocolPayloads[K];
export declare function decodeCheckoutProtocolPayload<K extends keyof CheckoutProtocolPayloads>(method: K, payload: unknown): CheckoutProtocolPayloads[K];
export declare function decodeCheckoutProtocolPayload(method: string, payload: unknown): CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads] | undefined;
