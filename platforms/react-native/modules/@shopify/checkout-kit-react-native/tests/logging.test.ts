import {formatLogPrefix} from '../src/logging';

describe('formatLogPrefix', () => {
  it.each([
    ['ShopifyCheckoutKit', '[checkout_kit:checkout_kit]'],
    ['ShopifyAcceleratedCheckouts', '[checkout_kit:accelerated_checkout]'],
    ['CheckoutECP', '[checkout_kit:ecp]'],
    ['URLParser', '[checkout_kit:url_parser]'],
    ['HTTPRequest', '[checkout_kit:http_request]'],
    ['accelerated_checkout', '[checkout_kit:accelerated_checkout]'],
    ['Checkout2Kit', '[checkout_kit:checkout2_kit]'],
    ['ECP2Checkout', '[checkout_kit:ecp2_checkout]'],
  ])('formats %s as %s', (scope, expected) => {
    expect(formatLogPrefix(scope)).toBe(expected);
  });
});
