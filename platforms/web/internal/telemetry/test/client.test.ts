import {describe, expect, it, vi} from 'vitest';

import {createCheckoutKitTelemetryForTesting} from '../src/client';

describe('CheckoutKitTelemetry', () => {
  it('aggregates matching counters into an OTLP delta sum', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const times = [BigInt(1_000_000), BigInt(2_000_000)];
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      product: 'accelerated_checkouts',
      fetch,
      now: () => times.shift()!,
    });

    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
      isRetry: true,
    });
    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
      isRetry: true,
    });

    await expect(telemetry.flush()).resolves.toBe(true);

    expect(fetch.mock.calls[0]![1].referrerPolicy).toBe('no-referrer');
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    const resourceAttributes = Object.fromEntries(
      body.resourceMetrics[0].resource.attributes.map(
        ({key, value}: {key: string; value: {stringValue: string}}) => [
          key,
          value.stringValue,
        ],
      ),
    );
    expect(resourceAttributes).toEqual({
      'service.name': 'checkout-kit',
      'service.version': '1.2.3',
      'telemetry.sdk.language': 'webjs',
      'telemetry.sdk.name': 'checkout-kit-telemetry',
      'telemetry.sdk.version': '1.2.3',
    });
    const metric = body.resourceMetrics[0].scopeMetrics[0].metrics[0];
    expect(metric.name).toBe('checkout_kit_error');
    expect(metric.sum).toMatchObject({
      aggregationTemporality: 1,
      isMonotonic: true,
      dataPoints: [
        {
          asInt: '2',
          startTimeUnixNano: '1000000',
          timeUnixNano: '2000000',
        },
      ],
    });
    expect(metric.sum.dataPoints[0].attributes).toContainEqual({
      key: 'product',
      value: {stringValue: 'accelerated_checkouts'},
    });
    expect(metric.sum.dataPoints[0].attributes).toContainEqual({
      key: 'platform',
      value: {stringValue: 'web'},
    });
    expect(metric.sum.dataPoints[0].attributes).not.toContainEqual(
      expect.objectContaining({key: 'integration'}),
    );
    expect(metric.sum.dataPoints[0].attributes).toContainEqual({
      key: 'is_retry',
      value: {boolValue: true},
    });
  });

  it('never includes raw error or protocol data in its API payload', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordProtocolDecodeError({
      method: 'ec.start',
      failureType: 'params',
    });
    await telemetry.flush();

    const body = fetch.mock.calls[0]![1].body as string;
    expect(body).not.toContain('checkoutUrl');
    expect(body).not.toContain('error.message');
    expect(body).toContain('checkout_kit_protocol_decode_error');
  });

  it('bounds pending measurements and isolates export failures', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('network unavailable'));
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      maxPendingMeasurements: 1,
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordNavigationRetry({reason: 'timeout', result: 'started'});
    telemetry.recordNavigationRetry({reason: 'dns', result: 'failed'});

    await expect(telemetry.flush()).resolves.toBe(false);
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    expect(body.resourceMetrics[0].scopeMetrics[0].metrics).toHaveLength(1);
  });

  it('clamps pending measurement capacity to one', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      maxPendingMeasurements: 0,
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordNavigationRetry({reason: 'timeout', result: 'started'});
    telemetry.recordNavigationRetry({reason: 'dns', result: 'failed'});

    await telemetry.flush();
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    const points = body.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints;
    expect(points[0].asInt).toBe('1');
  });

  it('normalizes unsupported protocol methods at runtime', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordProtocolDecodeError({
      method: 'attacker-controlled' as 'ec.start',
      failureType: 'params',
    });
    await telemetry.flush();

    expect(fetch.mock.calls[0]![1].body).toContain('unknown');
    expect(fetch.mock.calls[0]![1].body).not.toContain('attacker-controlled');
  });

  it('accepts methods added to the generated protocol catalog', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordProtocolDecodeError({
      method: 'ec.buyer.change',
      failureType: 'params',
    });
    await telemetry.flush();

    expect(fetch.mock.calls[0]![1].body).toContain('ec.buyer.change');
  });

  it('awaits an in-flight export during shutdown', async () => {
    let resolveFetch: ((value: {ok: boolean}) => void) | undefined;
    const fetch = vi.fn().mockImplementation(
      () => new Promise<{ok: boolean}>((resolve) => (resolveFetch = resolve)),
    );
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });
    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
    });

    void telemetry.flush();
    const shutdown = telemetry.shutdown();
    let completed = false;
    void shutdown.then(() => (completed = true));
    await Promise.resolve();
    expect(completed).toBe(false);
    resolveFetch?.({ok: true});
    await expect(shutdown).resolves.toBe(true);
  });

  it('discards pending work and makes lifecycle calls safe after shutdown', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });
    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
    });

    await expect(telemetry.shutdown({discardPending: true})).resolves.toBe(true);
    telemetry.start();
    await expect(telemetry.flush()).resolves.toBe(false);
    await expect(telemetry.shutdown()).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('backs off after an export failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const fetch = vi.fn().mockResolvedValue({ok: false});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      exportIntervalMs: 1_000,
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
    });
    await expect(telemetry.flush()).resolves.toBe(false);
    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
    });
    await expect(telemetry.flush()).resolves.toBe(false);

    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('bypasses backoff for the final shutdown flush', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ok: false}).mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });
    telemetry.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});
    await telemetry.flush();
    telemetry.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});

    await expect(telemetry.shutdown()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    const finalPayload = JSON.parse(fetch.mock.calls[1]![1].body as string);
    expect(finalPayload.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].asInt).toBe('2');
  });

  it('bypasses backoff for keepalive flushes', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ok: false}).mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });
    telemetry.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});
    await telemetry.flush();

    await expect(telemetry.flush()).resolves.toBe(false);
    await expect(telemetry.flush({keepalive: true})).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]![1].keepalive).toBe(true);
  });

  it('starts a keepalive export immediately when an ordinary export is active', async () => {
    let resolveFirstFetch: ((value: {ok: boolean}) => void) | undefined;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ok: boolean}>((resolve) => {
            resolveFirstFetch = resolve;
          }),
      )
      .mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordError({
      category: 'http',
      stage: 'load',
      code: '5xx',
      retryable: true,
    });
    const ordinaryFlush = telemetry.flush();
    telemetry.recordError({
      category: 'protocol',
      stage: 'message',
      code: 'unknown',
      retryable: false,
    });
    const terminalFlush = telemetry.flush({keepalive: true});

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]![1].keepalive).toBe(false);
    expect(fetch.mock.calls[1]![1].keepalive).toBe(true);
    const keepalivePayload = JSON.parse(fetch.mock.calls[1]![1].body as string);
    expect(
      keepalivePayload.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].asInt,
    ).toBe('1');
    await expect(terminalFlush).resolves.toBe(true);

    resolveFirstFetch?.({ok: true});
    await expect(ordinaryFlush).resolves.toBe(true);
  });

  it('records finite non-negative navigation durations only', async () => {
    const fetch = vi.fn().mockResolvedValue({ok: true});
    const telemetry = createCheckoutKitTelemetryForTesting({
      sdkVersion: '1.2.3',
      fetch,
      now: () => BigInt(1),
    });

    telemetry.recordNavigationDuration({
      milliseconds: Number.NaN,
      result: 'failure',
      preloaded: false,
    });
    telemetry.recordNavigationDuration({
      milliseconds: 450,
      result: 'success',
      preloaded: false,
    });

    await telemetry.flush({keepalive: true});
    const request = fetch.mock.calls[0]![1];
    const body = JSON.parse(request.body as string);
    const metric = body.resourceMetrics[0].scopeMetrics[0].metrics[0];
    expect(request.keepalive).toBe(true);
    expect(metric.histogram.dataPoints[0]).toMatchObject({
      count: '1',
      min: 450,
      max: 450,
      sum: 450,
    });
  });
});
