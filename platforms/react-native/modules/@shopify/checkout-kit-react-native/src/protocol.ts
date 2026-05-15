import {Convert, type Checkout} from '@shopify/checkout-kit-protocol';

export type {Checkout} from '@shopify/checkout-kit-protocol';

export const CheckoutProtocol = {
  start: 'ec.start',
} as const;

export interface CheckoutProtocolPayloads {
  'ec.start': Checkout;
}

export type ProtocolHandlers = Partial<{
  [K in keyof CheckoutProtocolPayloads]: (
    payload: CheckoutProtocolPayloads[K],
  ) => void;
}>;

type ProtocolPayloadDecoder<K extends keyof CheckoutProtocolPayloads> = (
  payload: unknown,
) => CheckoutProtocolPayloads[K];

// Keep this map exhaustive for CheckoutProtocolPayloads. When new protocol
// methods are added, TypeScript fails until their QuickType decoder is wired in.
const protocolPayloadDecoders = {
  [CheckoutProtocol.start]: decodeWith(Convert.toCheckout),
} satisfies {
  [K in keyof CheckoutProtocolPayloads]: ProtocolPayloadDecoder<K>;
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
  const decoder = decoderFor(method);
  return decoder?.(payload);
}

function decodeWith<T>(converter: (json: string) => T): (payload: unknown) => T {
  return payload => converter(JSON.stringify(payload));
}

function decoderFor(
  method: string,
):
  | ((payload: unknown) => CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads])
  | undefined {
  return protocolPayloadDecoders[
    method as keyof typeof protocolPayloadDecoders
  ] as
    | ((payload: unknown) => CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads])
    | undefined;
}
