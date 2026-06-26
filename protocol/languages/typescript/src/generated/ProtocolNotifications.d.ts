import { type Checkout, type ErrorResponse } from './Models';
export declare const generatedCheckoutProtocol: {
    readonly error: "ec.error";
    readonly start: "ec.start";
    readonly complete: "ec.complete";
    readonly messagesChange: "ec.messages.change";
    readonly lineItemsChange: "ec.line_items.change";
    readonly buyerChange: "ec.buyer.change";
    readonly totalsChange: "ec.totals.change";
    readonly paymentChange: "ec.payment.change";
    readonly fulfillmentChange: "ec.fulfillment.change";
};
export type GeneratedCheckoutProtocolMethod = (typeof generatedCheckoutProtocol)[keyof typeof generatedCheckoutProtocol];
export interface GeneratedCheckoutProtocolPayloads {
    'ec.error': ErrorResponse;
    'ec.start': Checkout;
    'ec.complete': Checkout;
    'ec.messages.change': Checkout;
    'ec.line_items.change': Checkout;
    'ec.buyer.change': Checkout;
    'ec.totals.change': Checkout;
    'ec.payment.change': Checkout;
    'ec.fulfillment.change': Checkout;
}
export type GeneratedCheckoutProtocolPayloadDecoder<K extends keyof GeneratedCheckoutProtocolPayloads> = (payload: unknown) => GeneratedCheckoutProtocolPayloads[K];
export declare const generatedCheckoutProtocolPayloadDecoders: {
    "ec.error": (payload: unknown) => ErrorResponse;
    "ec.start": (payload: unknown) => Checkout;
    "ec.complete": (payload: unknown) => Checkout;
    "ec.messages.change": (payload: unknown) => Checkout;
    "ec.line_items.change": (payload: unknown) => Checkout;
    "ec.buyer.change": (payload: unknown) => Checkout;
    "ec.totals.change": (payload: unknown) => Checkout;
    "ec.payment.change": (payload: unknown) => Checkout;
    "ec.fulfillment.change": (payload: unknown) => Checkout;
};
