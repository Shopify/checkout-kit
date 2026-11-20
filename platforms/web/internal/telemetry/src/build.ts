import {
  createCheckoutKitTelemetry,
  createCheckoutKitTelemetryForTesting,
} from './client';
import type {CheckoutKitTelemetry, CheckoutKitTelemetryOptions} from './types';

/** Where a build sends its telemetry. */
export type TelemetryDestination = 'production' | 'console';

const CONSOLE_EXPORT_INTERVAL_MS = 1000;

/**
 * The rule every Web package follows. A build reports to production, except source that a dev
 * server serves and a build made with `VITE_CK_TELEMETRY=console`, which log to the console.
 * `VITE_CK_TELEMETRY=production` makes any build report. Vite replaces both values, so a
 * release build keeps only the client that reports.
 */
const destination: TelemetryDestination =
  import.meta.env.VITE_CK_TELEMETRY === 'production' ||
  (!import.meta.env.DEV && import.meta.env.VITE_CK_TELEMETRY !== 'console')
    ? 'production'
    : 'console';

/** Where this build sends telemetry. */
export function telemetryDestination(): TelemetryDestination {
  return destination;
}

// Keeps the normal aggregation and label filtering, and logs each export instead of sending it.
function createConsoleTelemetry(
  sdkVersion: string,
  options: CheckoutKitTelemetryOptions = {},
): CheckoutKitTelemetry {
  return createCheckoutKitTelemetryForTesting({
    ...options,
    sdkVersion,
    exportIntervalMs: CONSOLE_EXPORT_INTERVAL_MS,
    fetch: (_url, init) => {
      console.info('[Checkout Kit telemetry]', JSON.parse(String(init.body)));
      return Promise.resolve({ok: true});
    },
  });
}

/**
 * Creates the client for this build: one that reports, or one that logs each export. It is the
 * factory itself, not a wrapper, so a release build ships `createCheckoutKitTelemetry` alone.
 */
export const createBuildTelemetry: (
  sdkVersion: string,
  options?: CheckoutKitTelemetryOptions,
) => CheckoutKitTelemetry =
  destination === 'production' ? createCheckoutKitTelemetry : createConsoleTelemetry;
