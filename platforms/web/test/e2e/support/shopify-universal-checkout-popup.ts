import type { Page } from "@playwright/test";

import type { UniversalShop } from "./universal-checkout-fixture";

export class ShopifyUniversalCheckoutPopup {
  constructor(readonly page: Page) {}

  async waitForReadyResponse() {
    await this.page.waitForFunction(() => Boolean(window.syntheticUniversalCheckout));
    await this.page.evaluate(() => window.syntheticUniversalCheckout.readyResponse);
  }

  async signIn() {
    await this.page.waitForFunction(() => Boolean(window.syntheticUniversalCheckout));
    await this.page.evaluate(() => window.syntheticUniversalCheckout.signIn());
  }

  async start() {
    await this.page.evaluate(() => window.syntheticUniversalCheckout.start());
  }

  async update(shop: UniversalShop) {
    await this.page.evaluate(
      (shopId) => window.syntheticUniversalCheckout.update(shopId),
      shop.shopId,
    );
  }

  async eject(shop: UniversalShop) {
    await this.page.evaluate(
      (shopId) => window.syntheticUniversalCheckout.eject(shopId),
      shop.shopId,
    );
  }

  async complete(shop: UniversalShop) {
    await this.page.evaluate(
      (shopId) => window.syntheticUniversalCheckout.complete(shopId),
      shop.shopId,
    );
  }

  async close() {
    await this.page.close();
  }

  isClosed(): boolean {
    return this.page.isClosed();
  }
}
