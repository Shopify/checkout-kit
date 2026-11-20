import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {createCheckoutKitTelemetryForTesting} from '../src/client';
import type {CheckoutKitTelemetry} from '../src/types';

const SDK_VERSION = '1.2.3';
const OPTIONS = {
  product: 'accelerated_checkouts',
  protocolMethods: ['custom.update'],
} as const;

// Each kind of build, as Vite describes it: `import.meta.env.DEV` and `VITE_CK_TELEMETRY`.
const BUILDS = [
  ['a release build: npm and CDN', false, undefined, 'production'],
  ['an internal build: samples, local builds, test packages, `pnpm dev`', false, 'console', 'console'],
  ['any build made with VITE_CK_TELEMETRY=production', false, 'production', 'production'],
  ['a build made with an unknown value', false, 'staging', 'production'],
  ['the dev server and the test runner', true, undefined, 'console'],
  ['the dev server with VITE_CK_TELEMETRY=console', true, 'console', 'console'],
  ['the dev server with VITE_CK_TELEMETRY=production', true, 'production', 'production'],
  ['the dev server with an unknown value', true, 'staging', 'console'],
] as const;

function record(client: CheckoutKitTelemetry): void {
  client.recordError({category: 'http', stage: 'load', code: '5xx', retryable: true});
  client.recordProtocolDecodeError({method: 'custom.update', failureType: 'params'});
  client.recordProtocolDecodeError({method: 'untrusted.value', failureType: 'params'});
}

// What a client with the same options sends, from the testing client and a fake fetch.
async function expectedPayload(): Promise<unknown> {
  const fetch = vi.fn().mockResolvedValue({ok: true});
  const client = createCheckoutKitTelemetryForTesting({
    ...OPTIONS,
    sdkVersion: SDK_VERSION,
    fetch,
  });
  record(client);
  await client.flush();
  return JSON.parse(String(fetch.mock.calls[0]![1].body));
}

describe('build telemetry', () => {
  const clients: CheckoutKitTelemetry[] = [];
  const fetch = vi.fn();
  const log = vi.fn();

  // The rule reads the build's values when the module loads, so each case loads a fresh copy.
  async function loadBuild(dev: boolean, telemetry: string | undefined) {
    vi.stubEnv('DEV', dev);
    vi.stubEnv('VITE_CK_TELEMETRY', telemetry);
    vi.resetModules();
    return import('../src/index');
  }

  beforeEach(() => {
    vi.useFakeTimers({now: new Date('2026-01-01T00:00:00Z')});
    fetch.mockReset().mockResolvedValue({ok: true});
    vi.stubGlobal('fetch', fetch);
    log.mockReset();
    vi.spyOn(console, 'info').mockImplementation(log);
  });

  afterEach(async () => {
    await Promise.all(
      clients.splice(0).map((client) => client.shutdown({discardPending: true})),
    );
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(BUILDS)(
    'chooses the destination of %s',
    async (_build, dev, telemetry, destination) => {
      const {telemetryDestination} = await loadBuild(dev, telemetry);

      expect(telemetryDestination()).toBe(destination);
    },
  );

  it.each(BUILDS.filter(([, , , destination]) => destination === 'production'))(
    'reports %s to the production endpoint',
    async (_build, dev, telemetry) => {
      const {createBuildTelemetry} = await loadBuild(dev, telemetry);
      const client = createBuildTelemetry(SDK_VERSION, OPTIONS);
      clients.push(client);
      record(client);

      await expect(client.flush()).resolves.toBe(true);

      expect(log).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        'https://otlp-http-production.shopifysvc.com/v1/metrics',
        expect.objectContaining({
          method: 'POST',
          headers: {'content-type': 'application/json'},
          keepalive: false,
          referrerPolicy: 'no-referrer',
        }),
      );
      const [, init] = fetch.mock.calls[0]!;
      expect(JSON.parse(String(init.body))).toEqual(await expectedPayload());
    },
  );

  it.each(BUILDS.filter(([, , , destination]) => destination === 'console'))(
    'logs %s to the console and sends nothing',
    async (_build, dev, telemetry) => {
      const {createBuildTelemetry} = await loadBuild(dev, telemetry);
      const client = createBuildTelemetry(SDK_VERSION, OPTIONS);
      clients.push(client);
      record(client);

      await expect(client.flush()).resolves.toBe(true);

      expect(fetch).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledExactlyOnceWith(
        '[Checkout Kit telemetry]',
        await expectedPayload(),
      );
    },
  );

  it("logs a local build's exports every second", async () => {
    const {createBuildTelemetry} = await loadBuild(true, undefined);
    const client = createBuildTelemetry(SDK_VERSION, OPTIONS);
    clients.push(client);
    client.start();
    record(client);

    await vi.advanceTimersByTimeAsync(999);
    expect(log).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(log).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });
});
