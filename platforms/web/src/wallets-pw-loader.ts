/**
 * Lazy-loads the Portable Wallets ESM runtime bridge. The URL is an
 * internal prototype constant — never exposed as merchant API.
 *
 * The bridge exports `createPortableWalletsRuntime()` which returns an
 * object satisfying the PW factory shape. Kit wraps it into its own
 * `WalletRuntime` interface.
 */

/** The PW factory shape returned by `createPortableWalletsRuntime()`. */
export interface PortableWalletsTerminalError {
  wallet: string;
  errorCode: string;
  localizedMessage?: string;
}

export interface PortableWalletsFactory {
  createChild(mode: "single" | "multi"): HTMLElement;
  createCheckoutClient(options: {
    accessToken: string;
    country: string;
    locale: string;
    storeDomain: string;
    onTerminalError: (error: PortableWalletsTerminalError) => void;
  }): unknown;
  createDatasource(options: {
    checkoutClient: unknown;
    resolveCartId?: () => string | null;
    createCart?: (wallet: string) => Promise<string>;
  }): unknown;
  createSurfaceAdapter(source: () => string | null): unknown;
  resolveCartContext(options: {
    checkoutClient: unknown;
    cartId: string;
  }): Promise<{ requiresShipping: boolean; hasSellingPlan: boolean }>;
  createProductCart(options: {
    signal: AbortSignal;
    getCart: (wallet: string) => Promise<string>;
  }): unknown;
}

/** The ESM module shape exported by the bridge URL. */
interface PortableWalletsBridgeModule {
  createPortableWalletsRuntime(): PortableWalletsFactory;
}

/**
 * Internal prototype URL. Not merchant API — will be replaced by a
 * proper distribution mechanism (CDN path, package import, etc.).
 */
const PW_BRIDGE_URL = "https://portable-wallets.shop.dev/checkout-kit-runtime.js";

export type LoaderFn = (url: string) => Promise<PortableWalletsBridgeModule>;

const defaultLoader: LoaderFn = (url) =>
  import(/* @vite-ignore */ url) as Promise<PortableWalletsBridgeModule>;

let cached: PortableWalletsFactory | null = null;
let inflight: Promise<PortableWalletsFactory> | null = null;

/**
 * Returns the PW factory, lazy-loading the bridge on first call.
 * Subsequent calls return the cached factory synchronously (via the
 * resolved promise). The loader is injectable for tests.
 */
export async function getPortableWalletsRuntime(
  loader: LoaderFn = defaultLoader,
  url: string = PW_BRIDGE_URL,
): Promise<PortableWalletsFactory> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = loader(url)
    .then((mod) => {
      const factory = mod.createPortableWalletsRuntime();
      cached = factory;
      inflight = null;
      return factory;
    })
    .catch((error: unknown) => {
      // Loading can fail while a local proxy restarts. Do not permanently cache
      // the rejection so a later safe reconcile can retry the private runtime.
      inflight = null;
      throw error;
    });

  return inflight;
}

/** Reset the cache (for tests). */
export function resetPortableWalletsCache(): void {
  cached = null;
  inflight = null;
}
