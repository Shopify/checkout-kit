/**
 * Contract under API review; names may change.
 *
 * `ShopifyAcceleratedCheckoutButtons` is a placeholder web component that will
 * render accelerated checkout wallet buttons (e.g. Apple Pay, Google Pay,
 * Shop Pay). This scaffold defines the element's attribute/property contract
 * and renders an empty, accessible container. No wallet logic, network calls,
 * or runtime dependencies are included at this stage.
 *
 * @attribute store-domain - The storefront domain (e.g. `your-store.myshopify.com`).
 * @attribute country - Two-letter country code (e.g. `US`, `CA`).
 * @attribute language - BCP-47 language tag (e.g. `en`, `fr`).
 * @attribute cart-id - Shopify cart GID for an existing-cart flow.
 * @attribute variant-id - Product variant GID for a buy-now flow.
 * @attribute selling-plan-id - Optional selling plan GID (buy-now only).
 * @attribute wallet-count - Maximum number of wallets to render (0 = all).
 * @attribute layout - Button layout direction (`horizontal` or `vertical`).
 * @attribute log-level - Console logging verbosity (debug, warn, error, or none).
 */

import { Logger, coerceLogLevel } from "./logger";
import { createTemplate, html } from "./utils";
import type { LogLevel, WalletsAttributes, WalletsProperties } from "./wallets.types";

export type { LogLevel };

const SHADOW_TEMPLATE = createTemplate(html`
  <div role="group" aria-label="Accelerated checkout" data-state="idle"></div>
`);

export class ShopifyAcceleratedCheckoutButtons
  extends HTMLElement
  implements WalletsAttributes, WalletsProperties
{
  static observedAttributes = [
    "store-domain",
    "country",
    "language",
    "cart-id",
    "variant-id",
    "selling-plan-id",
    "wallet-count",
    "layout",
    "log-level",
  ] as const;

  #container: HTMLDivElement;
  #logger = new Logger("<shopify-accelerated-checkout-buttons>", () => this.logLevel);

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(SHADOW_TEMPLATE.content.cloneNode(true));
    this.#container = shadow.querySelector("[role='group']") as HTMLDivElement;
  }

  /* ------------------------------------------------------------
   * Read/write properties (reflected with attributes)
   * ------------------------------------------------------------ */

  get storeDomain(): string {
    return this.getAttribute("store-domain") ?? "";
  }

  set storeDomain(value: string | undefined) {
    this.#setAttribute("store-domain", value);
  }

  get country(): string {
    return this.getAttribute("country") ?? "";
  }

  set country(value: string | undefined) {
    this.#setAttribute("country", value);
  }

  get language(): string {
    return this.getAttribute("language") ?? "";
  }

  set language(value: string | undefined) {
    this.#setAttribute("language", value);
  }

  get cartId(): string {
    return this.getAttribute("cart-id") ?? "";
  }

  set cartId(value: string | undefined) {
    this.#setAttribute("cart-id", value);
  }

  get variantId(): string {
    return this.getAttribute("variant-id") ?? "";
  }

  set variantId(value: string | undefined) {
    this.#setAttribute("variant-id", value);
  }

  get sellingPlanId(): string {
    return this.getAttribute("selling-plan-id") ?? "";
  }

  set sellingPlanId(value: string | undefined) {
    this.#setAttribute("selling-plan-id", value);
  }

  get walletCount(): number {
    return Number(this.getAttribute("wallet-count")) || 0;
  }

  set walletCount(value: number | undefined) {
    if (!value) {
      this.removeAttribute("wallet-count");
    } else {
      this.setAttribute("wallet-count", String(value));
    }
  }

  get layout(): string {
    return this.getAttribute("layout") ?? "horizontal";
  }

  set layout(value: string | undefined) {
    this.#setAttribute("layout", value);
  }

  get logLevel(): LogLevel {
    return coerceLogLevel(this.getAttribute("log-level"));
  }

  set logLevel(value: LogLevel | undefined) {
    this.#setAttribute("log-level", value);
  }

  #setAttribute(name: string, value: string | boolean | undefined) {
    if (value === true) {
      this.setAttribute(name, "");
    } else if (value != null && value !== false) {
      this.setAttribute(name, value);
    } else {
      this.removeAttribute(name);
    }
  }

  /* ------------------------------------------------------------
   * Lifecycle
   * ------------------------------------------------------------ */

  connectedCallback(): void {
    this.#container.setAttribute("data-state", "idle");
    this.#logger.debug("connected");
  }

  disconnectedCallback(): void {
    this.#container.setAttribute("data-state", "idle");
    this.#logger.debug("disconnected");
  }

  attributeChangedCallback(
    name: (typeof ShopifyAcceleratedCheckoutButtons.observedAttributes)[number],
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue !== newValue) {
      this.#logger.debug(`attribute changed: ${name}`, { oldValue, newValue });
    }
  }
}
