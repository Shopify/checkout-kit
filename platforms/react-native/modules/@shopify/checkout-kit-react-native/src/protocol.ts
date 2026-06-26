import {
  checkoutProtocolCatalog,
  checkoutProtocolCatalogPayloadDecoders,
  type CheckoutProtocolCatalogPayloads,
} from '@shopify/checkout-kit-protocol';

export type {Checkout, ErrorResponse} from '@shopify/checkout-kit-protocol';

type PublicCheckoutProtocolKey =
  | 'complete'
  | 'error'
  | 'fulfillmentChange'
  | 'lineItemsChange'
  | 'messagesChange'
  | 'start'
  | 'totalsChange';

export const CheckoutProtocol = {
  complete: checkoutProtocolCatalog.complete,
  error: checkoutProtocolCatalog.error,
  fulfillmentChange: checkoutProtocolCatalog.fulfillmentChange,
  lineItemsChange: checkoutProtocolCatalog.lineItemsChange,
  messagesChange: checkoutProtocolCatalog.messagesChange,
  start: checkoutProtocolCatalog.start,
  totalsChange: checkoutProtocolCatalog.totalsChange,
} as const satisfies Pick<
  typeof checkoutProtocolCatalog,
  PublicCheckoutProtocolKey
>;

export type CheckoutProtocolMethod =
  (typeof CheckoutProtocol)[keyof typeof CheckoutProtocol];

export type CheckoutProtocolPayloads = Pick<
  CheckoutProtocolCatalogPayloads,
  CheckoutProtocolMethod
>;

type CheckoutProtocolPayloadDecoder<K extends keyof CheckoutProtocolPayloads> =
  (payload: unknown) => CheckoutProtocolPayloads[K];

const checkoutProtocolPayloadDecoders = {
  [CheckoutProtocol.complete]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.complete],
  [CheckoutProtocol.error]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.error],
  [CheckoutProtocol.fulfillmentChange]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.fulfillmentChange],
  [CheckoutProtocol.lineItemsChange]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.lineItemsChange],
  [CheckoutProtocol.messagesChange]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.messagesChange],
  [CheckoutProtocol.start]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.start],
  [CheckoutProtocol.totalsChange]:
    checkoutProtocolCatalogPayloadDecoders[CheckoutProtocol.totalsChange],
} satisfies {
  [K in keyof CheckoutProtocolPayloads]: CheckoutProtocolPayloadDecoder<K>;
};

export function decodeProtocolPayload<K extends keyof CheckoutProtocolPayloads>(
  method: K,
  payload: unknown,
): CheckoutProtocolPayloads[K];
export function decodeProtocolPayload(
  method: string,
  payload: unknown,
): CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads] | undefined;
export function decodeProtocolPayload(
  method: string,
  payload: unknown,
): CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads] | undefined {
  const decoder = checkoutProtocolPayloadDecoders[
    method as keyof typeof checkoutProtocolPayloadDecoders
  ] as
    | ((
        payload: unknown,
      ) => CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads])
    | undefined;
  return decoder?.(payload);
}

export type ProtocolHandlers = Partial<{
  [K in keyof CheckoutProtocolPayloads]: (
    payload: CheckoutProtocolPayloads[K],
  ) => void;
}>;
