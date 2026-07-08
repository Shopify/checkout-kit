import type { CheckoutError, CheckoutEventRecord, CheckoutResource, ConfigureOptions } from "./types";

export {};

declare global {
  interface Window {
    __ck: {
      readonly events: CheckoutEventRecord[];
      readonly checkout: CheckoutResource | undefined;
      readonly error: CheckoutError | undefined;
      configure(options?: ConfigureOptions): void;
      open(): void;
      close(): void;
    };
  }
}
