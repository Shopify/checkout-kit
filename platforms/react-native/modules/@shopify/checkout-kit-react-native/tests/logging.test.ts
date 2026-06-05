import {formatLogPrefix} from '../src/logging';

describe('formatLogPrefix', () => {
  it.each([
    ['ShopifyCheckoutKit', '[checkout_kit:sdk]'],
    ['checkout_kit', '[checkout_kit:sdk]'],
    ['sdk', '[checkout_kit:sdk]'],
    ['ShopifyAcceleratedCheckouts', '[checkout_kit:accelerated_checkout]'],
    ['CheckoutECP', '[checkout_kit:ecp]'],
    ['accelerated_checkout', '[checkout_kit:accelerated_checkout]'],
  ])('formats %s as %s', (scope, expected) => {
    expect(formatLogPrefix(scope)).toBe(expected);
  });
});
