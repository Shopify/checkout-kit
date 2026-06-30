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
        error: import("./descriptors").NotificationDescriptor<import(".").ErrorResponse>;
        start: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        complete: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        messagesChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        lineItemsChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        buyerChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        totalsChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        paymentChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
        fulfillmentChange: import("./descriptors").NotificationDescriptor<import(".").Checkout>;
    };
    readonly Request: {
        ready: import("./descriptors").RequestDescriptor<import(".").ReadyRequest, import(".").ReadyResult>;
        auth: import("./descriptors").RequestDescriptor<import(".").AuthRequest, import(".").AuthResult>;
        paymentInstrumentsChange: import("./descriptors").RequestDescriptor<import(".").Checkout, import(".").InstrumentsChangeResult>;
        paymentCredential: import("./descriptors").RequestDescriptor<import(".").Checkout, import(".").CredentialResult>;
        fulfillmentAddressChange: import("./descriptors").RequestDescriptor<import(".").Checkout, import(".").AddressChangeResult>;
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
