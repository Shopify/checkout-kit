import type { ChildRenderOutcome, WalletChild, WalletRuntime } from "./wallets.types";
import {
  getPortableWalletsRuntime,
  type PortableWalletsFactory,
  type PortableWalletsTerminalError,
  type LoaderFn,
} from "./wallets-pw-loader";

/**
 * Default runtime that lazy-loads the PW ESM bridge and delegates to
 * `createPortableWalletsRuntime()`. The bridge URL is an internal
 * prototype constant — never merchant API.
 *
 * Falls back to stub behaviour when the bridge hasn't loaded yet (the
 * element's reconcile awaits `ensureLoaded()` before creating children).
 */
export class DefaultWalletRuntime implements WalletRuntime {
  #factory: PortableWalletsFactory | null = null;
  #loader: LoaderFn | undefined;

  constructor(loader?: LoaderFn) {
    this.#loader = loader;
  }

  /** Ensure the PW bridge is loaded. Called once per reconcile. */
  async ensureLoaded(): Promise<void> {
    if (this.#factory) return;
    this.#factory = await getPortableWalletsRuntime(this.#loader);
  }

  #f(): PortableWalletsFactory {
    if (!this.#factory)
      throw new Error("[checkout-kit] PW runtime not loaded. Call ensureLoaded() first.");
    return this.#factory;
  }

  createChild(mode: "single" | "multi"): WalletChild {
    return this.#f().createChild(mode) as unknown as WalletChild;
  }

  createCheckoutClient(options: {
    storeDomain: string;
    accessToken: string;
    country: string;
    language: string;
    onTerminalError: (code: string, message?: string) => void;
  }): unknown {
    return this.#f().createCheckoutClient({
      storeDomain: options.storeDomain,
      accessToken: options.accessToken,
      country: options.country,
      locale: options.language,
      onTerminalError: (error: PortableWalletsTerminalError) =>
        options.onTerminalError(error.errorCode, error.localizedMessage),
    });
  }

  createDatasource(options: {
    checkoutClient: unknown;
    resolveCartId?: () => string | null;
    createCart?: (wallet: string) => Promise<string>;
  }): unknown {
    return this.#f().createDatasource(options);
  }

  createSurfaceAdapter(cartTokenSource: () => string | null): unknown {
    return this.#f().createSurfaceAdapter(cartTokenSource);
  }

  async resolveCurrentCart(): Promise<string | null> {
    try {
      const response = await fetch("/api/cart", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { cart?: { id?: string } };
      return data.cart?.id ?? null;
    } catch {
      return null;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Test fake                                                          */
/* ------------------------------------------------------------------ */

export class FakeWalletRuntime implements WalletRuntime {
  children: FakeWalletChild[] = [];
  checkoutClients: unknown[] = [];
  datasources: unknown[] = [];
  surfaceAdapters: unknown[] = [];
  currentCartResult: string | null = "gid://shopify/Cart/fake-current-cart";
  /** Tracks how many times ensureLoaded was called (PW import gate). */
  ensureLoadedCalls = 0;

  async ensureLoaded(): Promise<void> {
    this.ensureLoadedCalls++;
  }

  createChild(mode: "single" | "multi"): WalletChild {
    const child = new FakeWalletChild(mode);
    this.children.push(child);
    return child;
  }

  createCheckoutClient(options: {
    storeDomain: string;
    accessToken: string;
    country: string;
    language: string;
    onTerminalError: (code: string, message?: string) => void;
  }): unknown {
    const client = { type: "fake-checkout-client" as const, ...options };
    this.checkoutClients.push(client);
    return client;
  }

  createDatasource(options: {
    checkoutClient: unknown;
    resolveCartId?: () => string | null;
    createCart?: (wallet: string) => Promise<string>;
  }): unknown {
    const ds = { type: "fake-datasource" as const, ...options };
    this.datasources.push(ds);
    return ds;
  }

  createSurfaceAdapter(cartTokenSource: () => string | null): unknown {
    const adapter = { type: "fake-surface-adapter" as const, cartTokenSource };
    this.surfaceAdapters.push(adapter);
    return adapter;
  }

  async resolveCurrentCart(): Promise<string | null> {
    return this.currentCartResult;
  }

  get lastChild(): FakeWalletChild | undefined {
    return this.children.at(-1);
  }
}

export class FakeWalletChild extends HTMLElement {
  mode: "single" | "multi";
  checkoutClient: unknown = null;
  datasource: unknown = null;
  surfaceAdapter: unknown = null;
  errorHandler: ((code: string, message: string) => void) | null = null;
  renderOutcomeHandler: ((outcome: ChildRenderOutcome) => void) | null = null;
  changes: Array<{ type: string }> = [];

  constructor(mode: "single" | "multi" = "multi") {
    super();
    this.mode = mode;
  }

  setCheckoutClient(client: unknown): void {
    this.checkoutClient = client;
  }
  setDatasource(datasource: unknown): void {
    this.datasource = datasource;
  }
  setSurfaceAdapter(adapter: unknown): void {
    this.surfaceAdapter = adapter;
  }
  setTopLevelErrorHandler(handler: (code: string, message: string) => void): void {
    this.errorHandler = handler;
  }
  setRenderOutcomeHandler(handler: (outcome: ChildRenderOutcome) => void): void {
    this.renderOutcomeHandler = handler;
  }
  checkoutChanged(change: { type: string }): void {
    this.changes.push(change);
  }

  simulateRenderOutcome(outcome: ChildRenderOutcome): void {
    this.renderOutcomeHandler?.(outcome);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("fake-wallet-child")) {
  customElements.define("fake-wallet-child", FakeWalletChild);
}
