import type { Page } from "@playwright/test";

interface SyntheticCheckoutDriver {
  readyResponse: Promise<unknown>;
  start(): void;
  complete(): void;
  lineItemsChange(): void;
  totalsChange(): void;
  messagesChange(): void;
  openRequest(url: string): void;
  error(): void;
}

export class ShopifyCheckoutPopup {
  constructor(private readonly page: Page) {}

  async waitForReadyResponse(): Promise<void> {
    await this.waitForSyntheticCheckout();
    await this.page.evaluate(() => {
      const checkout = (
        window as unknown as {
          __syntheticCheckout: Pick<SyntheticCheckoutDriver, "readyResponse">;
        }
      ).__syntheticCheckout;
      return checkout.readyResponse;
    });
  }

  async start(): Promise<void> {
    await this.call("start");
  }

  async complete(): Promise<void> {
    await this.call("complete");
  }

  async lineItemsChange(): Promise<void> {
    await this.call("lineItemsChange");
  }

  async totalsChange(): Promise<void> {
    await this.call("totalsChange");
  }

  async messagesChange(): Promise<void> {
    await this.call("messagesChange");
  }

  async openRequest(url: string): Promise<void> {
    await this.call("openRequest", url);
  }

  async error(): Promise<void> {
    await this.call("error");
  }

  private async call(
    method: Exclude<keyof SyntheticCheckoutDriver, "readyResponse">,
    ...args: string[]
  ): Promise<void> {
    await this.waitForSyntheticCheckout();
    await this.page.evaluate(
      ({ methodName, methodArgs }) => {
        const checkout = (
          window as unknown as {
            __syntheticCheckout: Record<string, (...args: string[]) => void>;
          }
        ).__syntheticCheckout;
        checkout[methodName]?.(...methodArgs);
      },
      { methodName: method, methodArgs: args },
    );
  }

  private async waitForSyntheticCheckout(): Promise<void> {
    await this.page.waitForFunction(() =>
      Boolean((window as unknown as { __syntheticCheckout?: unknown }).__syntheticCheckout),
    );
  }
}
