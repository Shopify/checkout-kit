import { expect, type Locator, type Page } from "@playwright/test";
import type { ShopifyCheckout, ShopifyCheckoutEventMap } from "@shopify/checkout-kit";

import { checkoutSrc } from "./checkout-fixture";
import { ShopifyCheckoutPopup } from "./shopify-checkout-popup";
import type { CheckoutEventRecord, ConfigureOptions } from "./types";

export class CheckoutHostPage {
  readonly component: Locator;
  readonly overlay: Locator;
  readonly overlayFocusButton: Locator;
  readonly overlayCloseButton: Locator;
  readonly buyButton: Locator;

  constructor(readonly page: Page) {
    this.component = page.locator("shopify-checkout");
    this.overlay = this.component.locator("#overlay");
    this.overlayFocusButton = this.component.getByRole("button", { name: "checkout window" });
    this.overlayCloseButton = this.component.getByRole("button", { name: "Close", exact: true });
    this.buyButton = page.getByRole("button", { name: "Buy", exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.page.evaluate(() => customElements.whenDefined("shopify-checkout"));
  }

  async configure(options: ConfigureOptions): Promise<void> {
    await this.component.evaluate((element, { src, target, logLevel }) => {
      const checkout = element as ShopifyCheckout;
      if (src !== undefined) checkout.src = src;
      if (target !== undefined) checkout.target = target;
      if (logLevel !== undefined) checkout.logLevel = logLevel;
    }, options);
  }

  async close(): Promise<void> {
    await this.component.evaluate((element) => (element as ShopifyCheckout).close());
  }

  async clickBuy(): Promise<void> {
    await this.buyButton.click();
  }

  async openPopup(): Promise<ShopifyCheckoutPopup> {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.clickBuy()]);
    return new ShopifyCheckoutPopup(popup);
  }

  async startCheckout(options: ConfigureOptions = {}): Promise<ShopifyCheckoutPopup> {
    await this.goto();
    await this.configure({
      src: checkoutSrc({ host_origin: new URL(this.page.url()).origin }),
      target: "popup",
      ...options,
    });
    return this.openPopup();
  }

  async hasShadowWrapper(): Promise<boolean> {
    return this.component.evaluate((element) =>
      Boolean(element.shadowRoot?.querySelector("#shopify-element-wrapper")),
    );
  }

  async receivedEvents(): Promise<CheckoutEventRecord[]> {
    return this.page.evaluate(() => window.checkoutEvents);
  }

  async eventTypes(): Promise<CheckoutEventRecord["type"][]> {
    return (await this.receivedEvents()).map(({ type }) => type);
  }

  eventDetail<K extends keyof ShopifyCheckoutEventMap>(
    type: K,
  ): Promise<ShopifyCheckoutEventMap[K]["detail"] | null | undefined>;
  async eventDetail(type: keyof ShopifyCheckoutEventMap) {
    const events = await this.receivedEvents();
    return events.find((record) => record.type === type)?.detail;
  }

  async checkout() {
    return this.component.evaluate((element) => (element as ShopifyCheckout).checkout);
  }

  async error() {
    return this.component.evaluate((element) => (element as ShopifyCheckout).error);
  }

  async expectEvent(type: CheckoutEventRecord["type"]): Promise<void> {
    await expect.poll(() => this.eventTypes()).toContain(type);
  }
}
