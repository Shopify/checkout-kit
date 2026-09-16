/**
 * Contract under API review; names may change.
 *
 * `ShopifyAcceleratedCheckoutButtons` is a placeholder web component that will
 * render accelerated checkout wallet buttons (e.g. Apple Pay, Google Pay,
 * Shop Pay). This scaffold defines the element's attribute/property contract
 * and renders an empty, accessible container. No wallet logic, network calls,
 * or runtime dependencies are included at this stage.
 */
export class ShopifyAcceleratedCheckoutButtons extends HTMLElement {
  static observedAttributes = [
    "store-domain",
    "country",
    "language",
    "cart-id",
    "variant-id",
    "selling-plan-id",
    "wallet-count",
  ] as const;

  #container: HTMLDivElement;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    this.#container = document.createElement("div");
    this.#container.setAttribute("role", "group");
    this.#container.setAttribute("aria-label", "Accelerated checkout");
    this.#container.setAttribute("data-state", "idle");
    shadow.appendChild(this.#container);
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
    const raw = this.getAttribute("wallet-count");
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
  }

  set walletCount(value: number | undefined) {
    if (value == null || value === 0) {
      this.removeAttribute("wallet-count");
      return;
    }
    const coerced = Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
    this.setAttribute("wallet-count", String(coerced));
  }

  #setAttribute(name: string, value: string | undefined) {
    if (value != null) {
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
  }

  disconnectedCallback(): void {
    this.#container.setAttribute("data-state", "idle");
  }

  attributeChangedCallback(
    _name: (typeof ShopifyAcceleratedCheckoutButtons.observedAttributes)[number],
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    // Attribute changes are tracked for future wallet logic.
    // The scaffold intentionally has no reactive side effects.
  }
}
