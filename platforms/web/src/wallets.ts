import type {
  CartIdentifier,
  GetCart,
  WalletCallbacks,
  WalletConfiguration,
  WalletLayout,
  WalletsProperties,
} from "./wallets.types";

const ROOT_PART = "root";

const scalarProperties = [
  "storeDomain",
  "country",
  "locale",
  "currency",
  "cartId",
  "variantId",
  "sellingPlanId",
  "walletCount",
  "layout",
] as const satisfies ReadonlyArray<keyof WalletConfiguration>;

const upgradableProperties = [...scalarProperties, "getCart", "callbacks"] as const;

/**
 * Checkout Kit's merchant-facing accelerated checkout wallet element.
 *
 * @attribute store-domain - Shopify domain used for this integration.
 * @attribute country - Current buyer country.
 * @attribute locale - Current buyer locale.
 * @attribute currency - Current presentment currency.
 * The sensitive `cartId` input is property-only and is never reflected into
 * markup. Its transport-specific representation remains opaque to merchants.
 *
 * @attribute variant-id - Selected product variant for Buy Now.
 * @attribute selling-plan-id - Optional selling plan for Buy Now.
 * @attribute wallet-count - Maximum number of wallets to render. Zero means all.
 * @attribute layout - Requested horizontal or vertical wallet layout.
 */
export class ShopifyAcceleratedCheckoutButtons extends HTMLElement implements WalletsProperties {
  static observedAttributes = [
    "store-domain",
    "country",
    "locale",
    "currency",
    "variant-id",
    "selling-plan-id",
    "wallet-count",
    "layout",
  ] as const;

  #cartId: CartIdentifier | undefined;
  #getCart: GetCart | undefined;
  #callbacks: WalletCallbacks | undefined;

  constructor() {
    super();

    for (const property of upgradableProperties) this.#upgradeProperty(property);

    const root = document.createElement("div");
    root.setAttribute("part", ROOT_PART);
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Accelerated checkout");

    this.attachShadow({ mode: "open" }).append(root);
  }

  connectedCallback(): void {
    for (const property of upgradableProperties) this.#upgradeProperty(property);
  }

  get storeDomain(): string | undefined {
    return this.#attribute("store-domain");
  }

  set storeDomain(value: string | undefined) {
    this.#setAttribute("store-domain", value);
  }

  get country(): string | undefined {
    return this.#attribute("country");
  }

  set country(value: string | undefined) {
    this.#setAttribute("country", value);
  }

  get locale(): string | undefined {
    return this.#attribute("locale");
  }

  set locale(value: string | undefined) {
    this.#setAttribute("locale", value);
  }

  get currency(): string | undefined {
    return this.#attribute("currency");
  }

  set currency(value: string | undefined) {
    this.#setAttribute("currency", value);
  }

  get cartId(): CartIdentifier | undefined {
    return this.#cartId;
  }

  set cartId(value: CartIdentifier | undefined) {
    this.#cartId = value;
  }

  get variantId(): string | undefined {
    return this.#attribute("variant-id");
  }

  set variantId(value: string | undefined) {
    this.#setAttribute("variant-id", value);
  }

  get sellingPlanId(): string | undefined {
    return this.#attribute("selling-plan-id");
  }

  set sellingPlanId(value: string | undefined) {
    this.#setAttribute("selling-plan-id", value);
  }

  get walletCount(): number {
    const value = Number(this.getAttribute("wallet-count"));
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  }

  set walletCount(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      this.removeAttribute("wallet-count");
      return;
    }

    this.setAttribute("wallet-count", String(Math.trunc(value)));
  }

  get layout(): WalletLayout | undefined {
    return this.#attribute("layout") as WalletLayout | undefined;
  }

  set layout(value: WalletLayout | undefined) {
    this.#setAttribute("layout", value);
  }

  get getCart(): GetCart | undefined {
    return this.#getCart;
  }

  set getCart(value: GetCart | undefined) {
    this.#getCart = value;
  }

  get callbacks(): WalletCallbacks | undefined {
    return this.#callbacks;
  }

  set callbacks(value: WalletCallbacks | undefined) {
    this.#callbacks = value;
  }

  configure(configuration: WalletConfiguration): void {
    const values = configuration as Record<string, unknown>;

    for (const property of scalarProperties) {
      if (!Object.hasOwn(configuration, property)) continue;
      Object.assign(this, { [property]: values[property] });
    }

    if (Object.hasOwn(configuration, "getCart")) this.getCart = configuration.getCart;
    if (Object.hasOwn(configuration, "callbacks")) this.callbacks = configuration.callbacks;
  }

  #upgradeProperty(property: (typeof upgradableProperties)[number]): void {
    if (!Object.hasOwn(this, property)) return;

    const instance = this as unknown as Record<string, unknown>;
    const value = instance[property];
    delete instance[property];
    Object.assign(this, { [property]: value });
  }

  #attribute(name: string): string | undefined {
    return this.getAttribute(name) ?? undefined;
  }

  #setAttribute(name: string, value: string | undefined): void {
    if (value === undefined) this.removeAttribute(name);
    else this.setAttribute(name, value);
  }
}

export type {
  CartIdentifier,
  GetCart,
  GetCartRequest,
  KnownWalletErrorCode,
  WalletCallbacks,
  WalletConfiguration,
  WalletDisplayError,
  WalletLayout,
  WalletPurchaseSnapshot,
  WalletsAttributes,
  WalletsProperties,
} from "./wallets.types";
