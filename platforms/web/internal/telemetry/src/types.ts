import type {
  CheckoutProtocolCatalogMethod,
  CheckoutProtocolRequestMethod,
} from '@shopify/checkout-kit-protocol';

import type {RecordingMeasurement, UnreservedMeasurement} from './recording';

export type TelemetryErrorCategory =
  | 'http'
  | 'navigation'
  | 'protocol'
  | 'render_process'
  | 'unknown';

export type TelemetryErrorStage =
  | 'initialization'
  | 'load'
  | 'message'
  | 'presentation';

export type TelemetryErrorCode =
  | '4xx'
  | '5xx'
  | 'blocked'
  | 'cancelled'
  | 'connection_lost'
  | 'cannot_connect'
  | 'dns'
  | 'invalid_url'
  | 'terminal_error'
  | 'timeout'
  | 'unknown';

export type TelemetryProtocolMethod =
  | CheckoutProtocolCatalogMethod
  | CheckoutProtocolRequestMethod
  | 'unknown';

export type TelemetryDecodeFailureType =
  | 'envelope'
  | 'params'
  | 'serialization'
  | 'unknown';

export type TelemetryNavigationRetryReason =
  | 'timeout'
  | 'connection_lost'
  | 'cannot_connect'
  | 'dns'
  | 'unknown';

export type TelemetryNavigationRetryResult =
  | 'started'
  | 'failed'
  | 'not_attempted';

export type TelemetryNavigationDurationResult = 'success' | 'failure';

export type TelemetryReadyDurationResult = 'ready' | 'not_ready';

export type TelemetryProduct =
  | 'checkout_kit'
  | 'accelerated_checkouts'
  | 'customer_auth';

export type TelemetryPlatform = 'web';

export interface TelemetryErrorMetric {
  category: TelemetryErrorCategory;
  stage: TelemetryErrorStage;
  code: TelemetryErrorCode;
  retryable: boolean;
  isRetry?: boolean;
}

export interface TelemetryProtocolDecodeErrorMetric {
  method: string;
  failureType: TelemetryDecodeFailureType;
}

export interface TelemetryNavigationRetryMetric {
  reason: TelemetryNavigationRetryReason;
  result: TelemetryNavigationRetryResult;
}

export interface TelemetryNavigationDurationMetric {
  milliseconds: number;
  result: TelemetryNavigationDurationResult;
  preloaded: boolean;
}

export interface TelemetryReadyDurationMetric {
  milliseconds: number;
  result: TelemetryReadyDurationResult;
  preloaded: boolean;
}

export interface CheckoutKitTelemetry {
  start(): void;
  recordError(metric: TelemetryErrorMetric): void;
  recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric): void;
  recordNavigationRetry(metric: TelemetryNavigationRetryMetric): void;
  recordNavigationDuration(metric: TelemetryNavigationDurationMetric): void;
  recordReadyDuration(metric: TelemetryReadyDurationMetric): void;
  /** Records a component's own metric, through the same export, limits and shutdown. */
  record<Name extends RecordingMeasurement['name']>(
    measurement: UnreservedMeasurement<Name>,
  ): void;
  flush(options?: FlushOptions): Promise<boolean>;
  shutdown(options?: ShutdownOptions): Promise<boolean>;
}

interface TelemetryResponse {
  ok: boolean;
}

export type TelemetryFetch = (
  url: string,
  init: RequestInit,
) => Promise<TelemetryResponse>;

export interface CheckoutKitTelemetryOptions {
  /** Additional fixed method labels owned by the calling protocol implementation. */
  protocolMethods?: readonly string[];
  /** A fixed product label owned by the calling implementation. Defaults to `checkout_kit`. */
  product?: TelemetryProduct | (string & {});
}

export interface CheckoutKitTelemetryTestingOptions extends CheckoutKitTelemetryOptions {
  sdkVersion: string;
  platform?: TelemetryPlatform;
  endpoint?: string;
  exportIntervalMs?: number;
  maxPendingMeasurements?: number;
  fetch?: TelemetryFetch;
  now?: () => bigint;
}

export interface FlushOptions {
  keepalive?: boolean;
}

export interface ShutdownOptions extends FlushOptions {
  discardPending?: boolean;
}
