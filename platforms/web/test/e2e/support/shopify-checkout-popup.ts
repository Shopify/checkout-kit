import type { Page } from "@playwright/test";

export class ShopifyCheckoutPopup {
  constructor(readonly page: Page) {}

  async waitForReadyResponse(): Promise<void> {
    await this.page.waitForFunction(() => Boolean(window.syntheticCheckout));
    await this.page.evaluate(() => window.syntheticCheckout.readyResponse);
  }

  async start(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.start());
  }

  async complete(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.complete());
  }

  async lineItemsChange(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.lineItemsChange());
  }

  async totalsChange(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.totalsChange());
  }

  async messagesChange(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.messagesChange());
  }

  async openRequest(url: string): Promise<void> {
    await this.page.evaluate(
      (requestedUrl) => window.syntheticCheckout.openRequest(requestedUrl),
      url,
    );
  }

  async error(): Promise<void> {
    await this.page.evaluate(() => window.syntheticCheckout.error());
  }

  isClosed(): boolean {
    return this.page.isClosed();
  }
}
