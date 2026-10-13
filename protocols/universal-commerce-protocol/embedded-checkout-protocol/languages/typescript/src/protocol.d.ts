import { type CheckoutProtocolCatalogPayloads } from './generated/ProtocolNotifications';
export declare function decodeProtocolPayload<K extends keyof CheckoutProtocolCatalogPayloads>(method: K, payload: unknown): CheckoutProtocolCatalogPayloads[K];
export declare function decodeProtocolPayload(method: string, payload: unknown): CheckoutProtocolCatalogPayloads[keyof CheckoutProtocolCatalogPayloads] | undefined;
export type ProtocolHandlers<Payloads = CheckoutProtocolCatalogPayloads> = Partial<{
    [K in keyof Payloads]: (payload: Payloads[K]) => void;
}>;
