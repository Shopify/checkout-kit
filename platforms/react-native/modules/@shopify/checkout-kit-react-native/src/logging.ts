const CHECKOUT_KIT_LOG_PREFIX = 'checkout_kit';

export function formatLogPrefix(scope: string): string {
  return `[${CHECKOUT_KIT_LOG_PREFIX}:${toLogScope(scope)}]`;
}

function toLogScope(scope: string): string {
  switch (scope) {
    case 'ShopifyCheckoutKit':
      return 'checkout_kit';
    case 'ShopifyAcceleratedCheckouts':
      return 'accelerated_checkout';
    case 'CheckoutECP':
      return 'ecp';
    default:
      return toSnakeCase(scope);
  }
}

function toSnakeCase(scope: string): string {
  return scope
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
