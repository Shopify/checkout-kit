import {env} from '../env';

describe('env', () => {
  it('reads values from Expo constants extra', () => {
    expect(env.CUSTOMER_ACCOUNT_API_SHOP_ID).toBe('test-shop-123');
    expect(env.STOREFRONT_DOMAIN).toBe('test-shop.myshopify.com');
  });

  it('supports API_VERSION fallback', () => {
    expect(env.STOREFRONT_VERSION).toBe('2026-04');
  });
});
