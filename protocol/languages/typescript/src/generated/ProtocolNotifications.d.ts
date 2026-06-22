import { type Checkout, type ErrorResponse } from './Models';
export declare const checkoutProtocolCatalog: {
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
export type CheckoutProtocolCatalogMethod = (typeof checkoutProtocolCatalog)[keyof typeof checkoutProtocolCatalog];
export interface CheckoutProtocolCatalogPayloads {
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
export type CheckoutProtocolCatalogPayloadDecoder<K extends keyof CheckoutProtocolCatalogPayloads> = (payload: unknown) => CheckoutProtocolCatalogPayloads[K];
export declare const checkoutProtocolCatalogPayloadDecoders: {
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
