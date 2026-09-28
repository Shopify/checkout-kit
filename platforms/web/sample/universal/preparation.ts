import {
  selectCartReadiness,
  withInputChange,
  type UniversalState,
  type UniversalStore,
} from "./state";
import {
  isBuyerCountry,
  isCheckoutEnvironment,
  type BuyerCountry,
  type CheckoutEnvironment,
} from "./policy";
import {
  describeTransportError,
  samplePreparationTransport,
  SampleTransportError,
  type CreatedCart,
  type PreparationTransport,
} from "./transport";

export interface SessionPreparationController {
  prepare(): Promise<void>;
  setEnvironment(environment: CheckoutEnvironment): void;
  setBuyerCountry(country: BuyerCountry): void;
  dispose(): void;
}

interface PreparationOptions {
  store: UniversalStore;
  transport?: PreparationTransport;
}

interface PreparedShop {
  key: string;
  domain: string;
  cartRevision: number;
  lines: { variantId: string; quantity: number }[];
}

interface CachedCart {
  cart: CreatedCart;
  domain: string;
  cartRevision: number;
  environment: CheckoutEnvironment;
  countryCode: BuyerCountry;
  lines: PreparedShop["lines"];
}

function matchesCart(
  cached: CachedCart,
  shop: PreparedShop,
  environment: CheckoutEnvironment,
  countryCode: BuyerCountry,
): boolean {
  return (
    cached.domain === shop.domain &&
    cached.cartRevision === shop.cartRevision &&
    cached.environment === environment &&
    cached.countryCode === countryCode &&
    cached.lines.length === shop.lines.length &&
    cached.lines.every(
      (line, index) =>
        line.variantId === shop.lines[index]?.variantId &&
        line.quantity === shop.lines[index]?.quantity,
    )
  );
}

export function createSessionPreparationController(
  options: PreparationOptions,
): SessionPreparationController {
  const { store } = options;
  const transport = options.transport ?? samplePreparationTransport;
  const createdCarts = new Map<string, CachedCart>();
  let active: { generation: number; controller: AbortController } | null = null;
  let disposed = false;

  function pruneCachedCarts(state: UniversalState): void {
    for (const [key, cached] of createdCarts) {
      const shop = state.shops.find((entry) => entry.key === key);
      if (
        !shop ||
        !matchesCart(
          cached,
          { key, domain: shop.domain, cartRevision: shop.cartRevision, lines: shop.cartLines },
          state.environment,
          state.buyerCountry,
        )
      ) {
        createdCarts.delete(key);
      }
    }
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.preparation.generation === previous.preparation.generation) return;
    active?.controller.abort();
    active = null;
    pruneCachedCarts(state);
  });

  function isCurrent(generation: number, controller: AbortController): boolean {
    return (
      !disposed &&
      !controller.signal.aborted &&
      active?.controller === controller &&
      active.generation === generation &&
      store.getState().preparation.generation === generation
    );
  }

  function setCartPhase(
    generation: number,
    key: string,
    phase: "ready" | "error",
    currencyCode = "",
  ): void {
    store.update((state) => {
      if (state.preparation.generation !== generation) return state;
      return {
        ...state,
        preparation: {
          ...state.preparation,
          carts: { ...state.preparation.carts, [key]: { phase, currencyCode } },
        },
      };
    });
  }

  function fail(generation: number, message: string, resetCarts = false): void {
    store.update((state) => {
      if (state.preparation.generation !== generation) return state;
      return {
        ...state,
        preparation: {
          ...state.preparation,
          phase: "error",
          url: "",
          readyGeneration: null,
          error: message,
          carts: resetCarts ? {} : state.preparation.carts,
        },
      };
    });
  }

  async function prepare(): Promise<void> {
    if (disposed) return;
    const state = store.getState();
    if (
      !selectCartReadiness(state).ready ||
      state.preparation.phase === "creatingCarts" ||
      state.preparation.phase === "creatingSession"
    ) {
      return;
    }

    const generation = state.preparation.generation;
    const environment = state.environment;
    const countryCode = state.buyerCountry;
    const shops = state.shops.map((shop) => ({
      key: shop.key,
      domain: shop.domain,
      cartRevision: shop.cartRevision,
      lines: shop.cartLines.map((line) => ({ ...line })),
    }));
    pruneCachedCarts(state);
    const controller = new AbortController();
    active = { generation, controller };
    store.update((current) => ({
      ...current,
      preparation: {
        ...current.preparation,
        phase: "creatingCarts",
        url: "",
        readyGeneration: null,
        error: "",
        carts: Object.fromEntries(
          shops.map((shop) => {
            const cached = createdCarts.get(shop.key);
            return [
              shop.key,
              cached
                ? { phase: "ready" as const, currencyCode: cached.cart.currencyCode }
                : { phase: "creating" as const, currencyCode: "" },
            ];
          }),
        ),
      },
    }));

    const results = await Promise.allSettled(
      shops.map(async (shop) => {
        const cached = createdCarts.get(shop.key);
        if (cached && matchesCart(cached, shop, environment, countryCode)) {
          return cached.cart;
        }
        try {
          const cart = await transport.createCart(
            { domain: shop.domain, lines: shop.lines },
            environment,
            countryCode,
            controller.signal,
          );
          if (isCurrent(generation, controller)) {
            createdCarts.set(shop.key, {
              cart,
              domain: shop.domain,
              cartRevision: shop.cartRevision,
              environment,
              countryCode,
              lines: shop.lines,
            });
            setCartPhase(generation, shop.key, "ready", cart.currencyCode);
          }
          return cart;
        } catch (error) {
          if (isCurrent(generation, controller)) setCartPhase(generation, shop.key, "error");
          throw error;
        }
      }),
    );
    if (!isCurrent(generation, controller)) return;

    const failed = results.findIndex((result) => result.status === "rejected");
    if (failed >= 0) {
      const result = results[failed];
      const shop = shops[failed];
      const reason = result?.status === "rejected" ? result.reason : undefined;
      fail(generation, `${shop?.domain ?? "A shop"}: ${describeTransportError(reason)}`);
      active = null;
      return;
    }

    const carts = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const currencies = new Set(carts.map((cart) => cart.currencyCode));
    if (currencies.size !== 1) {
      fail(
        generation,
        "These shop carts use different currencies. Choose a buyer country supported by every shop, then try again.",
      );
      active = null;
      return;
    }

    store.update((current) => {
      if (current.preparation.generation !== generation) return current;
      return {
        ...current,
        preparation: { ...current.preparation, phase: "creatingSession" },
      };
    });

    let sessionCreated = false;
    try {
      const cartIds = carts.map((cart) => cart.cartId);
      const url = await transport.createSession(cartIds, environment, controller.signal);
      if (!isCurrent(generation, controller)) return;
      store.update((current) => ({
        ...current,
        preparation: {
          ...current.preparation,
          phase: "ready",
          url,
          readyGeneration: generation,
          error: "",
        },
      }));
      sessionCreated = true;
    } catch (error) {
      if (isCurrent(generation, controller)) {
        const rejectedCarts =
          error instanceof SampleTransportError &&
          (error.code === "session_rejected" || error.code === "invalid_request");
        if (rejectedCarts) createdCarts.clear();
        fail(generation, describeTransportError(error), rejectedCarts);
      }
    } finally {
      if (active?.controller === controller) active = null;
      if (sessionCreated) createdCarts.clear();
    }
  }

  function setEnvironment(environment: CheckoutEnvironment): void {
    if (!isCheckoutEnvironment(environment)) return;
    store.update((state) =>
      state.environment === environment
        ? state
        : withInputChange({ ...state, environment }, state.shops),
    );
  }

  function setBuyerCountry(country: BuyerCountry): void {
    if (!isBuyerCountry(country)) return;
    store.update((state) =>
      state.buyerCountry === country
        ? state
        : withInputChange({ ...state, buyerCountry: country }, state.shops),
    );
  }

  function dispose(): void {
    disposed = true;
    active?.controller.abort();
    active = null;
    createdCarts.clear();
    unsubscribe();
  }

  return { prepare, setEnvironment, setBuyerCountry, dispose };
}
