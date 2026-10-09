import { Client as ClientClass } from './client';
import type { DecodedMessage, JSONRPCID } from './codec';
import { Delegations, SPEC_VERSION, notificationDescriptors, requestDescriptors, type Delegation as DelegationType } from './generated/ProtocolNotifications';
import { url, type ProtocolURLOptions } from './url';
export declare const EmbeddedCheckoutProtocol: {
    readonly specVersion: typeof SPEC_VERSION;
    readonly Delegations: typeof Delegations;
    readonly Event: typeof notificationDescriptors & typeof requestDescriptors;
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
