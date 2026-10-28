# @shopify/checkout-kit-telemetry

The shared Web telemetry client. It batches counters and histograms, adds the `product` and `platform` labels, and exports them as OTLP metrics. The metric catalog lives in [`platforms/shared/telemetry/contract/metrics.md`](../../../shared/telemetry/contract/metrics.md).

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
