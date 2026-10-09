// Inlined at build time. Not imported from ./version so the loader stays a
// single request with no shared chunk of its own.
declare const CHECKOUT_KIT_PACKAGE_VERSION: string;
// Injected by the CDN build (see vite.cdn.config.ts) with the hashed URL of the
// shopify-checkout chunk, relative to this module. Undefined when running
// from source (tests), in which case retries re-import the static specifier.
declare const CHECKOUT_KIT_SHOPIFY_CHECKOUT_CHUNK: string | undefined;

/**
 * The Checkout Kit version this loader was built from.
 *
 * CDN URLs are evergreen within a major and cached at the edge and in the
 * browser, so use this to confirm which build a page actually received.
 */
export const version: string = CHECKOUT_KIT_PACKAGE_VERSION;

export const supportedComponents = ["shopify-checkout"] as const;

export type CheckoutKitComponent = (typeof supportedComponents)[number];

interface ComponentSource {
  /** Static import the bundler can see and chunk. */
  load: () => Promise<unknown>;
  /** Build-time URL of the chunk, for cache-busting retries. */
  url: string | undefined;
}

const componentSources: Record<CheckoutKitComponent, ComponentSource> = {
  "shopify-checkout": {
    load: () => import("./components/shopify-checkout/register"),
    url:
      typeof CHECKOUT_KIT_SHOPIFY_CHECKOUT_CHUNK === "string"
        ? CHECKOUT_KIT_SHOPIFY_CHECKOUT_CHUNK
        : undefined,
  },
};

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

const loaded = new Set<CheckoutKitComponent>();
const pending = new Map<CheckoutKitComponent, Promise<void>>();

// Browsers remember a failed import per URL for the life of the page, so a
// retry URL must never be reused: each load sequence gets its own token, and
// each attempt within it a suffix. Otherwise a sequence that fails outright
// during an outage would leave every retry URL poisoned for later calls.
let retrySequence = 0;

/**
 * Loads Checkout Kit components and registers their custom elements.
 *
 * Every name is validated before anything is fetched, so a typo cannot leave
 * the page half-loaded. Loading a component more than once is safe: the
 * browser caches the module, custom-element registration happens once, and
 * concurrent requests share one in-flight load. The returned promise rejects
 * if any component fails; a later call retries only what has not loaded.
 *
 * A failed dynamic import is remembered by the browser for that URL, so a
 * transient network error would otherwise make the component unloadable for
 * the rest of the page. Retries therefore use a cache-busting query string on
 * the chunk URL, which the browser treats as a fresh module.
 */
export async function loadComponents(components: readonly string[]): Promise<void> {
  const names = components.map(toComponentName);
  await Promise.all(names.map(loadOne));
}

function toComponentName(component: string): CheckoutKitComponent {
  // Own-property check so inherited names like "constructor" are rejected.
  if (!Object.hasOwn(componentSources, component)) {
    throw new Error(`Unsupported Checkout Kit component: ${component}`);
  }
  return component as CheckoutKitComponent;
}

async function loadOne(name: CheckoutKitComponent): Promise<void> {
  if (loaded.has(name)) return;

  let inflight = pending.get(name);
  if (inflight === undefined) {
    inflight = loadAndRemember(name).finally(() => pending.delete(name));
    pending.set(name, inflight);
  }
  await inflight;
}

async function loadAndRemember(name: CheckoutKitComponent): Promise<void> {
  await loadWithRetries(componentSources[name]);
  loaded.add(name);
}

async function loadWithRetries(source: ComponentSource): Promise<void> {
  let lastError: unknown;
  retrySequence += 1;
  const sequence = `${Date.now().toString(36)}-${retrySequence}`;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      // The first attempt of the first sequence uses the static import so the
      // browser can share it with any preload; every later attempt needs a URL
      // it has never seen fail.
      if (source.url === undefined || (attempt === 0 && retrySequence === 1)) {
        await source.load();
      } else {
        const retryUrl = new URL(`${source.url}?retry=${sequence}.${attempt}`, import.meta.url)
          .href;
        await import(/* @vite-ignore */ retryUrl);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
