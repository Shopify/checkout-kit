import { afterEach, describe, expect, it, vi } from "vitest";

describe("accelerated checkout server import", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not require browser custom-element globals during module evaluation", async () => {
    vi.stubGlobal("HTMLElement", undefined);
    vi.stubGlobal("customElements", undefined);
    vi.resetModules();

    await expect(import("./wallets-index")).resolves.toEqual(
      expect.objectContaining({ ShopifyAcceleratedCheckoutButtons: expect.any(Function) }),
    );
  });
});
