import { createWalletAdapter, type WalletAdapter } from "./wallets-adapter";
import type {
  CartIdentifier,
  GetCart,
  WalletAvailability,
  WalletCallbacks,
  WalletConfiguration,
  WalletDisplayError,
  WalletErrorEventDetail,
  WalletLayout,
  WalletPurchaseSnapshot,
  WalletRenderEventDetail,
  WalletsProperties,
} from "./wallets.types";

const ROOT_PART = "root";
const HTMLElementBase: typeof HTMLElement =
  globalThis.HTMLElement ?? (Object as unknown as typeof HTMLElement);

export const EXPRESS_CHECKOUT_EVENTS = {
  render: "shopify:express-checkouts:render",
  error: "shopify:express-checkouts:error",
} as const;

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

type ConfigurationState =
  | { status: "incomplete" }
  | { status: "invalid" }
  | {
      status: "ready";
      key: string;
      purchase: Readonly<WalletPurchaseSnapshot>;
      getCart?: GetCart;
    };

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
export class ShopifyAcceleratedCheckoutButtons
  extends HTMLElementBase
  implements WalletsProperties
{
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
  #availability: WalletAvailability = { state: "loading" };
  #error: WalletDisplayError | null = null;
  #adapter: WalletAdapter | undefined;
  #root: HTMLDivElement;
  #connected = false;
  #reconcileScheduled = false;
  #generation = 0;
  #controller: AbortController | undefined;
  #startedKey: string | undefined;
  #cartUpdateGeneration = 0;
  #cartUpdatePending = false;
  #cartUpdateScheduledGeneration: number | undefined;
  #cartUpdateRunningGeneration: number | undefined;

  constructor() {
    super();

    for (const property of upgradableProperties) this.#upgradeProperty(property);

    this.#adapter = createWalletAdapter();
    this.#root = document.createElement("div");
    this.#root.setAttribute("part", ROOT_PART);
    this.#root.setAttribute("role", "group");
    this.#root.setAttribute("aria-label", "Accelerated checkout");
    this.#root.setAttribute("data-state", "loading");

    this.attachShadow({ mode: "open" }).append(this.#root);
  }

  connectedCallback(): void {
    for (const property of upgradableProperties) this.#upgradeProperty(property);
    this.#connected = true;
    this.#scheduleReconcile();
  }

  disconnectedCallback(): void {
    this.#connected = false;
    this.#stopAdapter();
    this.#startedKey = undefined;
    this.#clearError(false);
    this.#setAvailability({ state: "loading" }, false);
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) this.#scheduleReconcile();
  }

  get storeDomain(): string | undefined {
    return this.#attribute("store-domain");
  }

  set storeDomain(value: string | null | undefined) {
    this.#setAttribute("store-domain", value);
  }

  get country(): string | undefined {
    return this.#attribute("country");
  }

  set country(value: string | null | undefined) {
    this.#setAttribute("country", value);
  }

  get locale(): string | undefined {
    return this.#attribute("locale");
  }

  set locale(value: string | null | undefined) {
    this.#setAttribute("locale", value);
  }

  get currency(): string | undefined {
    return this.#attribute("currency");
  }

  set currency(value: string | null | undefined) {
    this.#setAttribute("currency", value);
  }

  get cartId(): CartIdentifier | undefined {
    return this.#cartId;
  }

  set cartId(value: CartIdentifier | null | undefined) {
    const normalized = value ?? undefined;
    if (this.#cartId === normalized) return;
    this.#invalidateCartUpdates();
    this.#cartId = normalized;
    this.#startedKey = undefined;
    this.#scheduleReconcile();
  }

  get variantId(): string | undefined {
    return this.#attribute("variant-id");
  }

  set variantId(value: string | null | undefined) {
    this.#setAttribute("variant-id", value);
  }

  get sellingPlanId(): string | undefined {
    return this.#attribute("selling-plan-id");
  }

  set sellingPlanId(value: string | null | undefined) {
    this.#setAttribute("selling-plan-id", value);
  }

  get walletCount(): number {
    const value = Number(this.getAttribute("wallet-count"));
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  }

  set walletCount(value: number | null | undefined) {
    const normalized = value == null ? 0 : Math.trunc(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      this.removeAttribute("wallet-count");
      return;
    }

    this.setAttribute("wallet-count", String(normalized));
  }

  get layout(): WalletLayout | undefined {
    const value = this.#attribute("layout");
    return value === "horizontal" || value === "vertical" ? value : undefined;
  }

  set layout(value: WalletLayout | null | undefined) {
    this.#setAttribute("layout", value);
  }

  get getCart(): GetCart | undefined {
    return this.#getCart;
  }

  set getCart(value: GetCart | null | undefined) {
    const normalized = value ?? undefined;
    if (this.#getCart === normalized) return;
    this.#getCart = normalized;

    if (!this.#cartId) {
      this.#startedKey = undefined;
      this.#scheduleReconcile();
    }
  }

  get callbacks(): WalletCallbacks | undefined {
    return this.#callbacks;
  }

  set callbacks(value: WalletCallbacks | null | undefined) {
    this.#callbacks = value ?? undefined;
  }

  get availability(): WalletAvailability {
    return this.#availability;
  }

  get error(): WalletDisplayError | null {
    return this.#error;
  }

  configure(configuration: WalletConfiguration): void {
    const values = configuration as Record<string, unknown>;

    for (const property of scalarProperties) {
      if (!Object.hasOwn(configuration, property)) continue;
      Object.assign(this, { [property]: values[property] });
    }

    if (Object.hasOwn(configuration, "getCart")) this.getCart = configuration.getCart;
    if (Object.hasOwn(configuration, "callbacks")) this.callbacks = configuration.callbacks;
    this.#scheduleReconcile();
  }

  cartUpdated(): void {
    if (
      !this.#connected ||
      !this.cartId ||
      this.#startedKey === undefined ||
      !this.#adapter?.cartUpdated
    ) {
      return;
    }

    this.#cartUpdatePending = true;
    this.#scheduleCartUpdate();
  }

  #scheduleCartUpdate(): void {
    const generation = this.#cartUpdateGeneration;
    if (
      this.#availability.state !== "ready" ||
      this.#cartUpdateScheduledGeneration === generation ||
      this.#cartUpdateRunningGeneration === generation
    ) {
      return;
    }

    const cartId = this.cartId;
    if (!cartId) return;

    this.#cartUpdateScheduledGeneration = generation;
    queueMicrotask(() => {
      if (this.#cartUpdateScheduledGeneration === generation) {
        this.#cartUpdateScheduledGeneration = undefined;
      }
      void this.#drainCartUpdates(generation, cartId);
    });
  }

  async #drainCartUpdates(generation: number, cartId: CartIdentifier): Promise<void> {
    if (
      this.#cartUpdateRunningGeneration === generation ||
      !this.#isCartUpdateCurrent(generation, cartId)
    ) {
      return;
    }

    this.#cartUpdateRunningGeneration = generation;
    this.#clearError();

    try {
      while (this.#cartUpdatePending && this.#isCartUpdateCurrent(generation, cartId)) {
        this.#cartUpdatePending = false;
        await this.#adapter?.cartUpdated?.();
      }
    } catch {
      if (this.#isCartUpdateCurrent(generation, cartId)) {
        this.#setError({ phase: "interaction", code: "unexpected_error" });
      }
    } finally {
      if (this.#cartUpdateRunningGeneration === generation) {
        this.#cartUpdateRunningGeneration = undefined;
      }
      if (this.#cartUpdatePending) this.#scheduleCartUpdate();
    }
  }

  #isCartUpdateCurrent(generation: number, cartId: CartIdentifier): boolean {
    return (
      this.#connected &&
      this.#cartUpdateGeneration === generation &&
      this.cartId === cartId &&
      this.#startedKey !== undefined &&
      this.#availability.state === "ready"
    );
  }

  #invalidateCartUpdates(): void {
    this.#cartUpdateGeneration += 1;
    this.#cartUpdatePending = false;
  }

  #scheduleReconcile(): void {
    if (!this.#connected || this.#reconcileScheduled) return;
    this.#reconcileScheduled = true;

    queueMicrotask(() => {
      this.#reconcileScheduled = false;
      void this.#reconcile();
    });
  }

  async #reconcile(): Promise<void> {
    if (!this.#connected) return;

    const configuration = this.#configurationState();
    if (configuration.status === "incomplete") {
      this.#deactivate();
      this.#clearError();
      this.#setAvailability({ state: "loading" }, false);
      return;
    }
    if (configuration.status === "invalid") {
      this.#deactivate();
      const availability: WalletAvailability = { state: "unavailable", reason: "setup_error" };
      this.#setAvailability(availability, false);
      const changed = this.#setError({
        phase: "initialization",
        code: "purchase_configuration_invalid",
      });
      if (changed) this.#dispatchRender(availability);
      return;
    }
    if (configuration.key === this.#startedKey) return;

    this.#stopAdapter();
    this.#startedKey = configuration.key;
    this.#clearError();
    this.#setAvailability({ state: "loading" }, false);

    if (!this.#adapter) return;

    const generation = this.#generation;
    const controller = new AbortController();
    this.#controller = controller;

    try {
      const outcome = await this.#adapter.start({
        purchase: configuration.purchase,
        walletCount: this.walletCount,
        layout: this.layout,
        getCart: configuration.getCart,
        mount: this.#root,
        signal: controller.signal,
      });
      if (!this.#isCurrent(generation, controller)) return;

      if (outcome.status === "ready" && outcome.wallets.length > 0) {
        const availability: WalletAvailability = {
          state: "ready",
          wallets: Object.freeze([...outcome.wallets]),
          failed: Object.freeze([...(outcome.failed ?? [])]),
        };
        this.#setAvailability(availability, false);
        this.#call(() => this.#callbacks?.ready?.());
        this.#dispatchRender(availability);
        if (this.#cartUpdatePending) this.#scheduleCartUpdate();
        return;
      }

      this.#root.replaceChildren();
      this.#setAvailability({
        state: "unavailable",
        reason: outcome.status === "ready" ? "no_wallet" : outcome.reason,
      });
    } catch {
      if (!this.#isCurrent(generation, controller)) return;
      this.#root.replaceChildren();
      const availability: WalletAvailability = { state: "unavailable", reason: "setup_error" };
      this.#setAvailability(availability, false);
      this.#setError({ phase: "initialization", code: "unexpected_error" });
      this.#dispatchRender(availability);
    }
  }

  #configurationState(): ConfigurationState {
    const { storeDomain, country, locale, currency, cartId, variantId, sellingPlanId, layout } =
      this;

    if (!storeDomain || !country || !locale || !currency) return { status: "incomplete" };
    if (layout && layout !== "horizontal" && layout !== "vertical") return { status: "invalid" };

    const purchase = Object.freeze({
      storeDomain,
      country,
      locale,
      currency,
      cartId,
      variantId: cartId ? undefined : variantId,
      sellingPlanId: cartId ? undefined : sellingPlanId,
    });

    if (cartId) return { status: "ready", key: this.#configurationKey(purchase), purchase };
    if (!variantId && !sellingPlanId) return { status: "incomplete" };
    if (!variantId || !this.#getCart) return { status: "invalid" };

    return {
      status: "ready",
      key: this.#configurationKey(purchase),
      purchase,
      getCart: this.#getCart,
    };
  }

  #configurationKey(purchase: Readonly<WalletPurchaseSnapshot>): string {
    const usesGetCart = !purchase.cartId && Boolean(this.#getCart);
    return JSON.stringify([purchase, this.walletCount, this.layout, usesGetCart]);
  }

  #isCurrent(generation: number, controller: AbortController): boolean {
    return this.#connected && this.#generation === generation && !controller.signal.aborted;
  }

  #deactivate(): void {
    this.#stopAdapter();
    this.#startedKey = undefined;
  }

  #stopAdapter(): void {
    this.#invalidateCartUpdates();
    const active = this.#startedKey !== undefined || this.#controller !== undefined;

    if (active) {
      this.#generation += 1;
      this.#controller?.abort();
      this.#controller = undefined;
      this.#adapter?.stop?.();
    }

    this.#root.replaceChildren();
  }

  #setAvailability(availability: WalletAvailability, notify = true): void {
    this.#availability = Object.freeze(availability);
    this.#root.setAttribute("data-state", availability.state);
    this.#root.setAttribute("aria-busy", String(availability.state === "loading"));
    if (notify) this.#dispatchRender(this.#availability);
  }

  #dispatchRender(availability: WalletAvailability): void {
    this.dispatchEvent(
      new CustomEvent<WalletRenderEventDetail>(EXPRESS_CHECKOUT_EVENTS.render, {
        bubbles: true,
        composed: true,
        detail: { availability },
      }),
    );
  }

  #setError(error: WalletDisplayError): boolean {
    if (
      this.#error?.phase === error.phase &&
      this.#error.code === error.code &&
      this.#error.message === error.message
    ) {
      return false;
    }

    this.#error = Object.freeze(error);
    this.#call(() => this.#callbacks?.error?.(this.#error));
    this.#dispatchError(this.#error);
    return true;
  }

  #clearError(notify = true): void {
    if (!this.#error) return;
    this.#error = null;
    if (!notify) return;
    this.#call(() => this.#callbacks?.error?.(null));
    this.#dispatchError(null);
  }

  #dispatchError(error: WalletDisplayError | null): void {
    this.dispatchEvent(
      new CustomEvent<WalletErrorEventDetail>(EXPRESS_CHECKOUT_EVENTS.error, {
        bubbles: true,
        composed: true,
        detail: { error },
      }),
    );
  }

  #call(callback: () => void): void {
    try {
      callback();
    } catch {
      // Merchant callbacks are observational and cannot break Checkout Kit.
    }
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

  #setAttribute(name: string, value: string | null | undefined): void {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, value);
  }
}

export type {
  CartIdentifier,
  GetCart,
  GetCartRequest,
  KnownWalletErrorCode,
  WalletAvailability,
  WalletCallbacks,
  WalletConfiguration,
  WalletDisplayError,
  WalletErrorEventDetail,
  WalletLayout,
  WalletPurchaseSnapshot,
  WalletRenderEventDetail,
  WalletsAttributes,
  WalletsProperties,
} from "./wallets.types";
