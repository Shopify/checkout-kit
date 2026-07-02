import { Client as ClientClass } from './client';
import type { DecodedMessage, JSONRPCID } from './codec';
import { type Delegation as DelegationType } from './generated/ProtocolNotifications';
import { url, type ProtocolURLOptions } from './url';
export declare const EmbeddedCheckoutProtocol: {
    readonly specVersion: "2026-04-08";
    readonly Delegations: {
        readonly paymentInstrumentsChange: "payment.instruments_change";
        readonly paymentCredential: "payment.credential";
        readonly fulfillmentAddressChange: "fulfillment.address_change";
        readonly windowOpen: "window.open";
    };
    readonly Event: {
        readonly ready: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.ready", import(".").ReadyRequest>, import(".").ReadyResult>;
        readonly auth: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.auth", import(".").AuthRequest>, import(".").AuthResult>;
        readonly paymentInstrumentsChange: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.payment.instruments_change_request", {
            checkout: import(".").Checkout;
        }>, import(".").InstrumentsChangeResult>;
        readonly paymentCredential: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.payment.credential_request", {
            checkout: import(".").Checkout;
        }>, import(".").CredentialResult>;
        readonly windowOpen: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.window.open_request", import(".").WindowOpenRequest>, import(".").WindowOpenResult>;
        readonly fulfillmentAddressChange: import("./descriptors").RequestDescriptor<import("./descriptors").RequestMessage<"ec.fulfillment.address_change_request", {
            checkout: import(".").Checkout;
        }>, import(".").AddressChangeResult>;
        readonly error: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.error", {
            error: import(".").ErrorResponse;
        }>>;
        readonly start: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.start", {
            checkout: import(".").Checkout;
        }>>;
        readonly complete: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.complete", {
            checkout: import(".").Checkout;
        }>>;
        readonly messagesChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.messages.change", {
            checkout: import(".").Checkout;
        }>>;
        readonly lineItemsChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.line_items.change", {
            checkout: import(".").Checkout;
        }>>;
        readonly buyerChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.buyer.change", {
            checkout: import(".").Checkout;
        }>>;
        readonly totalsChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.totals.change", {
            checkout: import(".").Checkout;
        }>>;
        readonly paymentChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.payment.change", {
            checkout: import(".").Checkout;
        }>>;
        readonly fulfillmentChange: import("./descriptors").NotificationDescriptor<import("./descriptors").NotificationMessage<"ec.fulfillment.change", {
            checkout: import(".").Checkout;
        }>>;
    };
    readonly url: typeof url;
    readonly Client: typeof ClientClass;
};
export declare namespace EmbeddedCheckoutProtocol {
    type Options = ProtocolURLOptions;
    type Delegation = DelegationType;
    type Message = DecodedMessage;
    type Id = JSONRPCID;
    type Client = ClientClass;
}
