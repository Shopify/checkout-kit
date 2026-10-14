export const DEFAULT_ENDPOINT =
  'https://otlp-http-production.shopifysvc.com/v1/metrics';

export const INSTRUMENTATION_NAME = 'checkout-kit-telemetry';

export type AttributeValue = string | boolean;
export type Attributes = Record<string, AttributeValue>;

export interface CounterMeasurement {
  type: 'counter';
  name: string;
  attributes: Attributes;
  timeUnixNano: bigint;
}

export interface HistogramMeasurement {
  type: 'histogram';
  name: string;
  value: number;
  unit: string;
  attributes: Attributes;
  timeUnixNano: bigint;
}

export type Measurement = CounterMeasurement | HistogramMeasurement;

interface PayloadOptions {
  sdkVersion: string;
  measurements: Measurement[];
}

const HISTOGRAM_BOUNDS = [100, 250, 500, 1_000, 2_500, 5_000, 10_000, 30_000];

export function buildOtlpPayload({
  sdkVersion,
  measurements,
}: PayloadOptions): Record<string, unknown> {
  const metrics = groupMeasurements(measurements).map(buildMetric);

  return {
    resourceMetrics: [
      {
        resource: {
          attributes: encodeAttributes({
            'service.name': 'checkout-kit',
            'service.version': sdkVersion,
            'telemetry.sdk.language': 'webjs',
            'telemetry.sdk.name': INSTRUMENTATION_NAME,
            'telemetry.sdk.version': sdkVersion,
          }),
        },
        scopeMetrics: [
          {
            scope: {
              name: INSTRUMENTATION_NAME,
              version: sdkVersion,
            },
            metrics,
          },
        ],
      },
    ],
  };
}

function groupMeasurements(measurements: Measurement[]): Measurement[][] {
  const groups = new Map<string, Measurement[]>();

  for (const measurement of measurements) {
    const key = JSON.stringify([
      measurement.type,
      measurement.name,
      sortedAttributeEntries(measurement.attributes),
    ]);
    const group = groups.get(key);
    if (group) {
      group.push(measurement);
    } else {
      groups.set(key, [measurement]);
    }
  }

  return [...groups.values()].sort((left, right) =>
    left[0]!.name.localeCompare(right[0]!.name),
  );
}

function buildMetric(group: Measurement[]): Record<string, unknown> {
  const first = group[0]!;
  const startTimeUnixNano = group[0]!.timeUnixNano.toString();
  const timeUnixNano = group[group.length - 1]!.timeUnixNano.toString();
  const attributes = encodeAttributes(first.attributes);

  if (first.type === 'counter') {
    return {
      name: first.name,
      sum: {
        aggregationTemporality: 1,
        isMonotonic: true,
        dataPoints: [
          {
            attributes,
            asInt: group.length.toString(),
            startTimeUnixNano,
            timeUnixNano,
          },
        ],
      },
    };
  }

  const values = group.map((measurement) =>
    measurement.type === 'histogram' ? measurement.value : 0,
  );
  const bucketCounts = Array.from({length: HISTOGRAM_BOUNDS.length + 1}, () => 0);
  for (const value of values) {
    const index = HISTOGRAM_BOUNDS.findIndex((bound) => value <= bound);
    bucketCounts[index === -1 ? bucketCounts.length - 1 : index]! += 1;
  }

  return {
    name: first.name,
    unit: first.unit,
    histogram: {
      aggregationTemporality: 1,
      dataPoints: [
        {
          attributes,
          bucketCounts: bucketCounts.map(String),
          count: values.length.toString(),
          explicitBounds: HISTOGRAM_BOUNDS,
          min: Math.min(...values),
          max: Math.max(...values),
          sum: values.reduce((sum, value) => sum + value, 0),
          startTimeUnixNano,
          timeUnixNano,
        },
      ],
    },
  };
}

function encodeAttributes(attributes: Attributes) {
  return sortedAttributeEntries(attributes).map(([key, value]) => ({
    key,
    value:
      typeof value === 'boolean'
        ? {boolValue: value}
        : {stringValue: value},
  }));
}

function sortedAttributeEntries(attributes: Attributes) {
  return Object.entries(attributes).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}
