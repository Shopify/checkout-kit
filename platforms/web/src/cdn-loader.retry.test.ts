import { afterEach, describe, expect, it, vi } from "vitest";

// A failed dynamic import is remembered by browsers for that URL, so the
// loader retries through a cache-busting URL. From source there is no build
// time chunk URL, so retries re-import the static specifier; mocking that
// module lets us drive the attempt sequence.
describe("Checkout Kit CDN loader retries", () => {
  afterEach(() => {
    vi.doUnmock("@shopify/checkout-kit-checkout/register");
    vi.resetModules();
    vi.useRealTimers();
  });

  async function loaderWithFailures(failures: number) {
    let attempts = 0;
    vi.doMock("@shopify/checkout-kit-checkout/register", () => {
      attempts += 1;
      if (attempts <= failures) {
        throw new TypeError("Failed to fetch dynamically imported module");
      }
      return {};
    });
    const loader = await import("./cdn-loader");
    return { loader, attempts: () => attempts };
  }

  it("retries a failed component import and resolves once it succeeds", async () => {
    vi.useFakeTimers();
    const { loader, attempts } = await loaderWithFailures(2);

    const result = loader.loadComponents(["shopify-checkout"]);
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBeUndefined();
    expect(attempts()).toBe(3);
  });

  it("gives up after the last attempt with the final error", async () => {
    vi.useFakeTimers();
    const { loader, attempts } = await loaderWithFailures(Number.POSITIVE_INFINITY);

    const result = loader.loadComponents(["shopify-checkout"]);
    result.catch(() => {});
    await vi.runAllTimersAsync();

    // vitest wraps a throwing mock factory in its own error; the loader
    // surfaces whatever the final import rejected with.
    await expect(result).rejects.toThrow(/error when mocking a module/);
    expect(attempts()).toBe(3);
  });

  it("can be called again after a sequence fails outright", async () => {
    vi.useFakeTimers();
    const { loader, attempts } = await loaderWithFailures(4);

    const first = loader.loadComponents(["shopify-checkout"]);
    first.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(first).rejects.toThrow(/error when mocking a module/);
    expect(attempts()).toBe(3);

    const second = loader.loadComponents(["shopify-checkout"]);
    await vi.runAllTimersAsync();
    await expect(second).resolves.toBeUndefined();
    expect(attempts()).toBe(5);
  });

  it("does not reload a component that already loaded", async () => {
    vi.useFakeTimers();
    const { loader, attempts } = await loaderWithFailures(0);

    await loader.loadComponents(["shopify-checkout"]);
    await loader.loadComponents(["shopify-checkout"]);

    expect(attempts()).toBe(1);
  });

  it("validates every name before fetching anything", async () => {
    const { loader, attempts } = await loaderWithFailures(0);

    await expect(loader.loadComponents(["shopify-checkout", "wallets"])).rejects.toThrow(
      "Unsupported Checkout Kit component: wallets",
    );
    expect(attempts()).toBe(0);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    vi.useFakeTimers();
    const { loader, attempts } = await loaderWithFailures(1);

    const first = loader.loadComponents(["shopify-checkout"]);
    const second = loader.loadComponents(["shopify-checkout"]);
    await vi.runAllTimersAsync();

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(attempts()).toBe(2);
  });
});

// A CDN build injects each component's chunk URL, which turns on cache-busting
// retries. Each component's first attempt still goes through its static import,
// so the browser can share the request with a preload. The chunk URLs below are
// modules that always throw, so any retry through them fails recognizably. The
// trailing comment absorbs the retry query string.
function failingModule(name: string): string {
  return `data:text/javascript,${encodeURIComponent(`throw new Error("${name} retry URL failed");//`)}`;
}

describe("Checkout Kit CDN loader static imports", () => {
  const registers = {
    "shopify-checkout": "@shopify/checkout-kit-checkout/register",
    "shop-pay": "@shopify/checkout-kit-shop-pay/register",
  } as const;
  type Name = keyof typeof registers;

  afterEach(() => {
    for (const id of Object.values(registers)) vi.doUnmock(id);
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function builtLoader(failing: readonly Name[] = []) {
    vi.stubGlobal("CHECKOUT_KIT_SHOPIFY_CHECKOUT_CHUNK", failingModule("shopify-checkout"));
    vi.stubGlobal("CHECKOUT_KIT_SHOP_PAY_CHUNK", failingModule("shop-pay"));
    const staticImports: Record<Name, number> = { "shopify-checkout": 0, "shop-pay": 0 };
    for (const name of Object.keys(registers) as Name[]) {
      vi.doMock(registers[name], () => {
        staticImports[name] += 1;
        if (failing.includes(name)) {
          throw new TypeError("Failed to fetch dynamically imported module");
        }
        return {};
      });
    }
    const loader = await import("./cdn-loader");
    return { loader, staticImports };
  }

  it("loads every component in one call through its static import", async () => {
    const { loader, staticImports } = await builtLoader();

    await loader.loadComponents(["shopify-checkout", "shop-pay"]);

    expect(staticImports).toEqual({ "shopify-checkout": 1, "shop-pay": 1 });
  });

  it("loads a later component through its static import after another one loaded", async () => {
    const { loader, staticImports } = await builtLoader();

    await loader.loadComponents(["shopify-checkout"]);
    await loader.loadComponents(["shop-pay"]);

    expect(staticImports).toEqual({ "shopify-checkout": 1, "shop-pay": 1 });
  });

  it("never repeats a component's static import once it has been tried", async () => {
    const { loader, staticImports } = await builtLoader(["shop-pay"]);

    await expect(loader.loadComponents(["shop-pay"])).rejects.toThrow("shop-pay retry URL failed");
    await expect(loader.loadComponents(["shop-pay"])).rejects.toThrow("shop-pay retry URL failed");
    await loader.loadComponents(["shopify-checkout"]);

    expect(staticImports).toEqual({ "shopify-checkout": 1, "shop-pay": 1 });
  });
});
