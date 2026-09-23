import type {
  PortableWalletsPurchaseContext,
  PortableWalletsVariantConfig,
  PortableWalletsWalletConfig,
} from "./wallets-runtime-loader";
import type { CartIdentifier, WalletPurchaseSnapshot } from "./wallets.types";

export type WalletBootstrapFailureCode =
  | "bootstrap_request_invalid"
  | "bootstrap_transport_failed"
  | "bootstrap_response_invalid";

export class WalletBootstrapError extends Error {
  readonly code: WalletBootstrapFailureCode;

  constructor(code: WalletBootstrapFailureCode) {
    super("Wallet configuration is unavailable.");
    this.name = "WalletBootstrapError";
    this.code = code;
  }
}

export type WalletBootstrapConfig = PortableWalletsWalletConfig;
export type WalletBootstrapVariant = PortableWalletsVariantConfig;
export type WalletBootstrapPurchaseContext = PortableWalletsPurchaseContext;

export interface WalletBootstrapResult {
  readonly shopId?: string;
  readonly presentmentCurrency?: string;
  readonly walletConfigs: ReadonlyArray<WalletBootstrapConfig>;
  readonly recommendedWallet: WalletBootstrapConfig | null;
  readonly fallbackWallet: WalletBootstrapConfig | null;
  readonly enabledFlags: ReadonlyArray<string>;
  readonly variantParams: ReadonlyArray<WalletBootstrapVariant>;
  readonly purchaseContext?: WalletBootstrapPurchaseContext;
}

export type WalletBootstrapTransportPurchase =
  | { readonly type: "cart"; readonly cartReference: CartIdentifier }
  | {
      readonly type: "product";
      readonly variantId: string;
      readonly sellingPlanId?: string;
    };

export interface WalletBootstrapTransportRequest {
  readonly storeDomain: string;
  readonly country: string;
  readonly locale: string;
  readonly currency?: string;
  readonly purchase: WalletBootstrapTransportPurchase;
  readonly signal: AbortSignal;
}

/**
 * The transport owns endpoint selection and authorization. Credentials stay in
 * its closure instead of entering the merchant element configuration, request,
 * result, error, or lifecycle event contracts.
 */
export type WalletBootstrapTransport = (
  request: WalletBootstrapTransportRequest,
) => Promise<unknown>;

export interface WalletBootstrapRequest {
  readonly purchase: Readonly<WalletPurchaseSnapshot>;
  readonly signal: AbortSignal;
}

export interface WalletBootstrapClient {
  load(request: WalletBootstrapRequest): Promise<WalletBootstrapResult>;
  cancel(): void;
}

interface BootstrapDescriptor {
  readonly storeDomain: string;
  readonly country: string;
  readonly locale: string;
  readonly currency?: string;
  readonly purchase: WalletBootstrapTransportPurchase;
}

interface ActiveBootstrap {
  readonly descriptor: BootstrapDescriptor;
  readonly generationSignal: AbortSignal;
  readonly controller: AbortController;
  readonly promise: Promise<WalletBootstrapResult>;
}

export function createWalletBootstrapClient(
  transport: WalletBootstrapTransport,
): WalletBootstrapClient {
  let active: ActiveBootstrap | undefined;

  return {
    load(request: WalletBootstrapRequest): Promise<WalletBootstrapResult> {
      if (request.signal.aborted) return Promise.reject(abortError());

      let descriptor: BootstrapDescriptor;
      try {
        descriptor = bootstrapDescriptor(request.purchase);
      } catch (error) {
        active?.controller.abort();
        return Promise.reject(error);
      }

      if (
        active &&
        active.generationSignal === request.signal &&
        sameDescriptor(active.descriptor, descriptor)
      ) {
        if (!active.controller.signal.aborted) {
          bindAbortSignal(request.signal, active);
          return active.promise;
        }
      }

      active?.controller.abort();

      const controller = new AbortController();
      const promise = requestBootstrap(transport, descriptor, controller.signal);
      const next: ActiveBootstrap = {
        descriptor,
        generationSignal: request.signal,
        controller,
        promise,
      };
      active = next;
      bindAbortSignal(request.signal, next);

      const clear = (): void => {
        if (active === next) active = undefined;
      };
      void promise.then(clear, clear);

      return promise;
    },

    cancel(): void {
      active?.controller.abort();
    },
  };
}

async function requestBootstrap(
  transport: WalletBootstrapTransport,
  descriptor: BootstrapDescriptor,
  signal: AbortSignal,
): Promise<WalletBootstrapResult> {
  try {
    const response = await transport({ ...descriptor, signal });
    if (signal.aborted) throw abortError();
    return parseBootstrapResponse(response, descriptor.purchase.type);
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw abortError();
    if (error instanceof WalletBootstrapError) throw error;
    throw new WalletBootstrapError("bootstrap_transport_failed");
  }
}

function bootstrapDescriptor(purchase: Readonly<WalletPurchaseSnapshot>): BootstrapDescriptor {
  const storeDomain = requiredString(purchase.storeDomain);
  const country = requiredString(purchase.country);
  const locale = requiredString(purchase.locale);
  const cartReference = optionalOpaqueString(purchase.cartId);
  const variantId = optionalOpaqueString(purchase.variantId);
  const sellingPlanId = optionalOpaqueString(purchase.sellingPlanId);

  let purchaseDescriptor: WalletBootstrapTransportPurchase;
  if (cartReference) {
    if (variantId || sellingPlanId) {
      throw new WalletBootstrapError("bootstrap_request_invalid");
    }
    purchaseDescriptor = { type: "cart", cartReference };
  } else {
    if (!variantId) throw new WalletBootstrapError("bootstrap_request_invalid");
    purchaseDescriptor = {
      type: "product",
      variantId,
      ...(sellingPlanId ? { sellingPlanId } : {}),
    };
  }

  return {
    storeDomain,
    country,
    locale,
    ...(purchase.currency ? { currency: purchase.currency } : {}),
    purchase: purchaseDescriptor,
  };
}

function parseBootstrapResponse(
  value: unknown,
  flow: WalletBootstrapTransportPurchase["type"],
): WalletBootstrapResult {
  if (!isRecord(value)) throw invalidResponse();

  const walletConfigs = requiredArray(value.walletConfigs, parseWalletConfig);
  const recommendedWallet = nullableWalletConfig(value, "recommendedWallet");
  const fallbackWallet = nullableWalletConfig(value, "fallbackWallet");
  const enabledFlags = requiredArray(value.flags, nonEmptyString);
  const variantParams = requiredArray(value.variantConfigs, parseVariant);
  const purchaseContext = parsePurchaseContext(value.purchaseContext, flow);
  const shopId = optionalString(value.shopId);
  const presentmentCurrency = optionalString(value.presentmentCurrency);

  return {
    ...(shopId ? { shopId } : {}),
    ...(presentmentCurrency ? { presentmentCurrency } : {}),
    walletConfigs,
    recommendedWallet,
    fallbackWallet,
    enabledFlags,
    variantParams,
    ...(purchaseContext ? { purchaseContext } : {}),
  };
}

function parseWalletConfig(value: unknown): WalletBootstrapConfig {
  if (!isRecord(value)) throw invalidResponse();

  const name = nonEmptyString(value.name);
  if (!isRecord(value.wallet_params)) throw invalidResponse();
  const supportsSubscriptions = optionalBoolean(value.supports_subs);
  const supportsDeferredOptions = optionalBoolean(value.supports_def_opts);

  return {
    name,
    ...(supportsSubscriptions === undefined ? {} : { supports_subs: supportsSubscriptions }),
    ...(supportsDeferredOptions === undefined
      ? {}
      : { supports_def_opts: supportsDeferredOptions }),
    wallet_params: { ...value.wallet_params },
  };
}

function parseVariant(value: unknown): WalletBootstrapVariant {
  if (!isRecord(value)) throw invalidResponse();
  return {
    id: nonEmptyString(value.id),
    requiresShipping: requiredBoolean(value.requiresShipping),
  };
}

function parsePurchaseContext(
  value: unknown,
  flow: WalletBootstrapTransportPurchase["type"],
): WalletBootstrapPurchaseContext | undefined {
  if (value == null) {
    if (flow === "product") throw invalidResponse();
    return undefined;
  }
  if (!isRecord(value)) throw invalidResponse();
  return {
    requiresShipping: requiredBoolean(value.requiresShipping),
    hasSellingPlan: requiredBoolean(value.hasSellingPlan),
  };
}

function nullableWalletConfig(
  response: Record<PropertyKey, unknown>,
  property: "recommendedWallet" | "fallbackWallet",
): WalletBootstrapConfig | null {
  if (!Object.hasOwn(response, property)) throw invalidResponse();
  const value = response[property];
  return value === null ? null : parseWalletConfig(value);
}

function requiredArray<T>(value: unknown, parseItem: (item: unknown) => T): ReadonlyArray<T> {
  if (!Array.isArray(value)) throw invalidResponse();
  return value.map(parseItem);
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WalletBootstrapError("bootstrap_request_invalid");
  }
  return value;
}

function optionalOpaqueString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WalletBootstrapError("bootstrap_request_invalid");
  }
  return value;
}

function nonEmptyString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) throw invalidResponse();
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return nonEmptyString(value);
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw invalidResponse();
  return value;
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return requiredBoolean(value);
}

function sameDescriptor(left: BootstrapDescriptor, right: BootstrapDescriptor): boolean {
  if (
    left.storeDomain !== right.storeDomain ||
    left.country !== right.country ||
    left.locale !== right.locale ||
    left.currency !== right.currency ||
    left.purchase.type !== right.purchase.type
  ) {
    return false;
  }

  if (left.purchase.type === "cart" && right.purchase.type === "cart") {
    return left.purchase.cartReference === right.purchase.cartReference;
  }
  if (left.purchase.type === "product" && right.purchase.type === "product") {
    return (
      left.purchase.variantId === right.purchase.variantId &&
      left.purchase.sellingPlanId === right.purchase.sellingPlanId
    );
  }
  return false;
}

function bindAbortSignal(signal: AbortSignal, active: ActiveBootstrap): void {
  const abort = (): void => active.controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const remove = (): void => signal.removeEventListener("abort", abort);
  void active.promise.then(remove, remove);
}

function invalidResponse(): WalletBootstrapError {
  return new WalletBootstrapError("bootstrap_response_invalid");
}

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
