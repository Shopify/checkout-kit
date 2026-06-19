import {env} from '../env';

const buyerIdentityEnv = {
  ADDRESS_1: '650 King Street',
  ADDRESS_2: 'Shopify HQ',
  COMPANY: 'Shopify',
  FIRST_NAME: 'Evelyn',
  LAST_NAME: 'Hartley',
};

function withProcessEnv(values: Record<string, string>, runTest: () => void) {
  const previousValues = Object.fromEntries(
    Object.keys(values).map(key => [key, process.env[key]]),
  );

  Object.assign(process.env, values);

  try {
    runTest();
  } finally {
    for (const [key, value] of Object.entries(previousValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('env', () => {
  it('reads values from Expo constants extra', () => {
    expect(env.CUSTOMER_ACCOUNT_API_SHOP_ID).toBe('test-shop-123');
    expect(env.STOREFRONT_DOMAIN).toBe('test-shop.myshopify.com');
  });

  it('supports API_VERSION fallback', () => {
    expect(env.STOREFRONT_VERSION).toBe('2026-04');
  });

  it('forwards buyer identity fields through Expo extra', () => {
    withProcessEnv(buyerIdentityEnv, () => {
      jest.resetModules();
      const config = require('../../app.config.js');

      for (const [key, value] of Object.entries(buyerIdentityEnv)) {
        expect(config.extra[key]).toBe(value);
      }
    });
  });
});
