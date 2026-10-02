import type { ShopifyCheckout, ShopifyCheckoutEventMap } from "@shopify/checkout-kit";

export type ConfigureOptions = Partial<Pick<ShopifyCheckout, "src" | "target" | "logLevel">>;

export type CheckoutEventRecord = {
  [K in keyof ShopifyCheckoutEventMap]: {
    type: K;
    detail: ShopifyCheckoutEventMap[K]["detail"] | null;
  };
}[keyof ShopifyCheckoutEventMap];

export interface SyntheticCheckoutDriver {
  readyResponse: Promise<void>;
  start(): void;
  complete(): void;
  lineItemsChange(): void;
  totalsChange(): void;
  messagesChange(): void;
  openRequest(url: string): void;
  error(): void;
}
