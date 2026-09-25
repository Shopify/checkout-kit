import {decodeCheckout} from '../src/checkout';
import type {Checkout} from '../src';

export const wireCheckout = {
  id: 'checkout-123',
  currency: 'USD',
  status: 'incomplete',
  line_items: [],
  links: [],
  totals: [],
};

describe('Checkout snapshots', () => {
  it('decodes snapshots without requiring or exposing protocol metadata', () => {
    const checkout: Checkout = decodeCheckout({
      ...wireCheckout,
      ucp: {version: 'ignored'},
    });
    expect(checkout.id).toBe('checkout-123');
    expect(checkout.lineItems).toEqual([]);
    expect(checkout).not.toHaveProperty('line_items');
    expect(checkout).not.toHaveProperty('ucp');
  });

  it('converts schema fields while preserving extension and dictionary keys', () => {
    const checkout = decodeCheckout({
      ...wireCheckout,
      expires_at: '2026-09-25T12:00:00.123Z',
      buyer: {first_name: 'Test', merchant_field: {nested_key: true}},
      actions: {'com.example.verify': [{id: 'a1', config: {custom_key: true}}]},
      attribution: {source_name: 'sample'},
      signals: {buyer_signal: {custom_key: 1}},
      custom_extension: {line_items: ['unchanged']},
      policies: [{id: 'p1', type: 'return',
          description: {plain: 'Returns accepted'}, applies_to: ['$.line_items[0]']}],
      fulfillment: {
        available_methods: [{type: 'custom_delivery', line_item_ids: ['li-1']}],
        methods: [
          {
            id: 'm1',
            type: 'custom_delivery',
            line_item_ids: ['li-1'],
            groups: [
              {
                id: 'g1',
                options: [
                  {id: 'o1', title: 'Delivery', description: 'Tomorrow'},
                ],
              },
            ],
          },
        ],
      },
      messages: [{type: 'info', content: 'Hello', content_type: 'plain'}],
      order: {id: 'order-1', permalink_url: 'https://example.test/orders/1'},
    });
    expect(checkout.expiresAt).toBe('2026-09-25T12:00:00.123Z');
    expect(checkout.buyer).toEqual({
      firstName: 'Test',
      merchant_field: {nested_key: true},
    });
    expect(checkout.actions?.['com.example.verify']).toEqual([
      {id: 'a1', config: {custom_key: true}},
    ]);
    expect(checkout.attribution).toEqual({source_name: 'sample'});
    expect(checkout.signals).toEqual({buyer_signal: {custom_key: 1}});
    expect(checkout.custom_extension).toEqual({line_items: ['unchanged']});
    expect(checkout.policies?.[0]?.appliesTo).toEqual(['$.line_items[0]']);
    expect(checkout.fulfillment?.availableMethods?.[0]).toEqual({
      type: 'custom_delivery',
      lineItemIds: ['li-1'],
    });
    expect(
      checkout.fulfillment?.methods?.[0]?.groups?.[0]?.options?.[0]
        ?.description,
    ).toEqual({plain: 'Tomorrow'});
    expect(checkout.messages?.[0]?.contentType).toBe('plain');
    expect(checkout.order?.permalinkUrl).toBe('https://example.test/orders/1');
  });

  it.each([
    null,
    [],
    {},
    {...wireCheckout, id: 1},
    {...wireCheckout, line_items: null},
    {...wireCheckout, status: 2},
    {...wireCheckout, order: {id: 'o1'}},
  ])('rejects malformed snapshots', value => {
    expect(() => decodeCheckout(value)).toThrow(TypeError);
  });
});
