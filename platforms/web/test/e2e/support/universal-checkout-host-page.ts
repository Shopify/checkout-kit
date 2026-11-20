import type { Locator, Page } from "@playwright/test";
import type { ShopifyUniversalCheckoutEventMap } from "@shopify/checkout-kit";

import { ShopifyUniversalCheckoutPopup } from "./shopify-universal-checkout-popup";
import type {
  UniversalCheckoutEventRecord,
  UniversalConfigureOptions,
  UniversalStartOptions,
} from "./types";
import { universalCheckoutSrc, universalShops } from "./universal-checkout-fixture";

type UniversalCheckoutElement = HTMLElementTagNameMap["shopify-universal-checkout"];

export class UniversalCheckoutHostPage {
  readonly component: Locator;
  readonly overlay: Locator;
  readonly overlayRetryButton: Locator;
  readonly overlayCloseButton: Locator;
  readonly buyButton: Locator;

  constructor(readonly page: Page) {
    this.component = page.locator("shopify-universal-checkout");
    this.overlay = this.component.locator("#overlay");
    this.overlayRetryButton = this.component.getByRole("button", { name: "Open checkout" });
    this.overlayCloseButton = this.component.getByRole("button", { name: "Close", exact: true });
    this.buyButton = page.getByRole("button", { name: "Buy", exact: true });
  }

  async goto() {
    await this.page.goto("/universal");
    await this.page.evaluate(() => customElements.whenDefined("shopify-universal-checkout"));
  }

  async configure(options: UniversalConfigureOptions) {
    await this.component.evaluate(
      (checkout: UniversalCheckoutElement, { src, target, logLevel }) => {
        if (src !== undefined) checkout.src = src;
        if (target !== undefined) checkout.target = target;
        if (logLevel !== undefined) checkout.logLevel = logLevel;
      },
      options,
    );
  }

  async close() {
    await this.component.evaluate((checkout: UniversalCheckoutElement) => checkout.close());
  }

  async focus() {
    await this.page.bringToFront();
    // bringToFront() fires no focus event in headless Chromium.
    await this.page.evaluate(() => window.dispatchEvent(new FocusEvent("focus")));
  }

  async clickBuy() {
    await this.buyButton.click();
  }

  async openPopup(): Promise<ShopifyUniversalCheckoutPopup> {
    const [popup] = await Promise.all([this.page.waitForEvent("popup"), this.clickBuy()]);
    return new ShopifyUniversalCheckoutPopup(popup);
  }

  async retryFromOverlay(): Promise<ShopifyUniversalCheckoutPopup> {
    const [popup] = await Promise.all([
      this.page.waitForEvent("popup"),
      this.overlayRetryButton.click(),
    ]);
    return new ShopifyUniversalCheckoutPopup(popup);
  }

  async prepareCheckout({ signedOut, ...options }: UniversalStartOptions = {}) {
    await this.goto();
    await this.configure({
      src: universalCheckoutSrc({
        host_origin: new URL(this.page.url()).origin,
        shops: String(universalShops.length),
        ...(signedOut && { signed_out: "1" }),
      }),
      target: "popup",
      ...options,
    });
  }

  async target(): Promise<UniversalCheckoutElement["target"]> {
    return this.component.evaluate((checkout: UniversalCheckoutElement) => checkout.target);
  }

  async startCheckout(options: UniversalStartOptions = {}): Promise<ShopifyUniversalCheckoutPopup> {
    await this.prepareCheckout(options);
    return this.openPopup();
  }

  async receivedEvents(): Promise<UniversalCheckoutEventRecord[]> {
    return this.page.evaluate(() => window.universalCheckoutEvents);
  }

  async eventTypes(): Promise<UniversalCheckoutEventRecord["type"][]> {
    return (await this.receivedEvents()).map(({ type }) => type);
  }

  // A session dispatches complete once per revision at which shops complete, so return every match in order.
  eventDetails<K extends keyof ShopifyUniversalCheckoutEventMap>(
    type: K,
  ): Promise<(ShopifyUniversalCheckoutEventMap[K]["detail"] | null)[]>;
  async eventDetails(type: keyof ShopifyUniversalCheckoutEventMap) {
    const events = await this.receivedEvents();
    return events.filter((record) => record.type === type).map(({ detail }) => detail);
  }
}
