const CHECKOUT_KIT_LOG_PREFIX = 'checkout_kit';
const DEFAULT_LOG_SCOPE = 'sdk';

export function formatLogPrefix(scope: string): string {
  return `[${CHECKOUT_KIT_LOG_PREFIX}:${toLogScope(scope)}]`;
}

function toLogScope(scope: string): string {
  switch (scope) {
    case 'ShopifyCheckoutKit':
    case 'checkout_kit':
      return DEFAULT_LOG_SCOPE;
    case 'ShopifyAcceleratedCheckouts':
      return 'accelerated_checkout';
    case 'CheckoutECP':
      return 'ecp';
    default:
      return scope;
  }
}
