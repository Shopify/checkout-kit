import {embeddedCheckoutMethods} from '@shopify/embedded-checkout-protocol';


export function toProtocolMethod(method: string, additionalMethods: readonly string[] = []): string {
  return embeddedCheckoutMethods.has(method) || additionalMethods.includes(method)
    ? method
    : 'unknown';
}
