import { type NotificationDescriptor, type RequestDescriptor } from '../descriptors';
import { decodeCheckout, decodeErrorResponse } from './ProtocolCodecs';
type AddressChangeResult = import('./Models').AddressChangeResult;
type AuthRequest = import('./Models').AuthRequest;
type AuthResult = import('./Models').AuthResult;
type Checkout = import('./Models').Checkout;
type CredentialResult = import('./Models').CredentialResult;
type ErrorResponse = import('./Models').ErrorResponse;
type InstrumentsChangeResult = import('./Models').InstrumentsChangeResult;
type ReadyRequest = import('./Models').ReadyRequest;
type ReadyResult = import('./Models').ReadyResult;
type WindowOpenRequest = import('./Models').WindowOpenRequest;
type WindowOpenResult = import('./Models').WindowOpenResult;
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
    "ec.error": typeof decodeErrorResponse;
    "ec.start": typeof decodeCheckout;
    "ec.complete": typeof decodeCheckout;
    "ec.messages.change": typeof decodeCheckout;
    "ec.line_items.change": typeof decodeCheckout;
    "ec.buyer.change": typeof decodeCheckout;
    "ec.totals.change": typeof decodeCheckout;
    "ec.payment.change": typeof decodeCheckout;
    "ec.fulfillment.change": typeof decodeCheckout;
};
export declare const notificationDescriptors: {
    error: NotificationDescriptor<import("./Models").ErrorResponse>;
    start: NotificationDescriptor<import("./Models").Checkout>;
    complete: NotificationDescriptor<import("./Models").Checkout>;
    messagesChange: NotificationDescriptor<import("./Models").Checkout>;
    lineItemsChange: NotificationDescriptor<import("./Models").Checkout>;
    buyerChange: NotificationDescriptor<import("./Models").Checkout>;
    totalsChange: NotificationDescriptor<import("./Models").Checkout>;
    paymentChange: NotificationDescriptor<import("./Models").Checkout>;
    fulfillmentChange: NotificationDescriptor<import("./Models").Checkout>;
};
export declare const checkoutProtocolRequestCatalog: {
    readonly ready: "ec.ready";
    readonly auth: "ec.auth";
    readonly paymentInstrumentsChange: "ec.payment.instruments_change_request";
    readonly paymentCredential: "ec.payment.credential_request";
    readonly windowOpen: "ec.window.open_request";
    readonly fulfillmentAddressChange: "ec.fulfillment.address_change_request";
};
export type CheckoutProtocolRequestMethod = (typeof checkoutProtocolRequestCatalog)[keyof typeof checkoutProtocolRequestCatalog];
export interface CheckoutProtocolRequestPayloads {
    'ec.ready': ReadyRequest;
    'ec.auth': AuthRequest;
    'ec.payment.instruments_change_request': Checkout;
    'ec.payment.credential_request': Checkout;
    'ec.window.open_request': WindowOpenRequest;
    'ec.fulfillment.address_change_request': Checkout;
}
export interface CheckoutProtocolRequestResults {
    'ec.ready': ReadyResult;
    'ec.auth': AuthResult;
    'ec.payment.instruments_change_request': InstrumentsChangeResult;
    'ec.payment.credential_request': CredentialResult;
    'ec.window.open_request': WindowOpenResult;
    'ec.fulfillment.address_change_request': AddressChangeResult;
}
export declare const requestDescriptors: {
    ready: RequestDescriptor<import("./Models").ReadyRequest, import("./Models").ReadyResult>;
    auth: RequestDescriptor<import("./Models").AuthRequest, import("./Models").AuthResult>;
    paymentInstrumentsChange: RequestDescriptor<import("./Models").Checkout, import("./Models").InstrumentsChangeResult>;
    paymentCredential: RequestDescriptor<import("./Models").Checkout, import("./Models").CredentialResult>;
    windowOpen: RequestDescriptor<import("./Models").WindowOpenRequest, import("./Models").WindowOpenResult>;
    fulfillmentAddressChange: RequestDescriptor<import("./Models").Checkout, import("./Models").AddressChangeResult>;
};
export declare const embeddedCheckoutMethods: ReadonlySet<string>;
export {};
