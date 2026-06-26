import {
  generatedCheckoutProtocol,
  generatedCheckoutProtocolPayloadDecoders,
  type GeneratedCheckoutProtocolPayloads,
} from './generated/ProtocolNotifications';

// Public Checkout Kit notification events. The full notification contract is
// generated from protocol/services/shopping/embedded.openrpc.json; this module
// intentionally exposes the subset supported by the public SDKs.
type PublicCheckoutProtocolKey =
  | 'complete'
  | 'error'
  | 'fulfillmentChange'
  | 'lineItemsChange'
  | 'messagesChange'
  | 'start'
  | 'totalsChange';

export const CheckoutProtocol = {
  complete: generatedCheckoutProtocol.complete,
  error: generatedCheckoutProtocol.error,
  fulfillmentChange: generatedCheckoutProtocol.fulfillmentChange,
  lineItemsChange: generatedCheckoutProtocol.lineItemsChange,
  messagesChange: generatedCheckoutProtocol.messagesChange,
  start: generatedCheckoutProtocol.start,
  totalsChange: generatedCheckoutProtocol.totalsChange,
} as const satisfies Pick<typeof generatedCheckoutProtocol, PublicCheckoutProtocolKey>;

export type CheckoutProtocolMethod =
  (typeof CheckoutProtocol)[keyof typeof CheckoutProtocol];

export type CheckoutProtocolPayloads = Pick<
  GeneratedCheckoutProtocolPayloads,
  CheckoutProtocolMethod
>;

export type CheckoutProtocolPayloadDecoder<
  K extends keyof CheckoutProtocolPayloads,
> = (payload: unknown) => CheckoutProtocolPayloads[K];

const checkoutProtocolPayloadDecoders = {
  [CheckoutProtocol.complete]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.complete],
  [CheckoutProtocol.error]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.error],
  [CheckoutProtocol.fulfillmentChange]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.fulfillmentChange],
  [CheckoutProtocol.lineItemsChange]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.lineItemsChange],
  [CheckoutProtocol.messagesChange]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.messagesChange],
  [CheckoutProtocol.start]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.start],
  [CheckoutProtocol.totalsChange]:
    generatedCheckoutProtocolPayloadDecoders[CheckoutProtocol.totalsChange],
} satisfies {
  [K in keyof CheckoutProtocolPayloads]: CheckoutProtocolPayloadDecoder<K>;
};

export function decodeCheckoutProtocolPayload<
  K extends keyof CheckoutProtocolPayloads,
>(method: K, payload: unknown): CheckoutProtocolPayloads[K];
export function decodeCheckoutProtocolPayload(
  method: string,
  payload: unknown,
): CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads] | undefined;
export function decodeCheckoutProtocolPayload(
  method: string,
  payload: unknown,
): CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads] | undefined {
  const decoder = decoderFor(method);
  return decoder?.(payload);
}

function decoderFor(
  method: string,
):
  | ((payload: unknown) => CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads])
  | undefined {
  return checkoutProtocolPayloadDecoders[
    method as keyof typeof checkoutProtocolPayloadDecoders
  ] as
    | ((payload: unknown) => CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads])
    | undefined;
}
