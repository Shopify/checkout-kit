import { loadSampleCurrency } from "../universal-session/session-client";
import type { CheckoutEnvironment, BuyerCountry } from "../universal-session/api";
import { selectStoreCurrency, type CurrencyPreview, type Store } from "./state";

export type CurrencyLoader = (
  request: { environment: CheckoutEnvironment; domain: string; countryCode?: BuyerCountry },
  signal?: AbortSignal,
) => Promise<string>;

export function createCurrencyPreviewController({
  store,
  loadCurrency = loadSampleCurrency,
}: {
  store: Store;
  loadCurrency?: CurrencyLoader;
}): { dispose(): void } {
  const requests = new Map<string, AbortController>();
  let scheduled = false;
  let disposed = false;

  async function load(
    domain: string,
    preview: CurrencyPreview,
    request: AbortController,
  ): Promise<void> {
    // A result applies only while its store, buyer country, and environment are unchanged.
    const isCurrent = () => {
      if (disposed || request.signal.aborted || requests.get(domain) !== request) return false;
      const state = store.getState();
      return (
        state.stores.some((entry) => entry.domain === domain) &&
        state.buyerCountry === preview.countryCode &&
        state.environment === preview.environment
      );
    };

    let result: CurrencyPreview;
    try {
      const currencyCode = await loadCurrency(
        {
          environment: preview.environment,
          domain,
          ...(preview.countryCode ? { countryCode: preview.countryCode } : {}),
        },
        request.signal,
      );
      result = { ...preview, phase: "ready", currencyCode };
    } catch {
      result = { ...preview, phase: "unavailable" };
    }

    if (isCurrent()) {
      store.setState({
        currencyPreviews: { ...store.getState().currencyPreviews, [domain]: result },
      });
    }
  }

  function sync(): void {
    scheduled = false;
    if (disposed) return;

    const state = store.getState();
    const previews = { ...state.currencyPreviews };
    const pending: { domain: string; preview: CurrencyPreview; request: AbortController }[] = [];
    let changed = false;

    // Remove previews for stores no longer in the list.
    for (const domain of Object.keys(previews)) {
      if (state.stores.some((s) => s.domain === domain)) continue;
      requests.get(domain)?.abort();
      requests.delete(domain);
      delete previews[domain];
      changed = true;
    }

    // Load each store whose preview is missing or was loaded for other settings.
    for (const storeState of state.stores) {
      if (selectStoreCurrency(state, storeState.domain)) continue;

      // Abort any in-flight request for this store's previous settings.
      requests.get(storeState.domain)?.abort();

      const request = new AbortController();
      const preview: CurrencyPreview = {
        domain: storeState.domain,
        countryCode: state.buyerCountry,
        environment: state.environment,
        phase: "loading",
      };
      requests.set(storeState.domain, request);
      previews[storeState.domain] = preview;
      pending.push({ domain: storeState.domain, preview, request });
      changed = true;
    }

    if (changed) {
      store.setState({ currencyPreviews: previews });
    }

    for (const { domain, preview, request } of pending) {
      void load(domain, preview, request);
    }
  }

  function schedule(): void {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(sync);
  }

  // Syncing is idempotent: once every store has a current preview, it changes nothing.
  store.subscribe(schedule);

  schedule();

  return {
    dispose() {
      disposed = true;
      for (const request of requests.values()) request.abort();
      requests.clear();
    },
  };
}
