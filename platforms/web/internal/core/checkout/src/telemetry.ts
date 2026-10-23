import {
  createCheckoutKitTelemetry,
  createCheckoutKitTelemetryForTesting,
  toProtocolMethod,
  type CheckoutKitTelemetry,
} from "@shopify/checkout-kit-telemetry";

import { CK_VERSION } from "./version";

export type { CheckoutKitTelemetry } from "@shopify/checkout-kit-telemetry";

function createConsoleTelemetry(
  protocolMethods: readonly string[],
  product?: string,
): CheckoutKitTelemetry {
  // Use the normal aggregation and label filtering with a local-only transport.
  return createCheckoutKitTelemetryForTesting({
    sdkVersion: CK_VERSION,
    protocolMethods,
    product,
    exportIntervalMs: 1000,
    fetch: (_url, init) => {
      // oxlint-disable-next-line no-console -- The dev transport intentionally logs instead of sending.
      console.info("[Checkout Kit telemetry]", JSON.parse(String(init.body)));
      return Promise.resolve({ ok: true });
    },
  });
}

// Vite builds keep production telemetry. Source served by the dev server stays
// local unless production reporting is explicitly requested.
const defaultTelemetryFactory =
  !import.meta.env.DEV || import.meta.env.VITE_CK_TELEMETRY === "production"
    ? (protocolMethods: readonly string[], product?: string) =>
        createCheckoutKitTelemetry(CK_VERSION, { protocolMethods, product })
    : createConsoleTelemetry;

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
