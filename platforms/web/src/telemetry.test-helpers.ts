import {
  createCheckoutKitTelemetryForTesting,
  type CheckoutKitTelemetry,
} from "@shopify/checkout-kit-telemetry";
import { onTestFinished } from "vitest";

import { overrideTelemetryFactoryForTesting } from "./telemetry";

// Stub the transport so an unmocked flush can never reach the
// production OTLP endpoint from a test run.
export function createTestTelemetry(): CheckoutKitTelemetry {
  return createCheckoutKitTelemetryForTesting({
    sdkVersion: "test",
    fetch: () => Promise.resolve({ ok: true, status: 200 }),
  });
}

export function installTestTelemetryFactory(): void {
  overrideTelemetryFactoryForTesting(createTestTelemetry);
}

export function mockTelemetry(): CheckoutKitTelemetry {
  const telemetry = createTestTelemetry();
  overrideTelemetryFactoryForTesting(() => telemetry);
  onTestFinished(installTestTelemetryFactory);
  return telemetry;
}
