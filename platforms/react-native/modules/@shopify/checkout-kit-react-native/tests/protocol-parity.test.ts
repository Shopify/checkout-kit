/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import type {
  Checkout,
  EmbeddedCheckoutPublicNotificationMethod,
  ErrorResponse,
} from '@shopify/checkout-kit-protocol';

describe('protocol type parity', () => {
  it('can type check React Native against generated protocol models', () => {
    const method: EmbeddedCheckoutPublicNotificationMethod = 'ec.start';
    const checkout: Checkout = {
      id: 'chk_1',
      currency: 'USD',
      status: 'incomplete',
      lineItems: [],
      links: [],
      totals: [],
      ucp: {
        paymentHandlers: {},
        version: '2026-04-08',
      },
    };
    const error: ErrorResponse = {
      ucp: {
        version: '2026-04-08',
        status: 'error',
      },
      messages: [
        {
          type: 'error',
          code: 'unknown_error',
          content: 'Something went wrong.',
          severity: 'unrecoverable',
        },
      ],
    };

    expect(method).toBe('ec.start');
    expect(checkout.id).toBe('chk_1');
    expect(error.ucp.status).toBe('error');
  });
});
