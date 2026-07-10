export const CHECKOUT_ENVELOPE = {
  id: 'checkout-123',
  currency: 'USD',
  status: 'incomplete',
  continue_url: 'https://checkout.example.com/c/checkout-123',
  expires_at: '2026-04-08T18:30:00Z',
  buyer: {
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone_number: '+15555550100',
    email: 'buyer@example.com',
  },
  context: {
    address_country: 'CA',
    address_region: 'ON',
    postal_code: 'M5V 2T6',
  },
  line_items: [
    {
      id: 'line-1',
      parent_id: null,
      quantity: 2,
      item: {
        id: 'gid://shopify/ProductVariant/1',
        title: 'Merino Wool Beanie',
        price: 2999,
        image_url: 'https://cdn.example.com/products/beanie.png',
      },
      totals: [
        {type: 'subtotal', amount: 5998, display_text: 'Subtotal'},
      ],
    },
    {
      id: 'line-2',
      parent_id: 'line-1',
      quantity: 1,
      item: {
        id: 'gid://shopify/ProductVariant/2',
        title: 'Gift Wrap',
        price: 500,
        image_url: 'https://cdn.example.com/products/giftwrap.png',
      },
      totals: [
        {type: 'subtotal', amount: 500, display_text: 'Subtotal'},
      ],
    },
  ],
  totals: [
    {
      type: 'subtotal',
      amount: 6498,
      display_text: 'Subtotal',
      lines: [
        {amount: 5998, display_text: 'Merino Wool Beanie'},
        {amount: 500, display_text: 'Gift Wrap'},
      ],
    },
    {
      type: 'total',
      amount: 7847,
      display_text: 'Total',
      lines: [
        {amount: 6498, display_text: 'Items'},
        {amount: 850, display_text: 'Taxes'},
        {amount: 499, display_text: 'Shipping'},
      ],
    },
  ],
  fulfillment: {
    available_methods: [
      {
        type: 'shipping',
        line_item_ids: ['line-1', 'line-2'],
        fulfillable_on: 'now',
        description: 'Ships within 2 business days',
      },
      {
        type: 'pickup',
        line_item_ids: ['line-1'],
        fulfillable_on: '2026-04-10',
        description: 'Available for pickup at Downtown Store',
      },
    ],
    methods: [
      {
        id: 'method-shipping',
        type: 'shipping',
        line_item_ids: ['line-1', 'line-2'],
        selected_destination_id: 'dest-1',
        destinations: [
          {
            id: 'dest-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            phone_number: '+15555550100',
            street_address: '123 Fake Street',
            extended_address: 'Unit 4',
            address_locality: 'Toronto',
            address_region: 'ON',
            postal_code: 'M5V 2T6',
            address_country: 'CA',
          },
        ],
        groups: [
          {
            id: 'group-1',
            line_item_ids: ['line-1', 'line-2'],
            selected_option_id: 'option-standard',
            options: [
              {
                id: 'option-standard',
                title: 'Standard Shipping',
                carrier: 'ExamplePost',
                earliest_fulfillment_time: '2026-04-11',
                latest_fulfillment_time: '2026-04-15',
                totals: [
                  {type: 'fulfillment', amount: 499, display_text: 'Shipping'},
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  payment: {
    instruments: [
      {
        id: 'instrument-1',
        type: 'card',
        handler_id: 'com.shopify.payments',
        selected: true,
        billing_address: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          street_address: '123 Fake Street',
          address_locality: 'Toronto',
          address_region: 'ON',
          postal_code: 'M5V 2T6',
          address_country: 'CA',
        },
      },
    ],
  },
  messages: [
    {
      type: 'info',
      content: 'Free shipping on orders over $50.',
      content_type: 'plain',
      severity: 'recoverable',
      path: '$.line_items[0]',
      image_url: 'https://cdn.example.com/icons/info.png',
    },
  ],
  order: {
    id: 'order-1',
    label: '#1001',
    permalink_url: 'https://checkout.example.com/orders/order-1',
  },
  links: [
    {
      type: 'privacy_policy',
      title: 'Privacy Policy',
      url: 'https://example.com/privacy',
    },
    {
      type: 'terms_of_service',
      title: 'Terms of Service',
      url: 'https://example.com/terms',
    },
  ],
  ucp: {
    version: '2026-04-08',
    status: 'success',
    payment_handlers: {
      'com.shopify.payments': [
        {
          id: 'com.shopify.payments',
          version: '2026-04-08',
          available_instruments: [
            {type: 'card', brands: ['visa', 'mastercard']},
          ],
        },
      ],
    },
    services: {
      'com.shopify.checkout.embedded': [
        {
          id: 'embedded-1',
          version: '2026-04-08',
          config: {color_scheme: 'dark'},
        },
      ],
    },
  },
  'com.example.custom': {
    loyalty_tier: 'gold',
    referral_code: 'FRIEND-100',
  },
};

export const RESULT_FIXTURE = {
  ucp: {
    status: 'success',
    version: '2026-04-08',
  },
};
