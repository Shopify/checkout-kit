import { describe, expect, it, vi } from "vitest";

import { createCurrencyPreviewController, type CurrencyLoader } from "./currency-preview";
import {
  createInitialState,
  createStore,
  selectCurrencyStatus,
  selectStoreCurrency,
  type AppState,
  type SettingsSlice,
} from "./state";

const DOMAIN_1 = "store-one.myshopify.com";
const DOMAIN_2 = "store-two.myshopify.com";

function state(overrides: Partial<AppState> = {}): AppState {
  const settings: SettingsSlice = {
    sourceMode: "build",
    storefrontDomain: "",
    storeDomains: [],
    environment: "production",
    buyerCountry: "CA",
    button: true,
    target: "popup",
    logLevel: "warn",
    manualSrc: "",
    settingsCollapsed: false,
    eventsCollapsed: false,
  };
  return {
    ...createInitialState(settings),
    configuration: { status: "loaded", environments: ["production"], storeDomains: [] },
    stores: [
      { domain: DOMAIN_1, variants: [], cartLines: [], loadState: "loaded" },
      { domain: DOMAIN_2, variants: [], cartLines: [], loadState: "loaded" },
    ],
    ...overrides,
  };
}

/** A loader whose requests resolve or reject only when the test says so. */
function controlledLoader() {
  const requests: {
    request: Parameters<CurrencyLoader>[0];
    signal?: AbortSignal;
    resolve: (currencyCode: string) => void;
    reject: () => void;
  }[] = [];
  const loadCurrency = vi.fn<CurrencyLoader>(
    (request, signal) =>
      new Promise<string>((resolve, reject) => {
        requests.push({ request, signal, resolve, reject: () => reject(new Error("failed")) });
      }),
  );
  return { loadCurrency, requests };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createCurrencyPreviewController", () => {
  it("loads each store's currency for the buyer country and environment", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();

    expect(requests.map((entry) => entry.request)).toEqual([
      { environment: "production", domain: DOMAIN_1, countryCode: "CA" },
      { environment: "production", domain: DOMAIN_2, countryCode: "CA" },
    ]);
    expect(selectStoreCurrency(store.getState(), DOMAIN_1)?.phase).toBe("loading");

    requests[0]?.resolve("CAD");
    requests[1]?.resolve("CAD");
    await settle();

    expect(selectStoreCurrency(store.getState(), DOMAIN_1)).toEqual({
      domain: DOMAIN_1,
      countryCode: "CA",
      environment: "production",
      phase: "ready",
      currencyCode: "CAD",
    });
    expect(selectCurrencyStatus(store.getState())?.message).toContain("Expected currency: CAD");
  });

  it("stops loading once every store has a current preview", async () => {
    // Regression: each preview update re-ran the sync, which reloaded every store forever.
    const store = createStore(state());
    const loadCurrency = vi.fn<CurrencyLoader>().mockResolvedValue("CAD");

    createCurrencyPreviewController({ store, loadCurrency });
    for (let i = 0; i < 5; i++) await settle();

    expect(loadCurrency).toHaveBeenCalledTimes(2);
    store.setState({ manualSrc: "unrelated change" });
    await settle();
    expect(loadCurrency).toHaveBeenCalledTimes(2);
  });

  it("marks a store unavailable when its request fails", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    requests[0]?.reject();
    requests[1]?.resolve("CAD");
    await settle();

    expect(selectStoreCurrency(store.getState(), DOMAIN_1)?.phase).toBe("unavailable");
    expect(selectCurrencyStatus(store.getState())?.message).toContain(
      `Currency preview unavailable for ${DOMAIN_1}`,
    );
  });

  it("reports a mismatch between stores", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    requests[0]?.resolve("CAD");
    requests[1]?.resolve("USD");
    await settle();

    const status = selectCurrencyStatus(store.getState());
    expect(status?.tone).toBe("error");
    expect(status?.message).toContain(`${DOMAIN_1}: CAD`);
    expect(status?.message).toContain(`${DOMAIN_2}: USD`);
  });

  it("reloads after a buyer country change and ignores the stale result", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    const [first] = requests;

    store.setState({ buyerCountry: "US" });
    await settle();

    expect(first?.signal?.aborted).toBe(true);
    expect(requests.slice(2).map((entry) => entry.request.countryCode)).toEqual(["US", "US"]);

    // The old request settles late; it must not become the US preview.
    first?.resolve("CAD");
    requests[2]?.resolve("USD");
    await settle();
    expect(selectStoreCurrency(store.getState(), DOMAIN_1)?.currencyCode).toBe("USD");
  });

  it("reloads after an environment change", async () => {
    const store = createStore(state());
    const loadCurrency = vi.fn<CurrencyLoader>().mockResolvedValue("CAD");

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    store.setState({ environment: "development" });
    await settle();

    expect(loadCurrency).toHaveBeenCalledTimes(4);
    expect(loadCurrency.mock.calls.at(-1)?.[0].environment).toBe("development");
    expect(selectStoreCurrency(store.getState(), DOMAIN_1)?.environment).toBe("development");
  });

  it("drops a removed store's preview and ignores its late result", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    store.setState({ stores: store.getState().stores.slice(1) });
    await settle();
    requests[0]?.resolve("CAD");
    await settle();

    expect(requests[0]?.signal?.aborted).toBe(true);
    expect(store.getState().currencyPreviews[DOMAIN_1]).toBeUndefined();
  });

  it("omits the country when no buyer country is chosen", async () => {
    const store = createStore(state({ buyerCountry: "" }));
    const loadCurrency = vi.fn<CurrencyLoader>().mockResolvedValue("CAD");

    createCurrencyPreviewController({ store, loadCurrency });
    await settle();

    expect(loadCurrency).toHaveBeenCalledWith(
      { environment: "production", domain: DOMAIN_1 },
      expect.any(AbortSignal),
    );
  });

  it("stops after dispose", async () => {
    const store = createStore(state());
    const { loadCurrency, requests } = controlledLoader();

    const controller = createCurrencyPreviewController({ store, loadCurrency });
    await settle();
    controller.dispose();
    store.setState({ buyerCountry: "US" });
    await settle();

    expect(requests).toHaveLength(2);
    expect(requests.every((entry) => entry.signal?.aborted)).toBe(true);
  });
});
