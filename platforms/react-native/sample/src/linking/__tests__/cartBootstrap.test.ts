import {
  CART_BOOTSTRAP_ROUTE,
  parseCartBootstrapLink,
} from '../cartBootstrap';

describe('parseCartBootstrapLink', () => {
  it('ignores non-cart-bootstrap URLs', () => {
    expect(parseCartBootstrapLink('https://example.com/cart')).toBeNull();
  });

  it('rejects unsupported bootstrap routes', () => {
    expect(() =>
      parseCartBootstrapLink(
        'com.shopify.checkoutkit.reactnativedemo://account?productIndex=0',
      ),
    ).toThrow('Unsupported cart bootstrap path');
  });

  it('rejects bootstrap links without a query string', () => {
    expect(() => parseCartBootstrapLink(CART_BOOTSTRAP_ROUTE)).toThrow(
      'Missing variantId or productIndex',
    );
  });

  it.each(['0', '-1', '1.5', 'abc'])(
    'rejects invalid quantity %s',
    quantity => {
      expect(() =>
        parseCartBootstrapLink(
          `${CART_BOOTSTRAP_ROUTE}?productIndex=0&quantity=${quantity}`,
        ),
      ).toThrow('quantity must be a positive integer');
    },
  );

  it('rejects links with both variantId and productIndex', () => {
    expect(() =>
      parseCartBootstrapLink(
        `${CART_BOOTSTRAP_ROUTE}?variantId=gid://shopify/ProductVariant/1&productIndex=0`,
      ),
    ).toThrow('Use variantId or productIndex, not both');
  });

  it('rejects links without variantId or productIndex', () => {
    expect(() => parseCartBootstrapLink(`${CART_BOOTSTRAP_ROUTE}?`)).toThrow(
      'Missing variantId or productIndex',
    );
  });

  it.each(['-1', '1.5', 'abc'])(
    'rejects invalid productIndex %s',
    productIndex => {
      expect(() =>
        parseCartBootstrapLink(
          `${CART_BOOTSTRAP_ROUTE}?productIndex=${productIndex}`,
        ),
      ).toThrow('productIndex must be a non-negative integer');
    },
  );

  it('returns a variantId bootstrap link', () => {
    expect(
      parseCartBootstrapLink(
        `${CART_BOOTSTRAP_ROUTE}?variantId=gid://shopify/ProductVariant/1&quantity=2`,
      ),
    ).toEqual({
      variantId: 'gid://shopify/ProductVariant/1',
      quantity: 2,
    });
  });

  it('returns a productIndex bootstrap link with default quantity', () => {
    expect(
      parseCartBootstrapLink(`${CART_BOOTSTRAP_ROUTE}?productIndex=3`),
    ).toEqual({
      productIndex: 3,
      quantity: 1,
    });
  });

  it('returns a productIndex bootstrap link with a root path', () => {
    expect(
      parseCartBootstrapLink(`${CART_BOOTSTRAP_ROUTE}/?productIndex=3`),
    ).toEqual({
      productIndex: 3,
      quantity: 1,
    });
  });
});
