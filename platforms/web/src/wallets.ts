/**
 * `<shopify-accelerated-checkout-buttons>` — Checkout Kit composition root
 * for Portable Wallets on headless / Hydrogen storefronts.
 *
 * @attribute store-domain - The storefront domain.
 * @attribute access-token - Public Storefront API token used by authorized operations.
 * @attribute country - Two-letter country code.
 * @attribute language - BCP-47 language tag.
 * @attribute variant-id - Product variant GID for a buy-now flow.
 * @attribute selling-plan-id - Optional selling plan GID (buy-now only).
 * @attribute wallet-count - Maximum number of wallets to render (0 = all).
 * @attribute layout - Button layout direction (`horizontal` or `vertical`).
 * @attribute log-level - Console logging verbosity.
 */

import { Logger, coerceLogLevel } from "./logger";
import { storefrontCartCreate, type CartCreateFetcher } from "./wallets-cart-create";
import { fetchWalletConfigs } from "./wallets-bootstrap";
import { DefaultWalletRuntime } from "./wallets-runtime";
import type {
  ChildRenderOutcome,
  CreateCartFunction,
  CreateCartRequest,
  ExpressCheckoutsErrorEventDetail,
  ExpressCheckoutsRenderEventDetail,
  LogLevel,
  PurchaseFlow,
  PurchaseSnapshot,
  WalletAvailability,
  WalletBootstrap,
  WalletChild,
  WalletConfig,
  WalletConfigureInput,
  WalletDisplayError,
  WalletPurchaseContext,
  WalletRuntime,
  WalletsAttributes,
  WalletsProperties,
} from "./wallets.types";

export type { LogLevel };

/* ------------------------------------------------------------------ */
/*  Public event names (agreed contract)                               */
/* ------------------------------------------------------------------ */

export const EXPRESS_CHECKOUT_EVENTS = {
  render: "shopify:express-checkouts:render",
  error: "shopify:express-checkouts:error",
} as const;

/* ------------------------------------------------------------------ */
/*  Internal input shape (stable bootstrap scalars only)               */
/* ------------------------------------------------------------------ */

type MutableInput = {
  -readonly [K in keyof WalletConfigureInput]: WalletConfigureInput[K];
};

/* ------------------------------------------------------------------ */
/*  Element                                                            */
/* ------------------------------------------------------------------ */

export class ShopifyAcceleratedCheckoutButtons
  extends HTMLElement
  implements WalletsAttributes, WalletsProperties
{
  static observedAttributes = [
    "store-domain",
    "access-token",
    "country",
    "language",
    "variant-id",
    "selling-plan-id",
    "wallet-count",
    "layout",
    "log-level",
  ] as const;

  /* -- internal state --------------------------------------------------- */

  #input: MutableInput = {};
  #reconcileScheduled = false;
  #disconnected = false;
  #child: WalletChild | null = null;
  #shadowContainer: HTMLDivElement;
  #renderedKey: string | null = null;
  #generation = 0;
  #cartAbort: AbortController | null = null;
  #availability: WalletAvailability = { state: "loading" };
  #error: WalletDisplayError | null = null;
  #runtime: WalletRuntime;
  #logger = new Logger("<shopify-accelerated-checkout-buttons>", () => this.logLevel);

  /** Injectable bootstrap fetcher (tests). */
  bootstrapFetcher?: typeof fetchWalletConfigs;
  /** Injectable Storefront cartCreate fetcher (tests). */
  cartCreateFetcher?: CartCreateFetcher;

  constructor(runtime?: WalletRuntime) {
    super();
    this.#runtime = runtime ?? new DefaultWalletRuntime();
    const shadow = this.attachShadow({ mode: "open" });
    // Minimal mount container for PW children. Kyle's skeleton work
    // layers additional markup/styles on the shadow root; this
    // container stays minimal to avoid merge conflicts.
    this.#shadowContainer = document.createElement("div");
    this.#shadowContainer.setAttribute("data-state", "idle");
    shadow.appendChild(this.#shadowContainer);
  }

  /* ================================================================ */
  /*  Attribute-reflected properties                                   */
  /* ================================================================ */

  get storeDomain(): string {
    return this.getAttribute("store-domain") ?? "";
  }
  set storeDomain(value: string | undefined) {
    this.#setAttr("store-domain", value);
  }

  get country(): string {
    return this.getAttribute("country") ?? "";
  }
  set country(value: string | undefined) {
    this.#setAttr("country", value);
  }

  get language(): string {
    return this.getAttribute("language") ?? "";
  }
  set language(value: string | undefined) {
    this.#setAttr("language", value);
  }

  // (1) variantId and sellingPlanId are reactive attributes/properties
  // only — NOT in WalletConfigureInput or configure().
  get variantId(): string {
    return this.getAttribute("variant-id") ?? "";
  }
  set variantId(value: string | undefined) {
    this.#setAttr("variant-id", value);
  }

  get sellingPlanId(): string {
    return this.getAttribute("selling-plan-id") ?? "";
  }
  set sellingPlanId(value: string | undefined) {
    this.#setAttr("selling-plan-id", value);
  }

  get walletCount(): number {
    return Number(this.getAttribute("wallet-count")) || 0;
  }
  set walletCount(value: number | undefined) {
    if (!value) this.removeAttribute("wallet-count");
    else this.setAttribute("wallet-count", String(value));
  }

  get layout(): string {
    return this.getAttribute("layout") ?? "horizontal";
  }
  set layout(value: string | undefined) {
    this.#setAttr("layout", value);
  }

  get logLevel(): LogLevel {
    return coerceLogLevel(this.getAttribute("log-level"));
  }
  set logLevel(value: LogLevel | undefined) {
    this.#setAttr("log-level", value);
  }

  /* ================================================================ */
  /*  Property-only inputs (not in configure, not reflected)           */
  /* ================================================================ */

  get accessToken(): string | undefined {
    return this.getAttribute("access-token") ?? undefined;
  }
  set accessToken(value: string | undefined) {
    this.#setAttr("access-token", value);
  }

  /**
   * Merchant cart-creation override for the buy-now / product flow.
   * When set, Kit invokes this instead of the runtime's default
   * Storefront API cart path.
   *
   * (3) NOT snapshotted during reconcile. Each wallet activation reads
   * `this.#createCart` at invocation time so a later property
   * replacement applies to later attempts without rebuilding.
   */
  #createCart: CreateCartFunction | undefined;
  get createCart(): CreateCartFunction | undefined {
    return this.#createCart;
  }
  set createCart(value: CreateCartFunction | undefined) {
    this.#createCart = value;
  }

  /* ================================================================ */
  /*  Read-only state                                                  */
  /* ================================================================ */

  get availability(): WalletAvailability {
    return this.#availability;
  }

  get error(): WalletDisplayError | null {
    return this.#error;
  }

  /* ================================================================ */
  /*  Public methods                                                   */
  /* ================================================================ */

  /**
   * Apply a patch of stable bootstrap scalars. Coalesces into one reconcile.
   * (1)(2) No variantId, sellingPlanId, or functions — those are attributes
   * or dedicated properties.
   */
  configure(patch: WalletConfigureInput): void {
    for (const key of Object.keys(patch) as (keyof WalletConfigureInput)[]) {
      (this.#input as Record<string, unknown>)[key] = patch[key];
    }
    this.#syncAttributesFromInput();
    this.#scheduleReconcile();
  }

  /** Signal that the underlying cart changed (same id). */
  cartUpdated(): void {
    this.#child?.checkoutChanged({ type: "cart" });
  }

  /* ================================================================ */
  /*  Lifecycle                                                        */
  /* ================================================================ */

  connectedCallback(): void {
    this.#disconnected = false;
    this.#scheduleReconcile();
    this.#logger.debug("connected");
  }

  disconnectedCallback(): void {
    this.#disconnected = true;
    this.#teardownChild();
    this.#renderedKey = null;
    this.#availability = { state: "loading" };
    this.#error = null;
    this.#shadowContainer.setAttribute("data-state", "idle");
    this.#logger.debug("disconnected");
  }

  attributeChangedCallback(
    name: (typeof ShopifyAcceleratedCheckoutButtons.observedAttributes)[number],
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;
    this.#logger.debug(`attribute changed: ${name}`, { oldValue, newValue });
    // (1) variant-id and selling-plan-id trigger reconcile through
    // attribute observation, not through configure().
    const inputKey = ATTR_TO_INPUT.get(name);
    if (inputKey) {
      (this.#input as Record<string, unknown>)[inputKey] =
        inputKey === "walletCount" ? Number(newValue) || 0 : (newValue ?? undefined);
    }
    this.#scheduleReconcile();
  }

  /* ================================================================ */
  /*  Internals                                                        */
  /* ================================================================ */

  #setAttr(name: string, value: string | boolean | undefined): void {
    if (value === true) this.setAttribute(name, "");
    else if (value != null && value !== false) this.setAttribute(name, value);
    else this.removeAttribute(name);
  }

  // (1) configure() only syncs its own scalars — no variantId/sellingPlanId.
  #syncAttributesFromInput(): void {
    const i = this.#input;
    if (i.storeDomain !== undefined) this.#setAttr("store-domain", i.storeDomain || undefined);
    if (i.accessToken !== undefined) this.#setAttr("access-token", i.accessToken || undefined);
    if (i.country !== undefined) this.#setAttr("country", i.country || undefined);
    if (i.language !== undefined) this.#setAttr("language", i.language || undefined);
    if (i.walletCount !== undefined) this.walletCount = i.walletCount;
    if (i.layout !== undefined) this.#setAttr("layout", i.layout || undefined);
  }

  /* ---- reconciliation ------------------------------------------------ */

  #scheduleReconcile(): void {
    if (this.#disconnected || this.#reconcileScheduled) return;
    this.#reconcileScheduled = true;
    Promise.resolve()
      .then(() => {
        this.#reconcileScheduled = false;
        return this.#reconcile();
      })
      .catch((err) => this.#logger.error("reconcile failed", err));
  }

  get #purchaseFlow(): PurchaseFlow {
    return this.variantId ? "product" : "cart";
  }

  #renderMode(flow: PurchaseFlow): "single" | "multi" {
    const count = this.walletCount;
    if (count === 1) return "single";
    if (!count) return flow === "product" ? "single" : "multi";
    return "multi";
  }

  #rebuildKey(flow: PurchaseFlow, mode: "single" | "multi"): string {
    return JSON.stringify([
      flow,
      mode,
      this.storeDomain,
      this.country,
      this.language,
      this.#input.currency,
      this.variantId,
      this.sellingPlanId,
      this.walletCount,
      this.layout,
      this.accessToken,
    ]);
  }

  async #reconcile(): Promise<void> {
    if (this.#disconnected || !this.isConnected) return;

    /* ---- Gate 1: stable safe initialization inputs ---- */

    const storeDomain = this.storeDomain;
    const country = this.country;
    const language = this.language || "en";
    const accessToken = this.accessToken ?? "";
    const variantId = this.variantId;
    const sellingPlanId = this.sellingPlanId;

    // Required: storeDomain, country, and accessToken.
    if (!storeDomain || !country || !accessToken) {
      this.#teardownChild();
      this.#clearError();
      this.#setAvailability({ state: "loading" });
      this.#renderedKey = null;
      return;
    }

    /* ---- Gate 2: valid purchase source ---- */

    const flow = this.#purchaseFlow;
    // Product flow requires a current variant-id.
    if (flow === "product" && !variantId) {
      this.#teardownChild();
      this.#clearError();
      this.#setAvailability({ state: "loading" });
      this.#renderedKey = null;
      return;
    }
    // Cart flow uses private activation-time /api/cart resolution (no ID needed here).

    const mode = this.#renderMode(flow);
    const key = this.#rebuildKey(flow, mode);
    if (key === this.#renderedKey && this.#child) return;

    const generation = ++this.#generation;
    this.#teardownChild();
    this.#clearError();
    this.#setAvailability({ state: "loading" });

    try {
      /* ---- Gate 3: wallet bootstrap succeeds with candidates ---- */

      const doFetch = this.bootstrapFetcher ?? fetchWalletConfigs;
      const bootstrap = await doFetch({
        storeDomain,
        accessToken,
        country,
        language,
        flow,
        variantId: variantId || undefined,
        sellingPlanId: sellingPlanId || undefined,
        currency: this.#input.currency,
      });

      if (generation !== this.#generation || this.#disconnected) return;

      const walletNames = this.#walletNames(mode, bootstrap);
      if (walletNames.length === 0) {
        this.#setAvailability({ state: "unavailable", reason: "no_wallet", failed: [] });
        this.#renderedKey = key;
        return;
      }

      /* ---- Gate 4: all gates passed — NOW load PW runtime ---- */

      await this.#runtime.ensureLoaded();
      if (generation !== this.#generation || this.#disconnected) return;

      /* ---- Create and wire child ---- */

      const currentCartId = flow === "cart" ? await this.#runtime.resolveCurrentCart() : null;
      if (generation !== this.#generation || this.#disconnected) return;
      if (flow === "cart" && !currentCartId) {
        throw new Error("No current cart is available");
      }

      const checkoutClient = this.#runtime.createCheckoutClient({
        storeDomain,
        accessToken,
        country,
        language,
        onTerminalError: (code, message) =>
          this.#emitError({ phase: "interaction", code, message }),
      });

      const cartAbort = new AbortController();
      this.#cartAbort = cartAbort;

      // Build the activation-time cart supplier. This is passed as
      // PW's `createCart` callback — invoked at wallet activation,
      // not during reconcile.
      const activationCreateCart = this.#buildActivationCreateCart(
        flow,
        storeDomain,
        accessToken,
        variantId,
        sellingPlanId,
        cartAbort.signal,
      );

      const datasource = this.#runtime.createDatasource({
        checkoutClient,
        createCart: activationCreateCart,
      });

      const surfaceAdapter = this.#runtime.createSurfaceAdapter(() => currentCartId);
      let purchaseContext: WalletPurchaseContext;
      if (flow === "cart") {
        if (!currentCartId) throw new Error("No current cart is available");
        purchaseContext = await this.#runtime.resolveCartContext({
          checkoutClient,
          cartId: currentCartId,
        });
      } else {
        purchaseContext = this.#productContext(bootstrap);
      }
      if (generation !== this.#generation || this.#disconnected) return;

      const child = this.#buildChild(mode, bootstrap, accessToken, country);

      child.updateContext(purchaseContext);
      child.setCheckoutClient(checkoutClient);
      child.setDatasource(datasource);
      child.setSurfaceAdapter(surfaceAdapter);
      child.setTopLevelErrorHandler((code, message) =>
        this.#emitError({ phase: "interaction", code, message }),
      );
      child.setRenderOutcomeHandler((outcome) => {
        if (generation !== this.#generation || this.#disconnected) return;
        this.#onChildRenderOutcome(outcome);
      });

      this.#child = child;
      this.#shadowContainer.replaceChildren(child);
      this.#renderedKey = key;

      this.#logger.debug("child mounted, awaiting render outcome", { flow, mode });
    } catch (err) {
      if (generation !== this.#generation || this.#disconnected) return;
      this.#logger.error("reconcile error", err);
      this.#emitError({
        phase: "initialization",
        code: "unexpected_error",
        message: err instanceof Error ? err.message : undefined,
      });
      this.#setAvailability({ state: "unavailable", reason: "setup_error", failed: [] });
      this.#renderedKey = key;
    }
  }

  /* ---- activation-time cart supplier --------------------------------- */

  /**
   * Build the per-wallet cart supplier PW's datasource invokes at
   * activation time. Passed as PW's `createCart` callback.
   */
  #buildActivationCreateCart(
    flow: PurchaseFlow,
    storeDomain: string,
    accessToken: string,
    variantId: string,
    sellingPlanId: string,
    signal: AbortSignal,
  ): (wallet: string) => Promise<string> {
    if (flow === "cart") {
      // Resolve fresh from /api/cart at each activation.
      return async () => {
        const cartId = await this.#runtime.resolveCurrentCart();
        if (!cartId) throw new Error("No cart available from /api/cart");
        return cartId;
      };
    }

    // Product flow: merchant override or Kit-owned Storefront cartCreate.
    // (3) Read this.#createCart at invocation time so a later property
    // replacement applies without rebuild.
    return async (wallet: string) => {
      const merchantFn = this.#createCart;
      if (merchantFn) {
        return this.#invokeMerchantCreateCart(merchantFn, wallet, signal);
      }
      // Kit-owned default: direct Storefront API cartCreate.
      // Fail closed when required config is absent.
      return storefrontCartCreate(
        {
          storeDomain,
          accessToken,
          variantId,
          sellingPlanId: sellingPlanId || undefined,
          signal,
        },
        this.cartCreateFetcher,
      );
    };
  }

  /* ---- child render outcome ------------------------------------------ */

  #onChildRenderOutcome(outcome: ChildRenderOutcome): void {
    if (outcome.rendered.length > 0) {
      this.#setAvailability({
        state: "ready",
        rendered: outcome.rendered,
        failed: outcome.failed,
      });
    } else {
      this.#setAvailability({
        state: "unavailable",
        reason: outcome.failed.length > 0 ? "setup_error" : "no_wallet",
        failed: outcome.failed,
      });
    }
  }

  /* ---- child building ------------------------------------------------ */

  // (6) No cartId parameter. (7) No cart-id attribute on child.
  #buildChild(
    mode: "single" | "multi",
    bootstrap: WalletBootstrap,
    accessToken: string,
    country: string,
  ): WalletChild {
    const currency = this.#input.currency ?? bootstrap.presentmentCurrency ?? "USD";
    const child = this.#runtime.createChild(mode);

    child.setAttribute("access-token", accessToken);
    child.setAttribute("buyer-country", country);
    child.setAttribute("buyer-currency", currency);
    child.setAttribute("shop-id", bootstrap.shopId);
    child.setAttribute("variant-params", JSON.stringify(bootstrap.variantParams));
    child.setAttribute("enabled-flags", JSON.stringify(bootstrap.enabledFlags));

    if (this.layout !== "horizontal") child.setAttribute("layout", this.layout);

    if (mode === "multi") {
      child.setAttribute(
        "wallet-configs",
        JSON.stringify(this.#capWallets(bootstrap.walletConfigs)),
      );
      // (6) NO cart-id attribute. The datasource supplies identity.
    } else {
      if (bootstrap.recommendedWallet)
        child.setAttribute("recommended", JSON.stringify(bootstrap.recommendedWallet));
      if (bootstrap.fallbackWallet)
        child.setAttribute("fallback", JSON.stringify(bootstrap.fallbackWallet));
    }

    return child;
  }

  #productContext(bootstrap: WalletBootstrap): WalletPurchaseContext {
    if (bootstrap.purchaseContext) return bootstrap.purchaseContext;

    const variant = bootstrap.variantParams.find((candidate) => candidate.id === this.variantId);
    if (!variant) {
      throw new Error("Wallet bootstrap did not resolve the selected variant");
    }

    return {
      requiresShipping: variant.requiresShipping,
      hasSellingPlan: Boolean(this.sellingPlanId),
    };
  }

  #capWallets(walletConfigs: WalletConfig[]): WalletConfig[] {
    const count = this.walletCount;
    if (!count) return walletConfigs;
    return walletConfigs.slice(0, count);
  }

  #walletNames(mode: "single" | "multi", bootstrap: WalletBootstrap): string[] {
    if (mode === "multi") return this.#capWallets(bootstrap.walletConfigs).map((c) => c.name);
    return [bootstrap.recommendedWallet, bootstrap.fallbackWallet]
      .filter((c): c is WalletConfig => c != null)
      .map((c) => c.name);
  }

  /* ---- merchant createCart bridge ------------------------------------- */

  async #invokeMerchantCreateCart(
    fn: CreateCartFunction,
    wallet: string,
    signal: AbortSignal,
  ): Promise<string> {
    const request: CreateCartRequest = {
      purchase: this.#purchaseSnapshot(),
      wallet,
      signal,
    };
    return fn(request);
  }

  #purchaseSnapshot(): PurchaseSnapshot {
    return Object.freeze({
      storeDomain: this.storeDomain,
      country: this.country,
      language: this.language || "en",
      currency: this.#input.currency,
      variantId: this.variantId || undefined,
      sellingPlanId: this.sellingPlanId || undefined,
    });
  }

  /* ---- teardown ------------------------------------------------------ */

  #teardownChild(): void {
    this.#cartAbort?.abort();
    this.#cartAbort = null;
    this.#shadowContainer.replaceChildren();
    this.#child = null;
  }

  /* ---- availability / error / events --------------------------------- */

  #setAvailability(availability: WalletAvailability): void {
    this.#availability = availability;
    // Update data-state so Kyle's skeleton CSS can react.
    // Only clear/hide the skeleton after PW reports an actual render
    // outcome (ready or unavailable), not merely after import or mount.
    this.#shadowContainer.setAttribute("data-state", availability.state);
    if (availability.state !== "loading") {
      this.dispatchEvent(
        new CustomEvent<ExpressCheckoutsRenderEventDetail>(EXPRESS_CHECKOUT_EVENTS.render, {
          bubbles: true,
          composed: true,
          detail: { availability },
        }),
      );
    }
  }

  #emitError(error: WalletDisplayError): void {
    this.#error = error;
    this.dispatchEvent(
      new CustomEvent<ExpressCheckoutsErrorEventDetail>(EXPRESS_CHECKOUT_EVENTS.error, {
        bubbles: true,
        composed: true,
        detail: { error },
      }),
    );
  }

  #clearError(): void {
    if (this.#error === null) return;
    this.#error = null;
  }
}

// (1) Only stable scalars from configure() map here.
// variant-id and selling-plan-id reconcile through attributeChangedCallback
// but are NOT in WalletConfigureInput.
const ATTR_TO_INPUT = new Map<string, keyof WalletConfigureInput>([
  ["store-domain", "storeDomain"],
  ["access-token", "accessToken"],
  ["country", "country"],
  ["language", "language"],
  ["wallet-count", "walletCount"],
  ["layout", "layout"],
]);
