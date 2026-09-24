import type {
  WalletBootstrapClient,
  WalletBootstrapConfig,
  WalletBootstrapResult,
} from "./wallets-bootstrap-client";
import type {
  PortableWalletsChildConfiguration,
  PortableWalletsPurchaseContext,
  PortableWalletsRuntime,
  PortableWalletsRuntimeLoader,
  PortableWalletsTerminalError,
} from "./wallets-runtime-loader";
import type { WalletAdapter, WalletAdapterOutcome, WalletAdapterRequest } from "./wallets-adapter";
import type { WalletPurchaseSnapshot } from "./wallets.types";

export interface PortableWalletsCheckoutClientRequest {
  readonly runtime: PortableWalletsRuntime;
  readonly purchase: Readonly<WalletPurchaseSnapshot>;
  readonly signal: AbortSignal;
  readonly onTerminalError: (error: PortableWalletsTerminalError) => void;
}

export type PortableWalletsCheckoutClientFactory = (
  request: PortableWalletsCheckoutClientRequest,
) => unknown | Promise<unknown>;

export interface PortableWalletsAdapterTerminalError {
  readonly wallet?: string;
  readonly errorCode: string;
  readonly localizedMessage?: string;
}

export interface PortableWalletsAdapterServices {
  readonly bootstrapClient: WalletBootstrapClient;
  readonly runtimeLoader: PortableWalletsRuntimeLoader;
  readonly createCheckoutClient: PortableWalletsCheckoutClientFactory;
  readonly onTerminalError?: (error: PortableWalletsAdapterTerminalError) => void;
}

interface ActiveAdapter {
  readonly controller: AbortController;
  readonly sourceSignal: AbortSignal;
  readonly onSourceAbort: () => void;
  child?: HTMLElement;
  clearOutcomeWait?: () => void;
}

export function createPortableWalletsAdapter(
  services: PortableWalletsAdapterServices,
): WalletAdapter {
  return new PortableWalletsAdapter(services);
}

class PortableWalletsAdapter implements WalletAdapter {
  readonly #services: PortableWalletsAdapterServices;
  #active: ActiveAdapter | undefined;

  constructor(services: PortableWalletsAdapterServices) {
    this.#services = services;
  }

  async start(request: WalletAdapterRequest): Promise<WalletAdapterOutcome> {
    this.stop();
    if (request.signal.aborted) throw abortError();

    const controller = new AbortController();
    const active: ActiveAdapter = {
      controller,
      sourceSignal: request.signal,
      onSourceAbort: () => this.#stopIfCurrent(active),
    };
    this.#active = active;
    request.signal.addEventListener("abort", active.onSourceAbort, { once: true });
    if (request.signal.aborted) this.#stopIfCurrent(active);

    try {
      const bootstrap = await this.#services.bootstrapClient.load({
        purchase: request.purchase,
        signal: controller.signal,
      });
      this.#assertCurrent(active);

      const presentation = request.walletCount === 1 ? "single" : "multi";
      if (this.#candidateNames(bootstrap, presentation, request.walletCount).length === 0) {
        this.#finishWithoutChild(active);
        return { status: "unavailable", reason: "no_wallet" };
      }

      const runtime = await this.#services.runtimeLoader.load();
      this.#assertCurrent(active);

      const checkoutClient = await this.#services.createCheckoutClient({
        runtime,
        purchase: request.purchase,
        signal: controller.signal,
        onTerminalError: (error) => this.#reportTerminalError(active, error),
      });
      this.#assertCurrent(active);

      const context = await this.#purchaseContext(
        runtime,
        checkoutClient,
        bootstrap,
        request.purchase,
      );
      this.#assertCurrent(active);

      let currentCartId = request.purchase.cartId ?? null;
      const createCart = this.#createCartResolver(runtime, request, controller.signal, (cartId) => {
        currentCartId = cartId;
      });
      const datasource = runtime.createDatasource({
        checkoutClient,
        ...(request.purchase.cartId
          ? { resolveCartId: () => request.purchase.cartId ?? null }
          : { createCart }),
      });
      const surfaceAdapter = runtime.createSurfaceAdapter(() => currentCartId);
      const child = runtime.createChild(presentation);
      active.child = child;

      child.configure(this.#childConfiguration(bootstrap, request, presentation));
      child.updateContext(context);
      child.setCheckoutClient(checkoutClient);
      child.setDatasource(datasource);
      child.setSurfaceAdapter(surfaceAdapter);
      child.setTopLevelErrorHandler((errorCode, localizedMessage) => {
        this.#reportTerminalError(active, { errorCode, localizedMessage });
      });

      const outcome = this.#waitForOutcome(active, child);
      this.#assertCurrent(active);
      request.mount.replaceChildren(child);
      return await outcome;
    } catch (error) {
      const aborted = controller.signal.aborted || isAbortError(error);
      this.#stopIfCurrent(active);
      if (aborted) throw abortError();
      throwInitializationError();
    }
  }

  stop(): void {
    const active = this.#active;
    if (active) this.#stopIfCurrent(active);
  }

  #stopIfCurrent(active: ActiveAdapter): void {
    if (this.#active !== active) return;
    this.#active = undefined;
    active.sourceSignal.removeEventListener("abort", active.onSourceAbort);
    active.clearOutcomeWait?.();
    active.controller.abort();
    active.child?.remove();
  }

  #finishWithoutChild(active: ActiveAdapter): void {
    if (this.#active !== active) return;
    this.#active = undefined;
    active.sourceSignal.removeEventListener("abort", active.onSourceAbort);
  }

  #assertCurrent(active: ActiveAdapter): void {
    if (this.#active !== active || active.controller.signal.aborted) throw abortError();
  }

  #candidateNames(
    bootstrap: WalletBootstrapResult,
    presentation: "single" | "multi",
    walletCount: number,
  ): ReadonlyArray<string> {
    if (presentation === "single") {
      return [bootstrap.recommendedWallet, bootstrap.fallbackWallet]
        .filter((config): config is WalletBootstrapConfig => config !== null)
        .map((config) => config.name);
    }
    return this.#capWallets(bootstrap.walletConfigs, walletCount).map((config) => config.name);
  }

  #childConfiguration(
    bootstrap: WalletBootstrapResult,
    request: WalletAdapterRequest,
    presentation: "single" | "multi",
  ): PortableWalletsChildConfiguration {
    const common = {
      buyerCountry: requiredString(request.purchase.country),
      buyerCurrency: requiredString(request.purchase.currency ?? bootstrap.presentmentCurrency),
      ...(bootstrap.shopId ? { shopId: bootstrap.shopId } : {}),
      variantParams: bootstrap.variantParams,
      enabledFlags: bootstrap.enabledFlags,
      ...(request.layout ? { layout: request.layout } : {}),
    };

    return presentation === "multi"
      ? {
          ...common,
          presentation,
          walletConfigs: this.#capWallets(bootstrap.walletConfigs, request.walletCount),
        }
      : {
          ...common,
          presentation,
          recommendedWallet: bootstrap.recommendedWallet,
          fallbackWallet: bootstrap.fallbackWallet,
        };
  }

  async #purchaseContext(
    runtime: PortableWalletsRuntime,
    checkoutClient: unknown,
    bootstrap: WalletBootstrapResult,
    purchase: Readonly<WalletPurchaseSnapshot>,
  ): Promise<PortableWalletsPurchaseContext> {
    const context = purchase.cartId
      ? await runtime.resolveCartContext({ checkoutClient, cartId: purchase.cartId })
      : bootstrap.purchaseContext;

    if (
      !context ||
      typeof context.requiresShipping !== "boolean" ||
      typeof context.hasSellingPlan !== "boolean"
    ) {
      throw new Error("Wallet purchase context is unresolved.");
    }
    return context;
  }

  #createCartResolver(
    runtime: PortableWalletsRuntime,
    request: WalletAdapterRequest,
    signal: AbortSignal,
    acceptCart: (cartId: string) => void,
  ): ((wallet: string) => Promise<string>) | undefined {
    if (request.purchase.cartId) return undefined;
    const getCart = request.getCart;
    if (!getCart) throw new Error("Product cart resolver is unavailable.");

    const createProductCart = runtime.createProductCart({
      signal,
      getCart: ({ wallet, signal: activationSignal }) =>
        getCart({
          purchase: request.purchase,
          wallet,
          signal: activationSignal,
        }),
    });

    return async (wallet: string): Promise<string> => {
      const cartId = await createProductCart(wallet);
      if (signal.aborted) throw abortError();
      const resolved = requiredString(cartId);
      acceptCart(resolved);
      return resolved;
    };
  }

  #capWallets(
    walletConfigs: ReadonlyArray<WalletBootstrapConfig>,
    walletCount: number,
  ): ReadonlyArray<WalletBootstrapConfig> {
    return walletCount > 0 ? walletConfigs.slice(0, walletCount) : walletConfigs;
  }

  #waitForOutcome(
    active: ActiveAdapter,
    child: ReturnType<PortableWalletsRuntime["createChild"]>,
  ): Promise<WalletAdapterOutcome> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const onAbort = (): void => {
        if (settled) return;
        settled = true;
        reject(abortError());
      };
      const clear = (): void => {
        active.controller.signal.removeEventListener("abort", onAbort);
        active.clearOutcomeWait = undefined;
      };
      active.clearOutcomeWait = () => {
        if (settled) return;
        settled = true;
        clear();
        reject(abortError());
      };
      active.controller.signal.addEventListener("abort", onAbort, { once: true });

      child.setRenderOutcomeHandler((outcome) => {
        if (settled || this.#active !== active || active.controller.signal.aborted) {
          return;
        }
        settled = true;
        let normalized: WalletAdapterOutcome;
        try {
          const rendered = walletNames(outcome.rendered);
          const failed = walletNames(outcome.failed);
          normalized =
            rendered.length > 0
              ? { status: "ready", wallets: rendered, failed }
              : {
                  status: "unavailable",
                  reason: failed.length > 0 ? "setup_error" : "no_wallet",
                };
        } catch {
          clear();
          reject(new Error("Private wallet render outcome is invalid."));
          return;
        }
        clear();
        resolve(normalized);
      });
    });
  }

  #reportTerminalError(active: ActiveAdapter, error: PortableWalletsAdapterTerminalError): void {
    if (this.#active !== active || active.controller.signal.aborted) return;
    try {
      this.#services.onTerminalError?.(error);
    } catch {
      // Private observers cannot break wallet behavior.
    }
  }
}

function walletNames(value: unknown): ReadonlyArray<string> {
  if (
    !Array.isArray(value) ||
    value.some((name) => typeof name !== "string" || name.length === 0)
  ) {
    throw new Error("Private wallet render outcome is invalid.");
  }
  return [...value];
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Private wallet adapter data is invalid.");
  }
  return value;
}

function throwInitializationError(): never {
  throw new Error("Private wallet adapter initialization failed.");
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
