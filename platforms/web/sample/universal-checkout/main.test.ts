import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "@shopify/checkout-kit/shopify-universal-checkout";

import { SAMPLE_API_PATHS } from "../universal-session/api";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) =>
      String(input) === SAMPLE_API_PATHS.configuration
        ? json({ storeDomains: [], environments: ["production"] })
        : new Response("{}", { status: 404 }),
    ),
  );
  document.body.innerHTML = `<p id="checkout-kit-provenance"></p><main id="layout"></main>`;
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("starts the shared sample with <shopify-universal-checkout> and its own open button", async () => {
  await import("./main");
  await vi.advanceTimersByTimeAsync(0);

  expect(document.querySelector("#layout shopify-universal-checkout")).not.toBeNull();
  expect(document.querySelector("shop-pay")).toBeNull();
  expect(document.querySelector("#host-pay")?.textContent).toContain("Open Universal Checkout");
  expect(document.querySelector("input[name='button']")).toBeNull();
});
