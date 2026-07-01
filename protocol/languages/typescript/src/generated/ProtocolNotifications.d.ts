import { type NotificationDescriptor, type RequestDescriptor } from '../descriptors';
import { type AddressChangeResult, type AuthRequest, type AuthResult, type Checkout, type CredentialResult, type ErrorResponse, type InstrumentsChangeResult, type ReadyRequest, type ReadyResult } from './Models';
export declare const SPEC_VERSION = "2026-04-08";
export declare const Delegations: {
    readonly paymentInstrumentsChange: "payment.instruments_change";
    readonly paymentCredential: "payment.credential";
    readonly fulfillmentAddressChange: "fulfillment.address_change";
    readonly windowOpen: "window.open";
};
export type Delegation = (typeof Delegations)[keyof typeof Delegations] | (string & {});
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
export declare const notificationDescriptors: {
    error: NotificationDescriptor<ErrorResponse>;
    start: NotificationDescriptor<Checkout>;
    complete: NotificationDescriptor<Checkout>;
    messagesChange: NotificationDescriptor<Checkout>;
    lineItemsChange: NotificationDescriptor<Checkout>;
    buyerChange: NotificationDescriptor<Checkout>;
    totalsChange: NotificationDescriptor<Checkout>;
    paymentChange: NotificationDescriptor<Checkout>;
    fulfillmentChange: NotificationDescriptor<Checkout>;
};
export declare const checkoutProtocolRequestCatalog: {
    readonly ready: "ec.ready";
    readonly auth: "ec.auth";
    readonly paymentInstrumentsChange: "ec.payment.instruments_change_request";
    readonly paymentCredential: "ec.payment.credential_request";
    readonly fulfillmentAddressChange: "ec.fulfillment.address_change_request";
};
export type CheckoutProtocolRequestMethod = (typeof checkoutProtocolRequestCatalog)[keyof typeof checkoutProtocolRequestCatalog];
export interface CheckoutProtocolRequestPayloads {
    'ec.ready': ReadyRequest;
    'ec.auth': AuthRequest;
    'ec.payment.instruments_change_request': Checkout;
    'ec.payment.credential_request': Checkout;
    'ec.fulfillment.address_change_request': Checkout;
}
export interface CheckoutProtocolRequestResults {
    'ec.ready': ReadyResult;
    'ec.auth': AuthResult;
    'ec.payment.instruments_change_request': InstrumentsChangeResult;
    'ec.payment.credential_request': CredentialResult;
    'ec.fulfillment.address_change_request': AddressChangeResult;
}
export declare const requestDescriptors: {
    ready: RequestDescriptor<ReadyRequest, ReadyResult>;
    auth: RequestDescriptor<AuthRequest, AuthResult>;
    paymentInstrumentsChange: RequestDescriptor<Checkout, InstrumentsChangeResult>;
    paymentCredential: RequestDescriptor<Checkout, CredentialResult>;
    fulfillmentAddressChange: RequestDescriptor<Checkout, AddressChangeResult>;
};
export declare const embeddedCheckoutMethods: ReadonlySet<string>;
