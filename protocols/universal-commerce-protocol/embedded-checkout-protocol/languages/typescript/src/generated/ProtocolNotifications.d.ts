import { type NotificationDescriptor, type NotificationMessage, type RequestDescriptor, type RequestMessage } from '../descriptors';
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
export declare const SPEC_VERSION = "2026-08-25";
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
export interface CheckoutProtocolCatalogParams {
    'ec.error': {
        error: ErrorResponse;
    };
    'ec.start': {
        checkout: Checkout;
    };
    'ec.complete': {
        checkout: Checkout;
    };
    'ec.messages.change': {
        checkout: Checkout;
    };
    'ec.line_items.change': {
        checkout: Checkout;
    };
    'ec.buyer.change': {
        checkout: Checkout;
    };
    'ec.totals.change': {
        checkout: Checkout;
    };
    'ec.payment.change': {
        checkout: Checkout;
    };
    'ec.fulfillment.change': {
        checkout: Checkout;
    };
}
export type CheckoutProtocolNotificationMessage = {
    [K in keyof CheckoutProtocolCatalogParams]: NotificationMessage<K, CheckoutProtocolCatalogParams[K]>;
}[keyof CheckoutProtocolCatalogParams];
export type CheckoutProtocolCatalogPayloadDecoder<K extends keyof CheckoutProtocolCatalogPayloads> = (payload: unknown) => CheckoutProtocolCatalogPayloads[K];
export type CheckoutProtocolCatalogPayloadDecoders = {
    [K in keyof CheckoutProtocolCatalogPayloads]: CheckoutProtocolCatalogPayloadDecoder<K>;
};
export declare const checkoutProtocolCatalogPayloadDecoders: CheckoutProtocolCatalogPayloadDecoders;
export type NotificationDescriptors = {
    [K in keyof typeof checkoutProtocolCatalog]: NotificationDescriptor<NotificationMessage<(typeof checkoutProtocolCatalog)[K], CheckoutProtocolCatalogParams[(typeof checkoutProtocolCatalog)[K]]>>;
};
export declare const notificationDescriptors: NotificationDescriptors;
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
export interface CheckoutProtocolRequestParams {
    'ec.ready': ReadyRequest;
    'ec.auth': AuthRequest;
    'ec.payment.instruments_change_request': {
        checkout: Checkout;
    };
    'ec.payment.credential_request': {
        checkout: Checkout;
    };
    'ec.window.open_request': WindowOpenRequest;
    'ec.fulfillment.address_change_request': {
        checkout: Checkout;
    };
}
export type CheckoutProtocolRequestMessage = {
    [K in keyof CheckoutProtocolRequestParams]: RequestMessage<K, CheckoutProtocolRequestParams[K]>;
}[keyof CheckoutProtocolRequestParams];
export type RequestDescriptors = {
    [K in keyof typeof checkoutProtocolRequestCatalog]: RequestDescriptor<RequestMessage<(typeof checkoutProtocolRequestCatalog)[K], CheckoutProtocolRequestParams[(typeof checkoutProtocolRequestCatalog)[K]]>, CheckoutProtocolRequestResults[(typeof checkoutProtocolRequestCatalog)[K]]>;
};
export declare const requestDescriptors: RequestDescriptors;
export declare const embeddedCheckoutMethods: ReadonlySet<string>;
export {};
