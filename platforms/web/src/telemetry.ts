import {
  createCheckoutKitTelemetry,
  toProtocolMethod,
  type CheckoutKitTelemetry,
  type TelemetryProtocolMethod,
} from "@shopify/checkout-kit-telemetry";

import { CK_VERSION } from "./version";

export type { CheckoutKitTelemetry } from "@shopify/checkout-kit-telemetry";

let telemetryFactory = () => createCheckoutKitTelemetry(CK_VERSION);

export function createTelemetry(): CheckoutKitTelemetry {
  return telemetryFactory();
}

export function overrideTelemetryFactoryForTesting(
  factory: (() => CheckoutKitTelemetry) | undefined,
): void {
  telemetryFactory = factory ?? (() => createCheckoutKitTelemetry(CK_VERSION));
}

export function telemetryProtocolMethod(method: string): TelemetryProtocolMethod {
  return toProtocolMethod(method);
}
