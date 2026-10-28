import { expect, it, vi } from "vitest";
it("keeps the private update label bounded and out of standard telemetry", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetch);
  vi.stubEnv("DEV", false);
  vi.resetModules();
  try {
    const { createTelemetry, telemetryProtocolMethod } =
      await import("@shopify/checkout-kit-core/checkout/telemetry");
    const preview = createTelemetry(["ec.update"]);
    preview.recordProtocolDecodeError({
      method: telemetryProtocolMethod("ec.update", ["ec.update"]),
      failureType: "params",
    });
    await preview.flush();
    expect(fetch.mock.calls[0]![1].body).toContain("ec.update");
    fetch.mockClear();
    const standard = createTelemetry();
    standard.recordProtocolDecodeError({ method: "ec.update", failureType: "params" });
    await standard.flush();
    expect(fetch.mock.calls[0]![1].body).not.toContain("ec.update");
    expect(telemetryProtocolMethod("arbitrary input", ["ec.update"])).toBe("unknown");
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
