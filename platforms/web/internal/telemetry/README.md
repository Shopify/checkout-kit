# @shopify/checkout-kit-telemetry

The shared Web telemetry client. It batches counters and histograms, adds the `product` and `platform` labels, and exports them as OTLP metrics. The metric catalog lives in [`platforms/shared/telemetry/contract/metrics.md`](../../../shared/telemetry/contract/metrics.md).

## Where a build sends telemetry

Release builds report to production. Every other build logs each export to the browser console and sends nothing. No label marks the kind of build: development traffic never reaches production unless a person asks for it, so a dashboard needs no filter for it.

`createBuildTelemetry` applies the rule. A package creates its client with it, and never reads `import.meta.env.DEV` or `VITE_CK_TELEMETRY` to choose a destination itself:

```ts
import {createBuildTelemetry} from '@shopify/checkout-kit-telemetry';

const client = createBuildTelemetry(CK_VERSION, {product: 'checkout_kit'});
```

The rule reads two values that Vite replaces when it serves or builds the source, so a release build keeps only the client that reports:

| Build | `import.meta.env.DEV` | `VITE_CK_TELEMETRY` | Telemetry |
| --- | --- | --- | --- |
| Release: the npm package and the CDN, prereleases included | `false` | not set | Reports to production |
| Internal: sample builds, local builds, test packages and `pnpm dev` | `false` | `console` | Logs to the console |
| The dev server and unit tests | `true` | not set | Logs to the console |
| Any build started with `VITE_CK_TELEMETRY=production` | either | `production` | Reports to production |

- An internal build's Vite config sets `VITE_CK_TELEMETRY` to `console` and lets no other environment value into client code. A sample build, a local build and `pnpm dev` set `production` when the person who starts them sets that, as [`sample/vite.config.ts`](../../sample/vite.config.ts) does, and as the package's [`vite.config.ts`](../../vite.config.ts) does for `pnpm dev` (`--mode watch`). A test package that others install always sets `console`. Any other value counts as not set.
- Set the value in the build's Vite config, not in a package script: a script that runs `VITE_CK_TELEMETRY=console vite build` overwrites the opt-in of the person who runs it.
- `VITE_CK_TELEMETRY=production` is for a run that must reach the endpoint, such as a check of an export end to end. Its exports carry the same labels and version as a release build's.
- Browser tests (`test/e2e`) load the release build with `telemetry="false"` and fail on any request outside the page, so they send nothing.
- A test store that loads a release build reports like a buyer's store. A test store that installs a test package logs.
- `telemetry="false"` turns telemetry off in every build.
- A sample that must know where its exports go reads `telemetryDestination()`.
- `pnpm verify` checks that the npm and CDN builds report to production.

## A component's own metrics

The client's catalog methods, such as `recordNavigationDuration`, cover the shared catalog. A component with metrics outside that catalog records them with `record`, on the client it already uses. They share the client's export, pending-measurement limit and shutdown.

Keep the names and labels in a typed telemetry adapter next to the component, and have the component call its methods rather than `record` directly. Give the adapter the component's client, from the same getter the catalog calls use, as in `this.#recorder?.recordError(…)`. The getter returns `undefined` when the merchant sets `telemetry="false"`, so the opt-out holds. Don't create a client of your own:

```ts
// components/my-component/src/telemetry.ts
import type {CheckoutKitTelemetry} from '@shopify/checkout-kit-core/checkout/telemetry';

type MetricName = 'checkout_kit_my_component_load_ms';

export class MyComponentTelemetry {
  readonly #client: CheckoutKitTelemetry;

  constructor(client: CheckoutKitTelemetry) {
    this.#client = client;
  }

  recordLoaded({surface, milliseconds}: {surface: 'cart' | 'product'; milliseconds: number}): void {
    this.#histogram('checkout_kit_my_component_load_ms', milliseconds, {surface});
  }

  #histogram(name: MetricName, value: number, attributes: Record<string, string>): void {
    this.#client.record({type: 'histogram', name, value, unit: 'ms', attributes, product: 'checkout_kit'});
  }
}
```

```ts
// components/my-component/src/my-component.ts
get #telemetry() {
  const client = this.#recorder;
  return client && (this.#telemetryAdapter ??= new MyComponentTelemetry(client));
}

this.#telemetry?.recordLoaded({surface: 'cart', milliseconds});
```

Clear the adapter wherever the component clears its client, so a reconnect gets a fresh one.

- Labels must be closed, low-cardinality values, as the contract requires. Never use error messages, IDs or URLs. Adapter methods that take literal unions keep callers within that rule.
- Names start with `checkout_kit_`, histograms use `unit: 'ms'`, and names from the shared catalog, such as `checkout_kit_error`, are reserved. The types enforce all three. Type a private helper's name as the component's own union of names: a name widened to `checkout_kit_${string}` could be reserved, so the types reject it. `record` also drops reserved names at runtime, in case a cast gets past the types.
- Each measurement sets its own `product`. The client adds `platform` and the timestamp.
- Histogram values that are negative or not finite are dropped, as for the catalog's metrics.
- In component tests, spy on the client's `record`, or on the adapter's methods. Test the adapter itself against `createCheckoutKitTelemetryForTesting` from `@shopify/checkout-kit-telemetry`, with a fake `fetch`, as this package's `test/recording.test.ts` does.
- Keep a component's metric docs with the component until it ships, and move them into the shared contract in the PR that ships it.

## When the client exports

The client exports what it holds once every export interval (60 seconds), and when a component calls `flush` or `shutdown`. Each export takes only what is pending at that moment, so the client sends a measurement again only after the export that carried it fails.

- **Backoff.** When an export fails, the client puts its measurements back, within the pending limit. The periodic export and `flush()` then wait before they send again: 1 export interval after the first failure, then 2, 4, 8 and 16, but never more than 15 minutes. A successful export ends the backoff.
- **One keepalive flush skips the backoff.** A component should call `flush({keepalive: true})` when the page may not come back: on `pagehide`, or when the page becomes hidden, because a mobile browser can discard a hidden page without `pagehide`. During a backoff, the first keepalive flush sends at once, whether or not another export is in flight. Each later keepalive flush waits, as the periodic export does, until the backoff ends or an export succeeds: a component that flushes when the page becomes hidden flushes on every tab switch, and a failing endpoint must not get a request for each one. A keepalive flush outside a backoff sends at once. A failed keepalive export extends the backoff as any export does. So while the endpoint fails, keepalive flushes add at most one request to each backoff.
- **A shutdown is final.** `shutdown()` sends what is pending at once, whether or not another export is in flight. It ignores the backoff, because a component shuts a client down only once, and `keepalive: true` lets its request outlive the page. After the call, the client records and sends nothing more. An export already in flight finishes on its own, and if it fails, the client drops its measurements and does not send them again. So a component can drop its client when it disconnects, and a later `telemetry="false"` has nothing left to discard.
- `shutdown({discardPending: true})` drops what is pending and aborts an ordinary export in flight. It never aborts a keepalive export, which must outlive the page.
