export const PORTABLE_WALLETS_RUNTIME_API_VERSION = 1 as const;

export type PortableWalletsRuntimeFailureCode = "runtime_import_failed" | "runtime_incompatible";

export class PortableWalletsRuntimeError extends Error {
  readonly code: PortableWalletsRuntimeFailureCode;

  constructor(code: PortableWalletsRuntimeFailureCode, options?: ErrorOptions) {
    super("The private wallet runtime is unavailable.", options);
    this.name = "PortableWalletsRuntimeError";
    this.code = code;
  }
}

export interface PortableWalletsPurchaseContext {
  readonly requiresShipping: boolean;
  readonly hasSellingPlan: boolean;
}

export interface PortableWalletsTerminalError {
  readonly wallet: string;
  readonly errorCode: string;
  readonly localizedMessage?: string;
}

export interface PortableWalletsChild extends HTMLElement {
  setCheckoutClient(client: unknown): void;
  setDatasource(datasource: unknown): void;
  setSurfaceAdapter(adapter: unknown): void;
  setTopLevelErrorHandler(handler: (errorCode: string, localizedMessage?: string) => void): void;
  setRenderOutcomeHandler(
    handler: (outcome: {
      readonly rendered: ReadonlyArray<string>;
      readonly failed: ReadonlyArray<string>;
    }) => void,
  ): void;
  updateContext(context: PortableWalletsPurchaseContext): void;
  checkoutChanged(change: { readonly type: string }): void;
}

export interface PortableWalletsRuntime {
  createChild(presentation: "single" | "multi"): PortableWalletsChild;
  createCheckoutClient(options: {
    readonly accessToken: string;
    readonly country: string;
    readonly locale: string;
    readonly storeDomain: string;
    readonly onTerminalError?: (error: PortableWalletsTerminalError) => void;
  }): unknown;
  createDatasource(options: {
    readonly checkoutClient: unknown;
    readonly resolveCartId?: () => string | null;
    readonly createCart?: (wallet: string) => Promise<string>;
  }): unknown;
  createSurfaceAdapter(cartTokenSource: () => string | null): unknown;
  resolveCartContext(options: {
    readonly checkoutClient: unknown;
    readonly cartId: string;
  }): Promise<PortableWalletsPurchaseContext>;
  createProductCart(options: {
    readonly signal: AbortSignal;
    readonly getCart: (request: {
      readonly wallet: string;
      readonly signal: AbortSignal;
    }) => Promise<string>;
  }): (wallet: string) => Promise<string>;
}

export interface PortableWalletsRuntimeModule {
  readonly checkoutKitRuntimeApiVersion: typeof PORTABLE_WALLETS_RUNTIME_API_VERSION;
  createPortableWalletsRuntime(): PortableWalletsRuntime;
}

export type PortableWalletsRuntimeImporter = (moduleUrl: string) => Promise<unknown>;

export interface PortableWalletsRuntimeLoader {
  load(): Promise<PortableWalletsRuntime>;
}

export interface PortableWalletsRuntimeLoaderOptions {
  readonly moduleUrl: string;
  readonly importer?: PortableWalletsRuntimeImporter;
}

const runtimeMethods = [
  "createChild",
  "createCheckoutClient",
  "createDatasource",
  "createSurfaceAdapter",
  "resolveCartContext",
  "createProductCart",
] as const satisfies ReadonlyArray<keyof PortableWalletsRuntime>;

const defaultImporter: PortableWalletsRuntimeImporter = (moduleUrl) =>
  import(/* @vite-ignore */ moduleUrl) as Promise<unknown>;

export function createPortableWalletsRuntimeLoader(
  options: PortableWalletsRuntimeLoaderOptions,
): PortableWalletsRuntimeLoader {
  const moduleUrl = privateRuntimeUrl(options.moduleUrl);
  const importer = options.importer ?? defaultImporter;
  let cachedRuntime: PortableWalletsRuntime | undefined;
  let pendingRuntime: Promise<PortableWalletsRuntime> | undefined;

  return {
    load(): Promise<PortableWalletsRuntime> {
      if (cachedRuntime) return Promise.resolve(cachedRuntime);
      if (pendingRuntime) return pendingRuntime;

      pendingRuntime = importRuntime(importer, moduleUrl)
        .then((runtime) => {
          cachedRuntime = runtime;
          pendingRuntime = undefined;
          return runtime;
        })
        .catch((error: unknown) => {
          pendingRuntime = undefined;
          throw normalizeRuntimeError(error);
        });

      return pendingRuntime;
    },
  };
}

async function importRuntime(
  importer: PortableWalletsRuntimeImporter,
  moduleUrl: string,
): Promise<PortableWalletsRuntime> {
  let imported: unknown;
  try {
    imported = await importer(moduleUrl);
  } catch (cause) {
    throw new PortableWalletsRuntimeError("runtime_import_failed", { cause });
  }

  if (!isRuntimeModule(imported)) {
    throw new PortableWalletsRuntimeError("runtime_incompatible");
  }

  let runtime: unknown;
  try {
    runtime = imported.createPortableWalletsRuntime();
  } catch (cause) {
    throw new PortableWalletsRuntimeError("runtime_incompatible", { cause });
  }

  if (!isPortableWalletsRuntime(runtime)) {
    throw new PortableWalletsRuntimeError("runtime_incompatible");
  }

  return runtime;
}

function privateRuntimeUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Invalid values use the same redacted failure as unsupported protocols.
  }

  throw new PortableWalletsRuntimeError("runtime_incompatible");
}

function isRuntimeModule(value: unknown): value is PortableWalletsRuntimeModule {
  if (!isRecord(value)) return false;
  return (
    value.checkoutKitRuntimeApiVersion === PORTABLE_WALLETS_RUNTIME_API_VERSION &&
    typeof value.createPortableWalletsRuntime === "function"
  );
}

function isPortableWalletsRuntime(value: unknown): value is PortableWalletsRuntime {
  if (!isRecord(value)) return false;
  return runtimeMethods.every((method) => typeof value[method] === "function");
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRuntimeError(error: unknown): PortableWalletsRuntimeError {
  return error instanceof PortableWalletsRuntimeError
    ? error
    : new PortableWalletsRuntimeError("runtime_import_failed", { cause: error });
}
