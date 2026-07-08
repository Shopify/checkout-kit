import { expect, type Locator, type Page } from "@playwright/test";

import type { CheckoutError, CheckoutEventRecord, CheckoutResource, ConfigureOptions } from "./types";

export class CheckoutHostPage {
  readonly page: Page;
  readonly overlay: Locator;
  readonly overlayLink: Locator;
  readonly overlayCloseButton: Locator;
  readonly buyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator("#overlay");
    this.overlayLink = page.locator("#overlay-link");
    this.overlayCloseButton = page.locator("#overlay-close-button");
    this.buyButton = page.locator("#buy");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.page.evaluate(() => customElements.whenDefined("shopify-checkout"));
  }

  async configure(options: ConfigureOptions): Promise<void> {
    await this.page.evaluate((opts) => window.__ck.configure(opts), options);
  }

  async open(): Promise<void> {
    await this.page.evaluate(() => window.__ck.open());
  }

  async close(): Promise<void> {
    await this.page.evaluate(() => window.__ck.close());
  }

  async clickBuy(): Promise<void> {
    await this.buyButton.click();
  }

  async openPopup(): Promise<Page> {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.buyButton.click()]);
    return popup;
  }

  async startCheckout(options: ConfigureOptions): Promise<Page> {
    await this.goto();
    await this.configure(options);
    return this.openPopup();
  }

  async hasShadowWrapper(): Promise<boolean> {
    return this.page.evaluate(() =>
      Boolean(
        document.querySelector("shopify-checkout")?.shadowRoot?.querySelector(
          "#shopify-element-wrapper",
        ),
      ),
    );
  }

  async receivedEvents(): Promise<CheckoutEventRecord[]> {
    return this.page.evaluate(() => window.__ck.events);
  }

  async eventDetail<T>(type: string): Promise<T | undefined> {
    const detail = await this.page.evaluate(
      (eventType) => window.__ck.events.find((event) => event.type === eventType)?.detail,
      type,
    );
    return detail as T | undefined;
  }

  async checkout(): Promise<CheckoutResource | undefined> {
    return this.page.evaluate(() => window.__ck.checkout);
  }

  async error(): Promise<CheckoutError | undefined> {
    return this.page.evaluate(() => window.__ck.error);
  }

  async expectEvent(type: string): Promise<void> {
    await expect
      .poll(async () => (await this.receivedEvents()).map((event) => event.type))
      .toContain(type);
  }
}
