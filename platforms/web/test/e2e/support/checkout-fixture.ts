import type { Checkout } from "@shopify/checkout-kit";

export const checkoutOrigin = "https://checkout.example.test";
export const checkoutId = "checkout_test_1";
export const orderId = "order_test_1";

export function checkoutSrc(params: Record<string, string> = {}): string {
  const url = new URL(`/checkout/${checkoutId}`, checkoutOrigin);
  url.search = new URLSearchParams(params).toString();
  return url.href;
}

// Public SDK data, kept separate from the synthetic checkout's wire payload.
export const startedCheckout = {
  id: checkoutId,
  currency: "USD",
  status: "incomplete",
  lineItems: [
    {
      id: "li_1",
      item: { id: "variant_1", title: "Test Product", price: 2000 },
      quantity: 1,
      totals: [{ type: "total", amount: 2000 }],
    },
  ],
  totals: [{ type: "total", amount: 2000 }],
  links: [],
} satisfies Checkout;
