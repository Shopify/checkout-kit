import {
  checkoutProtocolCatalog,
  type CheckoutProtocolCatalogPayloads,
  type ProtocolHandlers as PackageProtocolHandlers,
} from '@shopify/checkout-kit-protocol';

export {decodeProtocolPayload} from '@shopify/checkout-kit-protocol';
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

export type ProtocolHandlers =
  PackageProtocolHandlers<CheckoutProtocolPayloads>;
