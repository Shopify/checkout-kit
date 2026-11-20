import {
  createBuildTelemetry,
  toProtocolMethod,
  type CheckoutKitTelemetry,
} from "@shopify/checkout-kit-telemetry";

import { CK_VERSION } from "./version";

export type { CheckoutKitTelemetry, RecordingMeasurement } from "@shopify/checkout-kit-telemetry";

const defaultTelemetryFactory = (
  protocolMethods: readonly string[],
  product?: string,
): CheckoutKitTelemetry => createBuildTelemetry(CK_VERSION, { protocolMethods, product });

let telemetryFactory = defaultTelemetryFactory;

export function createTelemetry(
  protocolMethods: readonly string[] = [],
  product?: string,
): CheckoutKitTelemetry {
  return telemetryFactory(protocolMethods, product);
}

export function overrideTelemetryFactoryForTesting(
  factory:
    | ((protocolMethods: readonly string[], product?: string) => CheckoutKitTelemetry)
    | undefined,
): void {
  telemetryFactory = factory ?? defaultTelemetryFactory;
}

export function telemetryProtocolMethod(
  method: string,
  protocolMethods: readonly string[] = [],
): string {
  return toProtocolMethod(method, protocolMethods);
}
