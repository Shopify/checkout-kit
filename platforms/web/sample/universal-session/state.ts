import {
  classifyPastedSource,
  MAX_CART_LINES,
  MAX_SESSION_STORES,
  type BuyerCountry,
  type CheckoutEnvironment,
} from "../universal-session/api";
import {
  normalizeCartLines,
  normalizeStorefrontDomain,
  type CartLine,
  type ProductVariantOption,
} from "../cart";
import { describeSessionFailure } from "../universal-session/session-client";
import type { SamplePage } from "./page";
import type { PersistedSettings, SourceMode } from "./storage";

export type { SourceMode };
export type NoticeTone = "info" | "success" | "error";

export type Notice = {
  message: string;
  tone: NoticeTone;
};

export type CartStatus = Notice;

export type LogEntry = {
  type: string;
  time: string;
  summary: string;
  snapshot: string;
};

export type SettingsSlice = PersistedSettings & {
  /** The pasted Universal session URL. Kept in page memory only. */
  manualSrc: string;
};

export type ConfigurationState =
  | { status: "loading" }
  | { status: "loaded"; environments: readonly CheckoutEnvironment[]; storeDomains: string[] }
  | { status: "unavailable" };

/** Per-store state for products and cart lines. */
export interface StoreState {
  domain: string;
  variants: ProductVariantOption[];
  cartLines: CartLine[];
  loadState: "loading" | "loaded" | "failed";
  loadMessage?: string;
}

/** A store's expected currency for the buyer country and environment it was loaded for. */
export interface CurrencyPreview {
  domain: string;
  countryCode: BuyerCountry | "";
  environment: CheckoutEnvironment;
  phase: "loading" | "ready" | "unavailable";
  currencyCode?: string;
}

/** The store's preview, if it was loaded for the current buyer country and environment. */
export function selectStoreCurrency(state: AppState, domain: string): CurrencyPreview | undefined {
  const preview = state.currencyPreviews[domain];
  return preview?.countryCode === state.buyerCountry && preview.environment === state.environment
    ? preview
    : undefined;
}

/** A prepared session belongs to the cart and settings it was created from. */
export type SessionState =
  | { status: "idle"; notice?: Notice }
  | { status: "preparing"; inputKey: string }
  | { status: "ready"; inputKey: string; continueUrl: string; currencyCode: string }
  | { status: "failed"; inputKey: string; message: string };

/** How the presentation of a source ended. Applies only while that source is active. */
export type PresentationOutcome =
  | { src: string; kind: "completed" }
  | { src: string; kind: "ended"; code: string };

export type AppState = SettingsSlice & {
  stores: StoreState[];
  currencyPreviews: Record<string, CurrencyPreview>;
  configuration: ConfigurationState;
  session: SessionState;
  outcome?: PresentationOutcome;
  log: LogEntry[];
};

export function createInitialState(settings: SettingsSlice): AppState {
  return {
    ...settings,
    stores: [],
    currencyPreviews: {},
    configuration: { status: "loading" },
    session: { status: "idle" },
    log: [],
  };
}

export type Store = {
  getState(): AppState;
  setState(partial: Partial<AppState>): void;
  subscribe(listener: () => void): void;
};

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState(partial) {
      state = { ...state, ...partial };
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
    },
  };
}

/** Everything a prepared session depends on. Changing any of it needs a new session. */
export function selectSessionInputKey(state: AppState): string {
  // Include every store with lines, in list order, plus environment and buyer country.
  const storesWithLines = state.stores
    .filter((store) => store.cartLines.length > 0)
    .map((store) => ({
      domain: normalizeStorefrontDomain(store.domain),
      lines: normalizeCartLines(store.cartLines),
    }));

  return JSON.stringify([state.environment, state.buyerCountry, storesWithLines]);
}

export function selectSession(state: AppState): SessionState {
  const { session } = state;
  if (session.status !== "idle" && session.inputKey !== selectSessionInputKey(state)) {
    return { status: "idle" };
  }
  return session;
}

/** The `src` to give the checkout element, or an empty string when nothing can open yet. */
export function selectActiveSourceUrl(state: AppState): string {
  if (state.sourceMode === "manual") {
    const status = classifyPastedSource(state.manualSrc);
    return status === "valid" || status === "unexpected" ? state.manualSrc.trim() : "";
  }
  const session = selectSession(state);
  return session.status === "ready" ? session.continueUrl : "";
}

export function selectOutcome(state: AppState): PresentationOutcome | undefined {
  const src = selectActiveSourceUrl(state);
  return src && state.outcome?.src === src ? state.outcome : undefined;
}

/** Whether the selected environment can create sessions; unknown until configuration loads. */
export function selectEnvironmentConfigured(state: AppState): boolean | undefined {
  return state.configuration.status === "loaded"
    ? state.configuration.environments.includes(state.environment)
    : undefined;
}

/** Stores with at least one cart line. */
export function selectStoresWithLines(state: AppState): StoreState[] {
  return state.stores.filter((store) => store.cartLines.length > 0);
}

/** Total cart lines across all stores. */
export function selectTotalCartLines(state: AppState): number {
  return state.stores.reduce((sum, store) => sum + store.cartLines.length, 0);
}

/** Whether any store has too many cart lines. */
export function selectAnyStoreExceedsMaxLines(state: AppState): boolean {
  return state.stores.some((store) => store.cartLines.length > MAX_CART_LINES);
}

export function selectCanPrepare(state: AppState): boolean {
  const status = selectSession(state).status;
  const storesWithLines = selectStoresWithLines(state);
  return (
    state.sourceMode === "build" &&
    storesWithLines.length > 0 &&
    !selectAnyStoreExceedsMaxLines(state) &&
    (status === "idle" || status === "failed") &&
    selectEnvironmentConfigured(state) !== false &&
    state.configuration.status !== "unavailable"
  );
}

/** What the page calls its checkout element and the control that opens it. */
export type NoticePage = Pick<SamplePage, "tag" | "productName" | "button">;

/** The host page's own open button; the element's button only exists when the page offers it. */
export function hostOpenLabel(page: Pick<SamplePage, "productName" | "button">): string {
  return page.button ? `Buy with ${page.productName}` : `Open ${page.productName}`;
}

function usesElementButton(state: AppState, page: NoticePage): boolean {
  return page.button && state.button;
}

function openHint(state: AppState, page: NoticePage): string {
  return usesElementButton(state, page)
    ? `Tap ${page.productName}'s button to open it.`
    : `Click ${hostOpenLabel(page)} to open it.`;
}

function outcomeNotice(outcome: PresentationOutcome, next: string, page: NoticePage): Notice {
  return outcome.kind === "completed"
    ? { message: `${page.productName} completed this session. ${next}`, tone: "success" }
    : { message: `This session ended with ${outcome.code}. ${next}`, tone: "error" };
}

function manualNotice(state: AppState, page: NoticePage): Notice {
  const outcome = selectOutcome(state);
  if (outcome)
    return outcomeNotice(outcome, "Paste a new Universal session URL for another order.", page);
  switch (classifyPastedSource(state.manualSrc)) {
    case "empty":
      return {
        message:
          "Paste a Universal session URL that your server created. It stays on this page and is not saved.",
        tone: "info",
      };
    case "invalid":
      return { message: "Enter an HTTPS URL.", tone: "error" };
    case "unexpected":
      return {
        message: `This doesn't look like a Universal session URL. <${page.tag}> will still try to open it.`,
        tone: "info",
      };
    case "valid":
      return { message: `Ready. ${openHint(state, page)}`, tone: "success" };
  }
}

/** Currency preview status for the cart banner. */
export function selectCurrencyStatus(
  state: AppState,
): { message: string; tone: "info" | "error" } | undefined {
  if (!state.stores.length || state.sourceMode === "manual") return undefined;

  const previews = state.stores.map((store) => ({
    domain: store.domain,
    preview: selectStoreCurrency(state, store.domain),
  }));

  const ready = previews.filter((entry) => entry.preview?.phase === "ready");
  const currencies = new Set(ready.map((entry) => entry.preview?.currencyCode));

  if (currencies.size > 1) {
    return {
      tone: "error",
      message: `Currency mismatch expected: ${ready.map((entry) => `${entry.domain}: ${entry.preview?.currencyCode}`).join(" · ")}. Try another buyer country.`,
    };
  }

  if (previews.some((entry) => !entry.preview || entry.preview.phase === "loading")) {
    return { tone: "info", message: "Checking shop currencies for the selected buyer country…" };
  }

  const unavailable = previews.filter((entry) => entry.preview?.phase === "unavailable");
  if (unavailable.length) {
    return {
      tone: "info",
      message: `Currency preview unavailable for ${unavailable.map((entry) => entry.domain).join(", ")}. Preparing the session confirms the cart currencies.`,
    };
  }

  return {
    tone: "info",
    message: `Expected currency: ${ready[0]?.preview?.currencyCode}`,
  };
}

function buildNotice(state: AppState, page: NoticePage): Notice {
  const session = selectSession(state);
  const storesWithLines = selectStoresWithLines(state);
  const storesCount = storesWithLines.length;
  const prepareHint = usesElementButton(state, page)
    ? `Prepare a session to show ${page.productName}'s button.`
    : `Prepare a session to enable ${hostOpenLabel(page)}.`;

  switch (session.status) {
    case "preparing":
      return {
        message: `Creating one cart per store, then a Universal session for ${storesCount} ${storesCount === 1 ? "store" : "stores"}…`,
        tone: "info",
      };
    case "failed":
      return { message: session.message, tone: "error" };
    case "ready": {
      const outcome = selectOutcome(state);
      if (outcome)
        return outcomeNotice(outcome, "Close the window to prepare a new session.", page);
      return {
        message: `Session ready for ${storesCount} ${storesCount === 1 ? "store" : "stores"} in ${session.currencyCode}. ${openHint(state, page)}`,
        tone: "success",
      };
    }
    case "idle":
      break;
  }

  if (state.configuration.status === "unavailable") {
    return {
      message:
        "The local sample server is unavailable, so sessions cannot be prepared. Start it with pnpm sample and reload, or paste an existing session.",
      tone: "error",
    };
  }
  if (selectEnvironmentConfigured(state) === false) {
    return {
      message: describeSessionFailure(
        { ok: false, code: "configuration_required" },
        state.environment,
      ),
      tone: "error",
    };
  }
  if (state.stores.length === 0) {
    return session.notice ?? { message: `Add a store in Settings. ${prepareHint}`, tone: "info" };
  }
  if (storesCount === 0) {
    return session.notice ?? { message: `Add products to the cart. ${prepareHint}`, tone: "info" };
  }
  if (selectAnyStoreExceedsMaxLines(state)) {
    return {
      message: `This sample supports at most ${MAX_CART_LINES} cart lines per store.`,
      tone: "error",
    };
  }
  return session.notice ?? { message: prepareHint, tone: "info" };
}

/** The status shown beside the button that opens checkout. */
export function selectExpressNotice(state: AppState, page: NoticePage): Notice {
  return state.sourceMode === "manual" ? manualNotice(state, page) : buildNotice(state, page);
}

/** Validation message when adding a store. */
export function validateAddStore(
  state: AppState,
  domain: string,
): { valid: true } | { valid: false; message: string } {
  const normalized = normalizeStorefrontDomain(domain);

  if (!normalized) {
    return { valid: false, message: "Enter a storefront domain." };
  }

  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(normalized)) {
    return { valid: false, message: "Enter a valid domain, like your-store.myshopify.com." };
  }

  if (state.stores.some((store) => normalizeStorefrontDomain(store.domain) === normalized)) {
    return { valid: false, message: "This store is already in the list." };
  }

  if (state.stores.length >= MAX_SESSION_STORES) {
    return {
      valid: false,
      message: `This sample supports at most ${MAX_SESSION_STORES} stores.`,
    };
  }

  return { valid: true };
}
