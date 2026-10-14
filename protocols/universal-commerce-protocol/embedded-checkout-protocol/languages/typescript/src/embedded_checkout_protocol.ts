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

// Explicit type so the declaration can be emitted in isolation
// (--isolatedDeclarations); `typeof` queries keep it in step with the sources.
export const EmbeddedCheckoutProtocol: {
  readonly specVersion: typeof SPEC_VERSION;
  readonly Delegations: typeof Delegations;
  readonly Event: typeof notificationDescriptors & typeof requestDescriptors;
  readonly url: typeof url;
  readonly Client: typeof ClientClass;
} = {
  specVersion: SPEC_VERSION,
  Delegations,
  Event: {...notificationDescriptors, ...requestDescriptors},
  url,
  Client: ClientClass,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EmbeddedCheckoutProtocol {
  export type Options = ProtocolURLOptions;
  export type Delegation = DelegationType;
  export type Message = DecodedMessage;
  export type Id = JSONRPCID;
  export type Client = ClientClass;
}
