// Resolve the package's built exports, without the source tsconfig path aliases.
import "@shopify/checkout-kit/shopify-universal-checkout";
import "@shopify/checkout-kit/shop-pay";
import { ShopifyCheckout, ShopifyUniversalCheckout, ShopPay } from "@shopify/checkout-kit";
import type {
  ShopifyCheckoutAppearance,
  ShopifyCheckoutTarget,
  ShopifyCheckoutLogLevel,
  ShopifyCheckoutEventMap,
  ShopifyUniversalCheckoutEventMap,
  ShopPayEventMap,
  ShopifyCheckoutSnapshot,
  ShopifyCheckoutError,
  ShopifyCheckoutErrorCode,
  ShopifyCheckoutMessageRejectedDetail,
  ShopifyUniversalCheckoutSnapshot,
  ShopifyUniversalCheckoutResourceEventEntry,
  ShopifyUniversalCheckoutErrorEventEntry,
  ShopifyUniversalCheckoutFailure,
  ShopifyUniversalCheckoutErrorCode,
  ShopifyUniversalCheckoutResourceStatus,
  ShopPaySnapshot,
  ShopPayResourceEventEntry,
  ShopPayErrorEventEntry,
  ShopPayFailure,
  ShopPayErrorCode,
  ShopPayResourceStatus,
} from "@shopify/checkout-kit";

type UniversalCompleteDetail = ShopifyUniversalCheckoutEventMap["complete"]["detail"];
type ShopPayCompleteDetail = ShopPayEventMap["complete"]["detail"];

// @ts-expect-error Resource-only reducer event types are not public event-name unions.
import type { UniversalCheckoutEventType } from "@shopify/checkout-kit";
// @ts-expect-error Use keyof ShopPayEventMap for all public Shop Pay event names.
import type { ShopPayEventType } from "@shopify/checkout-kit";

const checkout = document.createElement("shopify-checkout") as ShopifyCheckout;
const appearance: ShopifyCheckoutAppearance = "storefront";
const target: ShopifyCheckoutTarget = "popup";
const logLevel: ShopifyCheckoutLogLevel = "warn";
checkout.appearance = appearance;
checkout.target = target;
checkout.logLevel = logLevel;
checkout.onMessageRejected = (detail) => {
  const rejected: ShopifyCheckoutMessageRejectedDetail = detail;
  void rejected;
};
checkout.src = "https://example.myshopify.com/checkouts/test";
checkout.addEventListener("complete", (event) => {
  const snapshot: ShopifyCheckoutSnapshot = event.detail.checkout;
  // Standard checkout snapshots keep their existing mutable contract.
  snapshot.status = "completed";
  snapshot.lineItems.push(...snapshot.lineItems);
});
checkout.addEventListener("error", (event) => {
  const error: ShopifyCheckoutError = event.detail.error;
  const code: ShopifyCheckoutErrorCode = error.code;
  const current: ShopifyCheckoutError | undefined = checkout.error;
  void [code, current];
});
checkout.addEventListener("close", (event) => {
  const detail: null = event.detail;
  void detail;
});
checkout.open();
checkout.close();

const universal: ShopifyUniversalCheckout = document.createElement("shopify-universal-checkout");
universal.target = target;
universal.logLevel = logLevel;
universal.addEventListener("complete", (event) => {
  const completed: UniversalCompleteDetail = event.detail;
  for (const resource of completed) {
    const entry: ShopifyUniversalCheckoutResourceEventEntry = resource;
    const snapshot: ShopifyUniversalCheckoutSnapshot = entry.checkout;
    const status: ShopifyUniversalCheckoutResourceStatus | undefined = entry.context.status;
    const shopId: string = entry.context.shopId;
    void [status, shopId];
    // Named types preserve the readonly event data, including nested arrays.
    // @ts-expect-error Checkout snapshots are immutable.
    snapshot.status = "completed";
    // @ts-expect-error Nested checkout arrays are immutable.
    snapshot.lineItems.push(...snapshot.lineItems);
    // @ts-expect-error Nested context is immutable.
    entry.context.shopId = "another-shop";
  }
});
universal.addEventListener("error", (event) => {
  for (const resource of event.detail) {
    const entry: ShopifyUniversalCheckoutErrorEventEntry = resource;
    const failure: ShopifyUniversalCheckoutFailure = entry.error;
    const code: ShopifyUniversalCheckoutErrorCode = failure.code;
    const snapshot: ShopifyUniversalCheckoutSnapshot | undefined = entry.checkout;
    void [code, snapshot];
    // @ts-expect-error Failure objects are immutable.
    failure.code = "unknown";
  }
});
universal.open();
universal.close();

// Universal checkout is event-only; aggregate state belongs to the host.
// @ts-expect-error Universal checkout has no aggregate checkout getter.
universal.checkout;
// @ts-expect-error Universal checkout has no aggregate error getter.
universal.error;

const shopPay: ShopPay = document.createElement("shop-pay");
shopPay.button = true;
shopPay.target = target;
shopPay.logLevel = logLevel;
shopPay.addEventListener("complete", (event) => {
  const completed: ShopPayCompleteDetail = event.detail;
  for (const resource of completed) {
    const entry: ShopPayResourceEventEntry = resource;
    const snapshot: ShopPaySnapshot = entry.checkout;
    const status: ShopPayResourceStatus | undefined = entry.context.status;
    const shopId: string = entry.context.shopId;
    void [status, shopId];
    // @ts-expect-error Checkout snapshots are immutable.
    snapshot.status = "completed";
    // @ts-expect-error Nested checkout arrays are immutable.
    snapshot.lineItems.push(...snapshot.lineItems);
    // @ts-expect-error Nested context is immutable.
    entry.context.shopId = "another-shop";
  }
});
shopPay.addEventListener("error", (event) => {
  for (const resource of event.detail) {
    const entry: ShopPayErrorEventEntry = resource;
    const failure: ShopPayFailure = entry.error;
    const code: ShopPayErrorCode = failure.code;
    const snapshot: ShopPaySnapshot | undefined = entry.checkout;
    void [code, snapshot];
    // @ts-expect-error Failure objects are immutable.
    failure.code = "unknown";
  }
});
shopPay.open();
shopPay.close();

// Shop Pay is event-only too.
// @ts-expect-error Shop Pay has no aggregate checkout getter.
shopPay.checkout;

// Framework wrappers can relate any public event name to its precise payload.
function onCheckout<K extends keyof ShopifyCheckoutEventMap>(
  name: K,
  listener: (event: ShopifyCheckoutEventMap[K]) => void,
): void {
  checkout.addEventListener(name, listener);
  checkout.addEventListener(name, { handleEvent: listener });
}

function onUniversal<K extends keyof ShopifyUniversalCheckoutEventMap>(
  name: K,
  listener: (event: ShopifyUniversalCheckoutEventMap[K]) => void,
): void {
  universal.addEventListener(name, listener);
  universal.addEventListener(name, { handleEvent: listener });
}

function onShopPay<K extends keyof ShopPayEventMap>(
  name: K,
  listener: (event: ShopPayEventMap[K]) => void,
): void {
  shopPay.addEventListener(name, listener);
  shopPay.addEventListener(name, { handleEvent: listener });
}

onUniversal("error", (event) => {
  const code: string = event.detail[0]!.error.code;
  void code;
});
onCheckout("complete", (event) => {
  const snapshot: ShopifyCheckoutSnapshot = event.detail.checkout;
  void snapshot;
});
onShopPay("blocked", (event) => {
  const code: "popup_blocked" = event.detail.code;
  void code;
});

// A union of event names must still infer lifecycle events, rather than generic Event.
function observeLifecycle(name: keyof ShopifyCheckoutEventMap): void {
  checkout.addEventListener(name, (event) => {
    const lifecycle: ShopifyCheckoutEventMap[typeof name] = event;
    void lifecycle;
  });
  universal.addEventListener(name, (event) => {
    const lifecycle: ShopifyUniversalCheckoutEventMap[typeof name] = event;
    void lifecycle;
  });
  shopPay.addEventListener(name, (event) => {
    const lifecycle: ShopPayEventMap[typeof name] = event;
    void lifecycle;
  });
}
observeLifecycle("close");

// @ts-expect-error Event names and payloads must remain correlated.
onUniversal("error", (_event: ShopifyUniversalCheckoutEventMap["close"]) => {});
// @ts-expect-error Event names and payloads must remain correlated.
onShopPay("close", (_event: ShopPayEventMap["complete"]) => {});
// @ts-expect-error Event names and payloads must remain correlated.
onCheckout("complete", (_event: ShopifyCheckoutEventMap["error"]) => {});
