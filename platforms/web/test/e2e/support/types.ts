import type {
  ShopifyCheckout,
  ShopifyCheckoutEventMap,
  ShopifyUniversalCheckout,
  ShopifyUniversalCheckoutEventMap,
} from "@shopify/checkout-kit";

export type ConfigureOptions = Partial<Pick<ShopifyCheckout, "src" | "target" | "logLevel">>;

export type UniversalConfigureOptions = Partial<
  Pick<ShopifyUniversalCheckout, "src" | "target" | "logLevel">
>;

export type UniversalStartOptions = UniversalConfigureOptions & {
  /** Opens the synthetic checkout at Shop sign-in, before any protocol messages. */
  signedOut?: boolean;
};

export type CheckoutEventRecord = {
  [K in keyof ShopifyCheckoutEventMap]: {
    type: K;
    detail: ShopifyCheckoutEventMap[K]["detail"] | null;
  };
}[keyof ShopifyCheckoutEventMap];

export type UniversalCheckoutEventRecord = {
  [K in keyof ShopifyUniversalCheckoutEventMap]: {
    type: K;
    detail: ShopifyUniversalCheckoutEventMap[K]["detail"] | null;
  };
}[keyof ShopifyUniversalCheckoutEventMap];

export type WindowOpenStatus = "success" | "error";

export interface SyntheticCheckoutDriver {
  readyResponse: Promise<void>;
  start(): void;
  complete(): void;
  lineItemsChange(): void;
  totalsChange(): void;
  messagesChange(): void;
  openRequest(url: string): Promise<WindowOpenStatus>;
  error(): void;
}

export interface SyntheticUniversalCheckoutDriver {
  readyResponse: Promise<void>;
  signIn(): void;
  start(): void;
  update(shopId: string): void;
  eject(shopId: string): void;
  complete(shopId: string): void;
}
