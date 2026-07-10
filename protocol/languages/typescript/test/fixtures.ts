export const CHECKOUT_ENVELOPE = {
  id: 'checkout-123',
  currency: 'USD',
  status: 'incomplete',
  line_items: [],
  totals: [],
  links: [],
  ucp: {
    version: '2026-04-08',
    payment_handlers: {},
  },
};

export const RESULT_FIXTURE = {
  ucp: {
    status: 'success',
    version: '2026-04-08',
  },
};
