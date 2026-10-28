import {describe, expect, it, vi} from 'vitest';

import {createCheckoutKitTelemetryForTesting} from '../src/index';
import {CATALOG_METRIC_NAMES, type RecordingMeasurement} from '../src/recording';

function createTelemetry() {
  const fetch = vi.fn().mockResolvedValue({ok: true});
  const telemetry = createCheckoutKitTelemetryForTesting({
    sdkVersion: '1.2.3',
    fetch,
    now: () => BigInt(1_000_000),
  });
  const metrics = async () => {
    await telemetry.flush();
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    return body.resourceMetrics[0].scopeMetrics[0].metrics;
  };
  return {fetch, telemetry, metrics};
}

function labels(dataPoint: {
  attributes: Array<{key: string; value: {stringValue?: string; boolValue?: boolean}}>;
}): Record<string, string | boolean | undefined> {
  return Object.fromEntries(
    dataPoint.attributes.map(({key, value}) => [key, value.stringValue ?? value.boolValue]),
  );
}

describe('record', () => {
  it('records a histogram with its own product and the client platform', async () => {
    const {telemetry, metrics} = createTelemetry();

    telemetry.record({
      type: 'histogram',
      name: 'checkout_kit_widget_load_ms',
      value: 120,
      unit: 'ms',
      attributes: {surface: 'cart'},
      product: 'accelerated_checkouts',
    });

    const [metric] = await metrics();
    expect(metric).toMatchObject({name: 'checkout_kit_widget_load_ms', unit: 'ms'});
    expect(metric.histogram.dataPoints[0]).toMatchObject({count: '1', sum: 120});
    expect(labels(metric.histogram.dataPoints[0])).toEqual({
      surface: 'cart',
      product: 'accelerated_checkouts',
      platform: 'web',
    });
  });

  it('records a counter and keeps the client product on its own metrics', async () => {
    const {telemetry, metrics} = createTelemetry();

    telemetry.record({
      type: 'counter',
      name: 'checkout_kit_widget_shown',
      attributes: {},
      product: 'accelerated_checkouts',
    });
    telemetry.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});

    const products = Object.fromEntries(
      (await metrics()).map((metric: {name: string; sum: {dataPoints: any[]}}) => [
        metric.name,
        labels(metric.sum.dataPoints[0]).product,
      ]),
    );
    expect(products).toEqual({
      checkout_kit_widget_shown: 'accelerated_checkouts',
      checkout_kit_error: 'checkout_kit',
    });
  });

  it('drops histogram values that are not finite and non-negative', async () => {
    const {telemetry, metrics} = createTelemetry();

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 450]) {
      telemetry.record({
        type: 'histogram',
        name: 'checkout_kit_widget_load_ms',
        value,
        unit: 'ms',
        attributes: {},
        product: 'accelerated_checkouts',
      });
    }

    const [metric] = await metrics();
    expect(metric.histogram.dataPoints[0]).toMatchObject({count: '2', min: 0, max: 450});
  });

  it('ignores measurements after shutdown', async () => {
    const {fetch, telemetry} = createTelemetry();
    await telemetry.shutdown();

    telemetry.record({
      type: 'counter',
      name: 'checkout_kit_widget_shown',
      attributes: {},
      product: 'accelerated_checkouts',
    });

    await telemetry.flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops reserved names that get past the types', async () => {
    const {fetch, telemetry} = createTelemetry();
    const measurement: RecordingMeasurement = {
      type: 'counter',
      name: 'checkout_kit_error',
      attributes: {},
      product: 'accelerated_checkouts',
    };

    // @ts-expect-error A name widened to the prefix could be reserved.
    telemetry.record(measurement);

    await telemetry.flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reserves every metric name the client records itself', async () => {
    const {telemetry, metrics} = createTelemetry();
    telemetry.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});
    telemetry.recordProtocolDecodeError({method: 'ec.start', failureType: 'params'});
    telemetry.recordNavigationRetry({reason: 'timeout', result: 'started'});
    telemetry.recordNavigationDuration({milliseconds: 1, result: 'success', preloaded: false});
    telemetry.recordReadyDuration({milliseconds: 1, result: 'ready', preloaded: false});

    const names = (await metrics()).map((metric: {name: string}) => metric.name);
    expect([...names].sort()).toEqual([...CATALOG_METRIC_NAMES].sort());
  });

  it('accepts only prefixed, unreserved names and millisecond histograms', () => {
    const {telemetry: client} = createTelemetry();

    client.record({
      type: 'counter',
      // @ts-expect-error Metric names share the checkout_kit_ prefix.
      name: 'widget_shown',
      attributes: {},
      product: 'checkout_kit',
    });
    client.record({
      type: 'histogram',
      name: 'checkout_kit_widget_bytes',
      value: 1,
      // @ts-expect-error Histogram buckets are in milliseconds.
      unit: 'By',
      attributes: {},
      product: 'checkout_kit',
    });
    client.record({
      type: 'counter',
      // @ts-expect-error Names the client records itself are reserved.
      name: 'checkout_kit_navigation_duration_ms',
      attributes: {},
      product: 'checkout_kit',
    });
    const name = Math.random() > 0.5 ? 'checkout_kit_error' : 'checkout_kit_widget_shown';
    client.record({
      type: 'counter',
      // @ts-expect-error A union that includes a reserved name is rejected too.
      name,
      attributes: {},
      product: 'checkout_kit',
    });
    const componentName: 'checkout_kit_widget_shown' | 'checkout_kit_widget_hidden' =
      Math.random() > 0.5 ? 'checkout_kit_widget_shown' : 'checkout_kit_widget_hidden';
    // A component's own name union is accepted.
    client.record({type: 'counter', name: componentName, attributes: {}, product: 'checkout_kit'});
  });
});
