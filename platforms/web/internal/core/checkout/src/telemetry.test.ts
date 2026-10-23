import type { CheckoutKitTelemetry } from "@shopify/checkout-kit-telemetry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("checkout telemetry factory", () => {
  const clients: CheckoutKitTelemetry[] = [];
  const log = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_CK_TELEMETRY", undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    log.mockClear();
    vi.spyOn(console, "info").mockImplementation(log);
  });

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.shutdown({ discardPending: true })));
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([undefined, "console"])("keeps dev telemetry local with mode %s", async (mode) => {
    vi.stubEnv("VITE_CK_TELEMETRY", mode);
    const { createTelemetry } = await import("./telemetry");
    const client = createTelemetry();
    clients.push(client);
    client.recordNavigationDuration({ milliseconds: 42, result: "success", preloaded: false });

    await expect(client.flush()).resolves.toBe(true);

    expect(fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "[Checkout Kit telemetry]",
      expect.objectContaining({ resourceMetrics: expect.any(Array) }),
    );
  });

  it.each([
    [true, "production"],
    [false, undefined],
    [false, "console"],
    [false, "production"],
  ] as const)("reports to production with DEV=%s and mode=%s", async (dev, telemetryMode) => {
    vi.stubEnv("DEV", dev);
    vi.stubEnv("VITE_CK_TELEMETRY", telemetryMode);
    const { createTelemetry } = await import("./telemetry");
    const client = createTelemetry();
    clients.push(client);
    client.recordNavigationDuration({ milliseconds: 42, result: "success", preloaded: false });

    await expect(client.flush()).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://otlp-http-production.shopifysvc.com/v1/metrics",
      expect.objectContaining({ method: "POST" }),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it("exports locally on its timer and preserves protocol label filtering", async () => {
    vi.useFakeTimers();
    const { createTelemetry } = await import("./telemetry");
    const client = createTelemetry(["custom.update"]);
    clients.push(client);
    client.start();
    client.recordProtocolDecodeError({ method: "custom.update", failureType: "params" });
    client.recordProtocolDecodeError({ method: "untrusted.value", failureType: "params" });

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.stringify(log.mock.calls[0]?.[1]);
    expect(payload).toContain('"stringValue":"custom.update"');
    expect(payload).toContain('"stringValue":"unknown"');
    expect(payload).not.toContain("untrusted.value");
  });

  it("restores the dev default after removing a test override", async () => {
    const { createTelemetry, overrideTelemetryFactoryForTesting } = await import("./telemetry");
    const overriddenClient = createTelemetry();
    clients.push(overriddenClient);
    const factory = vi.fn(() => overriddenClient);
    overrideTelemetryFactoryForTesting(factory);
    expect(createTelemetry(["custom.update"])).toBe(overriddenClient);
    expect(factory).toHaveBeenCalledWith(["custom.update"], undefined);

    overrideTelemetryFactoryForTesting(undefined);
    const client = createTelemetry();
    clients.push(client);
    expect(client).not.toBe(overriddenClient);
    client.recordNavigationRetry({ reason: "timeout", result: "started" });
    await client.flush();

    expect(fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
  });
});
