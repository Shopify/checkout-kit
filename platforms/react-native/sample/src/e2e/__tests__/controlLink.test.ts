import {parseControlLink} from '../controlLink';
import {BuyerIdentityMode} from '../../auth/types';

const REJECTED_NUMBERS = [
  '',
  '1.5',
  'abc',
  '1e3',
  '0x10',
  '0b11',
  '0o17',
  '2147483648',
  '99999999999999999999',
];

function parse(path: string) {
  return parseControlLink(`com.shopify.checkoutkit.reactnativedemo://e2e${path}`);
}

function expectRejection(path: string, message: string) {
  expect(() => parse(path)).toThrow(message);
}

describe('parseControlLink', () => {
  it('returns null when the link is not a control link', () => {
    expect(parseControlLink('https://example.com/cart')).toBeNull();
    expect(
      parseControlLink('com.shopify.checkoutkit.reactnativedemo://products/1'),
    ).toBeNull();
    expect(parseControlLink('not a url')).toBeNull();
  });

  it('parses every app scheme', () => {
    const expected = {command: 'cart', productIndex: 0, quantity: 1};
    const schemes = [
      'com.shopify.checkoutkit.reactnativedemo',
      'com.shopify.checkoutkit.swiftdemo',
      'com.shopify.checkoutkit.androiddemo',
    ];

    schemes.forEach((scheme) => {
      expect(parseControlLink(`${scheme}://e2e/cart?productIndex=0`)).toEqual(
        expected,
      );
    });
  });

  it('parses a scheme the matrix does not declare', () => {
    expect(
      parseControlLink('com.example.anything://e2e/cart?productIndex=0'),
    ).toEqual({command: 'cart', productIndex: 0, quantity: 1});
  });

  it('parses the reset command', () => {
    expect(parse('/reset')).toEqual({command: 'reset'});
  });

  it.each([
    ['/reset?productIndex=0', 'Unknown reset parameters: productIndex'],
    ['/cart?productIndex=0&quantitiy=5', 'Unknown cart parameters: quantitiy'],
    ['/cart?productIndx=0', 'Unknown cart parameters: productIndx'],
    ['/cart?productIndex=0&foo=1&bar=2', 'Unknown cart parameters: bar, foo'],
    ['/signIn?emial=shopper@example.com', 'Unknown signIn parameters: emial'],
  ])('rejects unknown parameters in %s', (path, message) => {
    expectRejection(path, message);
  });

  it.each(['', '/', '/teleport?productIndex=0', '/cart/extra?productIndex=0'])(
    'rejects the unknown command %s',
    path => {
      expectRejection(path, 'Unsupported e2e command');
    },
  );

  it.each(['/cart', '/cart?', '/cart?quantity=2'])(
    'rejects the cart command %s without a product selector',
    path => {
      expectRejection(path, 'Missing variantId or productIndex');
    },
  );

  it('rejects cart commands with both product selectors', () => {
    expectRejection(
      '/cart?variantId=gid://shopify/ProductVariant/1&productIndex=0',
      'Use variantId or productIndex, not both',
    );
  });

  it.each(['/cart?variantId=', '/cart?variantId=%20', '/cart?variantId=%0A'])(
    'rejects the blank variantId in %s',
    path => {
      expectRejection(path, 'variantId must not be blank');
    },
  );

  it.each([...REJECTED_NUMBERS, '0', '-1'])(
    'rejects the invalid quantity %s',
    quantity => {
      expectRejection(
        `/cart?productIndex=0&quantity=${quantity}`,
        'quantity must be a positive integer',
      );
    },
  );

  it.each([...REJECTED_NUMBERS, '-1'])(
    'rejects the invalid productIndex %s',
    productIndex => {
      expectRejection(
        `/cart?productIndex=${productIndex}`,
        'productIndex must be a non-negative integer',
      );
    },
  );

  it.each(['', 'member'])(
    'rejects the invalid buyerIdentityMode %s',
    buyerIdentityMode => {
      expectRejection(
        `/cart?productIndex=0&buyerIdentityMode=${buyerIdentityMode}`,
        'buyerIdentityMode must be guest, hardcoded, or customerAccount',
      );
    },
  );

  it('parses a cart command with a variant id', () => {
    expect(
      parse(
        '/cart?variantId=gid://shopify/ProductVariant/1&quantity=2&buyerIdentityMode=guest',
      ),
    ).toEqual({
      command: 'cart',
      variantId: 'gid://shopify/ProductVariant/1',
      quantity: 2,
      buyerIdentityMode: BuyerIdentityMode.Guest,
    });
  });

  it('parses a cart command with a product index and the default quantity', () => {
    expect(parse('/cart?productIndex=3&buyerIdentityMode=hardcoded')).toEqual({
      command: 'cart',
      productIndex: 3,
      quantity: 1,
      buyerIdentityMode: BuyerIdentityMode.Hardcoded,
    });
  });

  it('parses a cart command with a trailing slash', () => {
    expect(parse('/cart/?productIndex=3')).toEqual({
      command: 'cart',
      productIndex: 3,
      quantity: 1,
    });
  });

  it('parses a sign in command', () => {
    expect(parse('/signIn')).toEqual({command: 'signIn'});
  });

  it('rejects sign in parameters', () => {
    expectRejection(
      '/signIn?email=shopper@example.com',
      'Unknown signIn parameters: email',
    );
  });
});
