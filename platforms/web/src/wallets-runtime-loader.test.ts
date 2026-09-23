import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPortableWalletsRuntimeLoader,
  PORTABLE_WALLETS_RUNTIME_API_VERSION,
  PortableWalletsRuntimeError,
  type PortableWalletsChild,
  type PortableWalletsRuntime,
  type PortableWalletsRuntimeModule,
} from "./wallets-runtime-loader";

const moduleUrl = "https://cdn.example.com/v1/portable-wallets.js";

function runtimeChild(): PortableWalletsChild {
  return Object.assign(document.createElement("div"), {
    configure: vi.fn(),
    setCheckoutClient: vi.fn(),
    setDatasource: vi.fn(),
    setSurfaceAdapter: vi.fn(),
    setTopLevelErrorHandler: vi.fn(),
    setRenderOutcomeHandler: vi.fn(),
    updateContext: vi.fn(),
    checkoutChanged: vi.fn(),
  });
}

function runtime(): PortableWalletsRuntime {
  return {
    createChild: vi.fn(() => runtimeChild()),
    createCheckoutClient: vi.fn(() => ({})),
    createDatasource: vi.fn(() => ({})),
    createSurfaceAdapter: vi.fn(() => ({})),
    resolveCartContext: vi.fn(async () => ({
      requiresShipping: true,
      hasSellingPlan: false,
    })),
    createProductCart: vi.fn(
      ({ getCart }) =>
        async (wallet: string): Promise<string> =>
          getCart({ wallet, signal: new AbortController().signal }),
    ),
  };
}

function runtimeModule(value = runtime()): PortableWalletsRuntimeModule {
  return {
    checkoutKitRuntimeApiVersion: PORTABLE_WALLETS_RUNTIME_API_VERSION,
    createPortableWalletsRuntime: () => value,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPortableWalletsRuntimeLoader", () => {
  it("does not import the private runtime until load is called", () => {
    const importer = vi.fn();

    createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    expect(importer).not.toHaveBeenCalled();
  });

  it("imports the configured module and returns its runtime", async () => {
    const expected = runtime();
    const importer = vi.fn().mockResolvedValue(runtimeModule(expected));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).resolves.toBe(expected);
    expect(importer).toHaveBeenCalledExactlyOnceWith(moduleUrl);
  });

  it("caches a compatible runtime after loading", async () => {
    const expected = runtime();
    const importer = vi.fn().mockResolvedValue(runtimeModule(expected));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    const first = await loader.load();
    const second = await loader.load();

    expect(importer).toHaveBeenCalledOnce();
    expect(first).toBe(expected);
    expect(second).toBe(expected);
  });

  it("deduplicates concurrent imports", async () => {
    const expected = runtime();
    const importer = vi.fn().mockResolvedValue(runtimeModule(expected));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    const first = loader.load();
    const second = loader.load();

    expect(first).toBe(second);
    await expect(first).resolves.toBe(expected);
    expect(importer).toHaveBeenCalledOnce();
  });

  it("allows a later import after a transient import failure", async () => {
    const expected = runtime();
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error("private module URL and transport details"))
      .mockResolvedValueOnce(runtimeModule(expected));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).rejects.toMatchObject({
      code: "runtime_import_failed",
      message: "The private wallet runtime is unavailable.",
    });
    await expect(loader.load()).resolves.toBe(expected);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it("does not expose an import failure message", async () => {
    const importer = vi.fn().mockRejectedValue(new Error("sensitive transport details"));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    const failure = await loader.load().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PortableWalletsRuntimeError);
    expect((failure as PortableWalletsRuntimeError).message).not.toContain(
      "sensitive transport details",
    );
    expect(failure).not.toHaveProperty("cause");
  });

  it("rejects an unsupported runtime API version", async () => {
    const importer = vi.fn().mockResolvedValue({
      ...runtimeModule(),
      checkoutKitRuntimeApiVersion: PORTABLE_WALLETS_RUNTIME_API_VERSION + 1,
    });
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).rejects.toMatchObject({ code: "runtime_incompatible" });
  });

  it("rejects a module without a runtime factory", async () => {
    const importer = vi.fn().mockResolvedValue({
      checkoutKitRuntimeApiVersion: PORTABLE_WALLETS_RUNTIME_API_VERSION,
    });
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).rejects.toMatchObject({ code: "runtime_incompatible" });
  });

  it("allows a retry after the runtime factory throws", async () => {
    const expected = runtime();
    const importer = vi
      .fn()
      .mockResolvedValueOnce({
        checkoutKitRuntimeApiVersion: PORTABLE_WALLETS_RUNTIME_API_VERSION,
        createPortableWalletsRuntime(): PortableWalletsRuntime {
          throw new Error("runtime initializing");
        },
      })
      .mockResolvedValueOnce(runtimeModule(expected));
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).rejects.toMatchObject({ code: "runtime_incompatible" });
    await expect(loader.load()).resolves.toBe(expected);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it.each([
    "createChild",
    "createCheckoutClient",
    "createDatasource",
    "createSurfaceAdapter",
    "resolveCartContext",
    "createProductCart",
  ] as const)("rejects a runtime without %s", async (missingMethod) => {
    const incomplete = { ...runtime() } as Record<string, unknown>;
    delete incomplete[missingMethod];
    const importer = vi.fn().mockResolvedValue({
      checkoutKitRuntimeApiVersion: PORTABLE_WALLETS_RUNTIME_API_VERSION,
      createPortableWalletsRuntime: () => incomplete,
    });
    const loader = createPortableWalletsRuntimeLoader({ moduleUrl, importer });

    await expect(loader.load()).rejects.toMatchObject({ code: "runtime_incompatible" });
  });

  it.each(["/relative/runtime.js", "http://cdn.example.com/runtime.js", "not a URL"])(
    "rejects a non-HTTPS module URL without exposing it: %s",
    (invalidUrl) => {
      expect(() =>
        createPortableWalletsRuntimeLoader({ moduleUrl: invalidUrl, importer: vi.fn() }),
      ).toThrowError("The private wallet runtime is unavailable.");
    },
  );
});
