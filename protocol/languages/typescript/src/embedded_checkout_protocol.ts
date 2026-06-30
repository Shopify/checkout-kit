import {Client as ClientClass} from './client';
import type {DecodedMessage, JSONRPCID} from './codec';
import {
  Delegations,
  SPEC_VERSION,
  notificationDescriptors,
  requestDescriptors,
  type Delegation as DelegationType,
} from './generated/ProtocolNotifications';
import {url, type ProtocolURLOptions} from './url';

export const EmbeddedCheckoutProtocol = {
  specVersion: SPEC_VERSION,
  Delegations,
  Event: notificationDescriptors,
  Request: requestDescriptors,
  url,
  Client: ClientClass,
} as const;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EmbeddedCheckoutProtocol {
  export type Options = ProtocolURLOptions;
  export type Delegation = DelegationType;
  export type Message = DecodedMessage;
  export type Id = JSONRPCID;
  export type Client = ClientClass;
}
