import type {CheckoutProtocolPayloads} from '@shopify/checkout-kit-protocol';

export {
  CheckoutProtocol,
  decodeCheckoutProtocolPayload as decodeProtocolPayload,
} from '@shopify/checkout-kit-protocol';

export type {
  Checkout,
  CheckoutProtocolPayloads,
  ErrorResponse,
} from '@shopify/checkout-kit-protocol';

export type ProtocolHandlers = Partial<{
  [K in keyof CheckoutProtocolPayloads]: (
    payload: CheckoutProtocolPayloads[K],
  ) => void;
}>;
