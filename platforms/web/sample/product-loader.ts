import {
  fetchProductVariants,
  isLikelyStorefrontDomain,
  normalizeStorefrontDomain,
  type ProductVariantOption,
} from "./cart";
import { STORAGE_KEYS, writeStorage } from "./storage";
import type { Store } from "./state";

const PRODUCT_LOAD_DEBOUNCE_MS = 500;

type ProductFetcher = (domain: string) => Promise<ProductVariantOption[]>;

type ProductLoaderDeps = {
  store: Store;
  setDomainInputValue: (domain: string) => void;
  fetchVariants?: ProductFetcher;
  debounceMs?: number;
};

export type ProductLoader = {
  schedule(rawDomain: string): void;
  cancel(): void;
};

export function createProductLoader(deps: ProductLoaderDeps): ProductLoader {
  const { store, setDomainInputValue } = deps;
  const fetchVariants = deps.fetchVariants ?? ((domain) => fetchProductVariants(domain));
  const debounceMs = deps.debounceMs ?? PRODUCT_LOAD_DEBOUNCE_MS;

  let timer: number | undefined;
  let requestId = 0;

  function cancel(): void {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    requestId += 1;
  }

  async function load(domain: string, id: number): Promise<void> {
    if (id !== requestId) return;

    setDomainInputValue(domain);
    timer = undefined;
    store.setState({
      loadState: "Loading",
      cartStatus: {
        message: `Loading products from https://${domain}/products.json...`,
        tone: "info",
      },
    });

    try {
      const variants = await fetchVariants(domain);
      if (id !== requestId) return;
      store.setState({
        variants,
        loadState: `${variants.length} loaded`,
        cartStatus: { message: "Products loaded.", tone: "success" },
      });
    } catch (error) {
      if (id !== requestId) return;
      const message = error instanceof Error ? error.message : "Products could not be loaded.";
      store.setState({ loadState: "Load failed", cartStatus: { message, tone: "error" } });
    }
  }

  function schedule(rawDomain: string): void {
    cancel();
    store.setState({ variants: [], cartLines: [] });

    const domain = normalizeStorefrontDomain(rawDomain);
    writeStorage(STORAGE_KEYS.storefrontDomain, domain);

    if (!isLikelyStorefrontDomain(domain)) {
      return;
    }

    const id = requestId;
    store.setState({
      loadState: "Loading soon",
      cartStatus: {
        message: `Waiting to load products from https://${domain}/products.json...`,
        tone: "info",
      },
    });
    timer = window.setTimeout(() => {
      void load(domain, id);
    }, debounceMs);
  }

  return { schedule, cancel };
}
