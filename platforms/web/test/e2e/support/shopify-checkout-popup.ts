import type { Page } from "@playwright/test";

import type { WindowOpenStatus } from "./types";

export class ShopifyCheckoutPopup {
  constructor(readonly page: Page) {}

  async waitForReadyResponse() {
    await this.page.waitForFunction(() => Boolean(window.syntheticCheckout));
    await this.page.evaluate(() => window.syntheticCheckout.readyResponse);
  }

  async start() {
    await this.page.evaluate(() => window.syntheticCheckout.start());
  }

  async complete() {
    await this.page.evaluate(() => window.syntheticCheckout.complete());
  }

  async lineItemsChange() {
    await this.page.evaluate(() => window.syntheticCheckout.lineItemsChange());
  }

  async totalsChange() {
    await this.page.evaluate(() => window.syntheticCheckout.totalsChange());
  }

  async messagesChange() {
    await this.page.evaluate(() => window.syntheticCheckout.messagesChange());
  }

  /** Sends `ec.window.open_request` and resolves with the host's `ucp.status`. */
  async openRequest(url: string): Promise<WindowOpenStatus> {
    return this.page.evaluate(
      (requestedUrl) => window.syntheticCheckout.openRequest(requestedUrl),
      url,
    );
  }

  async error() {
    await this.page.evaluate(() => window.syntheticCheckout.error());
  }

  isClosed(): boolean {
    return this.page.isClosed();
  }
}
