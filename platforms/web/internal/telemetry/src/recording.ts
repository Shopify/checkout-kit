import type {Attributes} from './otlp';
import type {TelemetryProduct} from './types';

/** A metric a component records itself. The client adds the platform label and the timestamp. */
export type RecordingMeasurement = (
  | {type: 'counter'}
  // Histogram buckets are fixed millisecond bounds.
  | {type: 'histogram'; value: number; unit: 'ms'}
) & {
  name: `checkout_kit_${string}`;
  attributes: Attributes;
  product: TelemetryProduct;
};

/** Names the client records itself. Components can't record under them. */
export const CATALOG_METRIC_NAMES = [
  'checkout_kit_error',
  'checkout_kit_protocol_decode_error',
  'checkout_kit_navigation_retry',
  'checkout_kit_navigation_duration_ms',
  'checkout_kit_ready_duration_ms',
] as const;

export type CatalogMetricName = (typeof CATALOG_METRIC_NAMES)[number];

/**
 * Rejects a name that is or could be reserved, including a union that contains one and a name
 * widened to `checkout_kit_${string}`.
 */
export type UnreservedMeasurement<Name extends RecordingMeasurement['name']> =
  RecordingMeasurement & {
    name: [Extract<CatalogMetricName, Name>] extends [never] ? Name : never;
  };

const catalogMetricNames: ReadonlySet<string> = new Set(CATALOG_METRIC_NAMES);

export function isCatalogMetricName(name: string): boolean {
  return catalogMetricNames.has(name);
}
