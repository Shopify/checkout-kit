import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortableWalletsRuntime,
  resetPortableWalletsCache,
  type PortableWalletsFactory,
} from "./wallets-pw-loader";

afterEach(() => {
  resetPortableWalletsCache();
});

function fakeFactory(): PortableWalletsFactory {
  return {
    createChild: vi.fn(),
    createCheckoutClient: vi.fn(),
    createDatasource: vi.fn(),
    createSurfaceAdapter: vi.fn(),
    resolveCartContext: vi.fn(),
    createProductCart: vi.fn(),
  };
}

describe("getPortableWalletsRuntime", () => {
  it("calls the loader with the bridge URL and returns the factory", async () => {
    const factory = fakeFactory();
    const loader = vi.fn().mockResolvedValue({
      createPortableWalletsRuntime: () => factory,
    });

    const result = await getPortableWalletsRuntime(loader, "https://example.com/pw.js");

    expect(loader).toHaveBeenCalledWith("https://example.com/pw.js");
    expect(result).toBe(factory);
  });

  it("caches the factory after the first load", async () => {
    const factory = fakeFactory();
    const loader = vi.fn().mockResolvedValue({
      createPortableWalletsRuntime: () => factory,
    });

    const first = await getPortableWalletsRuntime(loader, "https://x.com/pw.js");
    const second = await getPortableWalletsRuntime(loader, "https://x.com/pw.js");

    expect(loader).toHaveBeenCalledOnce();
    expect(first).toBe(second);
  });

  it("deduplicates concurrent loads", async () => {
    const factory = fakeFactory();
    const loader = vi.fn().mockResolvedValue({
      createPortableWalletsRuntime: () => factory,
    });

    const [a, b] = await Promise.all([
      getPortableWalletsRuntime(loader, "https://x.com/pw.js"),
      getPortableWalletsRuntime(loader, "https://x.com/pw.js"),
    ]);

    expect(loader).toHaveBeenCalledOnce();
    expect(a).toBe(b);
  });

  it("allows a retry after a failed runtime import", async () => {
    const factory = fakeFactory();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("proxy restarting"))
      .mockResolvedValueOnce({ createPortableWalletsRuntime: () => factory });

    await expect(getPortableWalletsRuntime(loader, "https://x.com/pw.js")).rejects.toThrow(
      "proxy restarting",
    );
    await expect(getPortableWalletsRuntime(loader, "https://x.com/pw.js")).resolves.toBe(factory);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("resetPortableWalletsCache allows a fresh load", async () => {
    const f1 = fakeFactory();
    const f2 = fakeFactory();
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ createPortableWalletsRuntime: () => f1 })
      .mockResolvedValueOnce({ createPortableWalletsRuntime: () => f2 });

    const first = await getPortableWalletsRuntime(loader, "https://x.com/pw.js");
    resetPortableWalletsCache();
    const second = await getPortableWalletsRuntime(loader, "https://x.com/pw.js");

    expect(loader).toHaveBeenCalledTimes(2);
    expect(first).toBe(f1);
    expect(second).toBe(f2);
  });
});
