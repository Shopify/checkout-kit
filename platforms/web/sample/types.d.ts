// TODO: delete this file once `@shopify/checkout-kit` exports the real
// `ShopifyCheckout` types from `../src`.
//
// Forward-looking type declarations describing the API surface that the
// `<shopify-checkout>` component will expose once its implementation lands
// in `../src`. Lets the playground compile and read as if the component
// were already in place. At runtime, the element is not yet registered
// and renders as an unknown HTML element.

// `inline` is intentionally omitted from the initial release — only popup
// (window.open with explicit features) and auto (window.open new tab) are
// supported in v1. Add `"inline"` back here when iframe rendering lands.
type CheckoutTarget = "auto" | "popup";

interface ShopifyCheckoutCart {
  [key: string]: unknown;
}

interface ShopifyCheckoutOrderConfirmation {
  [key: string]: unknown;
}

interface ShopifyCheckoutError {
  code: string;
  message: string;
}

interface ShopifyCheckoutElement extends HTMLElement {
  // ── Read/write attributes (reflected) ──
  src: string;
  target: CheckoutTarget | string;

  // ── Read-only state populated by checkout protocol events ──
  readonly cart?: ShopifyCheckoutCart;
  readonly locale?: string;
  readonly orderConfirmation?: ShopifyCheckoutOrderConfirmation;
  readonly error?: ShopifyCheckoutError;
  readonly sessionId?: string;

  // ── Methods ──
  open(): void;
  close(): void;
  focus(): void;
}

// In an ambient .d.ts (no top-level imports/exports), interface declarations
// are global, so `HTMLElementTagNameMap` is augmented directly without
// needing a `declare global` wrapper.
interface HTMLElementTagNameMap {
  "shopify-checkout": ShopifyCheckoutElement;
}
