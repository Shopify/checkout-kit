import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckoutKitTelemetryForTesting } from "@shopify/checkout-kit-telemetry";

import "./register";
import { overrideTelemetryFactoryForTesting } from "@shopify/checkout-kit-core/checkout/telemetry";
import { installTestTelemetryFactory } from "@shopify/checkout-kit-core/checkout/testing";

const fetch = vi.fn();

function deferredResponse() {
  let resolve!: (response: { ok: boolean }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ ok: boolean }>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function exportedErrorCount(call: number): string {
  const init = fetch.mock.calls[call]![1] as RequestInit;
  const payload = JSON.parse(String(init.body)) as {
    resourceMetrics: {
      scopeMetrics: { metrics: { sum: { dataPoints: { asInt: string }[] } }[] }[];
    }[];
  };
  return payload.resourceMetrics[0]!.scopeMetrics[0]!.metrics[0]!.sum.dataPoints[0]!.asInt;
}

function connect() {
  const checkout = document.createElement("shopify-checkout");
  checkout.setAttribute("log-level", "none");
  // An invalid src makes open() record an error, with no popup or checkout page.
  checkout.setAttribute("src", "not-a-url");
  document.body.appendChild(checkout);
  return checkout;
}

// The element drops its client when it disconnects, so a later telemetry="false" cannot
// reach that client. The opt-out holds only if a stopping client sends nothing more.
describe("<shopify-checkout> telemetry turned off after disconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetch.mockReset();
    overrideTelemetryFactoryForTesting((protocolMethods, product) =>
      createCheckoutKitTelemetryForTesting({ sdkVersion: "test", protocolMethods, product, fetch }),
    );
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
    installTestTelemetryFactory();
  });

  it("sends nothing more when an export in flight at disconnect fails", async () => {
    const periodicExport = deferredResponse();
    fetch.mockImplementationOnce(() => periodicExport.promise).mockResolvedValue({ ok: true });
    const checkout = connect();
    checkout.open();
    await vi.advanceTimersByTimeAsync(60_000);
    checkout.open();

    checkout.remove();
    checkout.telemetry = false;
    const sentBeforeOptOut = fetch.mock.calls.length;
    periodicExport.reject(new TypeError("Failed to fetch"));
    await vi.advanceTimersByTimeAsync(120_000);
    window.dispatchEvent(new Event("pagehide"));

    expect(fetch).toHaveBeenCalledTimes(sentBeforeOptOut);
    expect(sentBeforeOptOut).toBe(2);
    expect(fetch.mock.calls[1]![1].keepalive).toBe(true);
    expect(exportedErrorCount(1)).toBe("1");
  });

  it("sends nothing more from the first client after a reconnect", async () => {
    const periodicExport = deferredResponse();
    fetch.mockImplementationOnce(() => periodicExport.promise).mockResolvedValue({ ok: true });
    const checkout = connect();
    checkout.open();
    await vi.advanceTimersByTimeAsync(60_000);
    checkout.open();
    checkout.remove();
    document.body.appendChild(checkout);
    checkout.open();

    checkout.telemetry = false;
    const sentBeforeOptOut = fetch.mock.calls.length;
    periodicExport.resolve({ ok: false });
    await vi.advanceTimersByTimeAsync(120_000);
    window.dispatchEvent(new Event("pagehide"));
    checkout.remove();

    expect(fetch).toHaveBeenCalledTimes(sentBeforeOptOut);
    expect(sentBeforeOptOut).toBe(2);
  });

  it("sends what is pending once, at disconnect, when no export is in flight", async () => {
    fetch.mockResolvedValue({ ok: true });
    const checkout = connect();
    checkout.open();

    checkout.remove();
    checkout.telemetry = false;
    await vi.advanceTimersByTimeAsync(120_000);
    window.dispatchEvent(new Event("pagehide"));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![1].keepalive).toBe(true);
    expect(exportedErrorCount(0)).toBe("1");
  });
});
