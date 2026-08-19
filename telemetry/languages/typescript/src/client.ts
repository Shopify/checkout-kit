import {
  buildOtlpPayload,
  DEFAULT_ENDPOINT,
  type Attributes,
  type Measurement,
} from './otlp';
import {toProtocolMethod} from './protocol-method';
import type {
  CheckoutKitTelemetry as CheckoutKitTelemetryClient,
  CheckoutKitTelemetryTestingOptions,
  FlushOptions,
  ShutdownOptions,
  TelemetryErrorMetric,
  TelemetryFetch,
  TelemetryNavigationDurationMetric,
  TelemetryNavigationRetryMetric,
  TelemetryPlatform,
  TelemetryProtocolDecodeErrorMetric,
  TelemetryProduct,
} from './types';

const DEFAULT_EXPORT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_PENDING_MEASUREMENTS = 128;
const MAX_EXPORT_BACKOFF_MS = 15 * 60_000;
const MAX_EXPORT_BACKOFF_EXPONENT = 4;

class DefaultCheckoutKitTelemetry implements CheckoutKitTelemetryClient {
  readonly #sdkVersion: string;
  readonly #product: TelemetryProduct;
  readonly #platform: TelemetryPlatform;
  readonly #endpoint: string;
  readonly #exportIntervalMs: number;
  readonly #maxPendingMeasurements: number;
  readonly #fetch: TelemetryFetch;
  readonly #now: () => bigint;

  #measurements: Measurement[] = [];
  #timer: ReturnType<typeof setInterval> | undefined;
  #flushInProgress: Promise<boolean> | undefined;
  #consecutiveExportFailures = 0;
  #nextExportAllowedAtMs = 0;
  #activeRequest: AbortController | undefined;
  #stopped = false;

  constructor(options: CheckoutKitTelemetryTestingOptions) {
    this.#sdkVersion = options.sdkVersion;
    this.#product = options.product ?? 'checkout_kit';
    this.#platform = options.platform ?? 'web';
    this.#endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.#exportIntervalMs =
      options.exportIntervalMs ?? DEFAULT_EXPORT_INTERVAL_MS;
    this.#maxPendingMeasurements = Math.max(
      1,
      options.maxPendingMeasurements ?? DEFAULT_MAX_PENDING_MEASUREMENTS,
    );
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.#now =
      options.now ?? (() => BigInt(Date.now()) * BigInt(1_000_000));
  }

  start(): void {
    if (this.#stopped || this.#timer || this.#exportIntervalMs <= 0) {
      return;
    }
    this.#timer = setInterval(() => void this.flush(), this.#exportIntervalMs);
  }

  recordError(metric: TelemetryErrorMetric): void {
    this.#recordCounter('checkout_kit_error', this.#attributes({
      category: metric.category,
      stage: metric.stage,
      code: metric.code,
      retryable: metric.retryable,
      is_retry: metric.isRetry ?? false,
    }));
  }

  recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric): void {
    this.#recordCounter('checkout_kit_protocol_decode_error', this.#attributes({
      method: toProtocolMethod(metric.method),
      failure_type: metric.failureType,
    }));
  }

  recordNavigationRetry(metric: TelemetryNavigationRetryMetric): void {
    this.#recordCounter('checkout_kit_navigation_retry', this.#attributes({
      reason: metric.reason,
      result: metric.result,
    }));
  }

  recordNavigationDuration(metric: TelemetryNavigationDurationMetric): void {
    if (!Number.isFinite(metric.milliseconds) || metric.milliseconds < 0) return;
    this.#record({
      type: 'histogram',
      name: 'checkout_kit_navigation_duration_ms',
      value: metric.milliseconds,
      unit: 'ms',
      attributes: this.#attributes({
        result: metric.result,
        preloaded: metric.preloaded,
      }),
      timeUnixNano: this.#now(),
    });
  }

  flush(options: FlushOptions = {}, ignoreBackoff = false): Promise<boolean> {
    if (this.#stopped) return Promise.resolve(false);
    const inFlight = this.#flushInProgress;
    if (inFlight) {
      if (this.#measurements.length === 0) return inFlight;
      // A keepalive flush cannot wait behind an in-flight export: the page
      // may be torn down before that request settles. Start it right away
      // alongside the ordinary export.
      if (options.keepalive === true) {
        const measurements = this.#measurements;
        this.#measurements = [];
        return this.#send(measurements, options);
      }
      return inFlight.then(async (inFlightSucceeded) => {
        if (this.#stopped) return false;
        const queuedSucceeded = await this.flush(options, ignoreBackoff);
        return inFlightSucceeded && queuedSucceeded;
      });
    }
    if (this.#measurements.length === 0) {
      return Promise.resolve(true);
    }
    // A keepalive flush is a page-terminal moment (pagehide/unload): skipping
    // it because of backoff would silently drop the buffered measurements.
    const bypassBackoff = ignoreBackoff || options.keepalive === true;
    if (!bypassBackoff && Date.now() < this.#nextExportAllowedAtMs) {
      return Promise.resolve(false);
    }
    const measurements = this.#measurements;
    this.#measurements = [];

    this.#flushInProgress = this.#send(measurements, options).finally(() => {
      this.#flushInProgress = undefined;
    });
    return this.#flushInProgress;
  }

  async shutdown(options: ShutdownOptions = {}): Promise<boolean> {
    if (this.#stopped) return true;
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
    if (options.discardPending) {
      this.#stopped = true;
      this.#measurements = [];
      this.#activeRequest?.abort();
      if (this.#flushInProgress) await this.#flushInProgress;
      return true;
    }

    const inFlight = this.#flushInProgress;
    const inFlightSucceeded = inFlight ? await inFlight : true;
    const flushed = await this.flush(options, true);
    this.#stopped = true;
    return inFlightSucceeded && flushed;
  }

  #recordCounter(name: string, attributes: Attributes): void {
    this.#record({
      type: 'counter',
      name,
      attributes,
      timeUnixNano: this.#now(),
    });
  }

  #attributes(attributes: Attributes): Attributes {
    return {
      ...attributes,
      product: this.#product,
      platform: this.#platform,
    };
  }

  #record(measurement: Measurement): void {
    if (this.#stopped) return;
    if (this.#measurements.length >= this.#maxPendingMeasurements) return;
    this.#measurements.push(measurement);
  }

  async #send(
    measurements: Measurement[],
    options: FlushOptions,
  ): Promise<boolean> {
    const controller = new AbortController();
    // A keepalive request must survive page teardown, so it is never the
    // abortable active request; it must also not displace an ordinary
    // export that shutdown may still need to abort.
    if (options.keepalive !== true) {
      this.#activeRequest = controller;
    }
    try {
      const response = await this.#fetch(this.#endpoint, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(
          buildOtlpPayload({
            sdkVersion: this.#sdkVersion,
            measurements,
          }),
        ),
        keepalive: options.keepalive ?? false,
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      const succeeded = response.ok;
      if (!this.#stopped) {
        if (!succeeded) this.#restoreMeasurements(measurements);
        this.#updateExportBackoff(succeeded);
      }
      return succeeded;
    } catch {
      if (!this.#stopped) {
        this.#restoreMeasurements(measurements);
        this.#updateExportBackoff(false);
      }
      return false;
    } finally {
      if (this.#activeRequest === controller) this.#activeRequest = undefined;
    }
  }

  #updateExportBackoff(succeeded: boolean): void {
    if (succeeded) {
      this.#consecutiveExportFailures = 0;
      this.#nextExportAllowedAtMs = 0;
      return;
    }
    this.#consecutiveExportFailures += 1;
    const exponent = Math.min(
      this.#consecutiveExportFailures - 1,
      MAX_EXPORT_BACKOFF_EXPONENT,
    );
    const backoff = Math.min(
      this.#exportIntervalMs * 2 ** exponent,
      MAX_EXPORT_BACKOFF_MS,
    );
    this.#nextExportAllowedAtMs = Date.now() + backoff;
  }

  #restoreMeasurements(measurements: Measurement[]): void {
    this.#measurements = [...measurements, ...this.#measurements].slice(
      0,
      this.#maxPendingMeasurements,
    );
  }
}

export function createCheckoutKitTelemetry(
  sdkVersion: string,
): CheckoutKitTelemetryClient {
  return new DefaultCheckoutKitTelemetry({sdkVersion});
}

export function createCheckoutKitTelemetryForTesting(
  options: CheckoutKitTelemetryTestingOptions,
): CheckoutKitTelemetryClient {
  return new DefaultCheckoutKitTelemetry(options);
}
