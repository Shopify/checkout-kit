import {
  checkoutProtocolCatalogPayloadDecoders,
  type CheckoutProtocolCatalogPayloads,
} from './generated/ProtocolNotifications';

export function decodeProtocolPayload<
  K extends keyof CheckoutProtocolCatalogPayloads,
>(method: K, payload: unknown): CheckoutProtocolCatalogPayloads[K];
export function decodeProtocolPayload(
  method: string,
  payload: unknown,
):
  | CheckoutProtocolCatalogPayloads[keyof CheckoutProtocolCatalogPayloads]
  | undefined;
export function decodeProtocolPayload(
  method: string,
  payload: unknown,
):
  | CheckoutProtocolCatalogPayloads[keyof CheckoutProtocolCatalogPayloads]
  | undefined {
  const decoder = checkoutProtocolCatalogPayloadDecoders[
    method as keyof typeof checkoutProtocolCatalogPayloadDecoders
  ] as
    | ((
        payload: unknown,
      ) => CheckoutProtocolCatalogPayloads[keyof CheckoutProtocolCatalogPayloads])
    | undefined;
  return decoder?.(payload);
}

export type ProtocolHandlers<Payloads = CheckoutProtocolCatalogPayloads> =
  Partial<{
    [K in keyof Payloads]: (payload: Payloads[K]) => void;
  }>;
