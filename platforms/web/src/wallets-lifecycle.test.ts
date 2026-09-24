import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  setWalletAdapterFactoryForTesting,
  type WalletAdapter,
  type WalletAdapterOutcome,
  type WalletAdapterRequest,
} from "./wallets-adapter";
import { EXPRESS_CHECKOUT_EVENTS } from "./wallets-index";
import type { ShopifyAcceleratedCheckoutButtons } from "./wallets-index";
import type {
  GetCart,
  WalletDisplayError,
  WalletErrorEventDetail,
  WalletRenderEventDetail,
} from "./wallets.types";

const tagName = "shopify-accelerated-checkout-buttons";
const getCart: GetCart = vi.fn().mockResolvedValue("created-cart-reference");

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function createAdapter(...outcomes: Array<Deferred<WalletAdapterOutcome>>) {
  let index = 0;
  return {
    start: vi.fn((_request: WalletAdapterRequest) => outcomes[index++]!.promise),
    stop: vi.fn(),
  } satisfies WalletAdapter;
}

function createElement(): ShopifyAcceleratedCheckoutButtons {
  return document.createElement(tagName);
}

function configureProduct(
  element: ShopifyAcceleratedCheckoutButtons,
  overrides: Partial<Parameters<ShopifyAcceleratedCheckoutButtons["configure"]>[0]> = {},
): void {
  element.configure({
    storeDomain: "example.myshopify.com",
    country: "CA",
    locale: "en-CA",
    currency: "CAD",
    variantId: "gid://shopify/ProductVariant/1",
    getCart,
    ...overrides,
  });
}

async function expectStarts(
  adapter: ReturnType<typeof createAdapter>,
  count: number,
): Promise<void> {
  await vi.waitFor(() => expect(adapter.start).toHaveBeenCalledTimes(count));
}

describe("accelerated checkout lifecycle", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    setWalletAdapterFactoryForTesting();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("publishes ready state before the callback and mirrored render event", async () => {
    const outcome = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(outcome);
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();
    const observations: Array<string> = [];

    configureProduct(element, {
      walletCount: 2,
      layout: "vertical",
      callbacks: {
        ready: () => observations.push(`callback:${element.availability.state}`),
      },
    });
    element.addEventListener(EXPRESS_CHECKOUT_EVENTS.render, (event) => {
      const detail = (event as CustomEvent<WalletRenderEventDetail>).detail;
      observations.push(`event:${detail.availability.state}`);
    });
    document.body.append(element);

    expect(element.availability).toEqual({ state: "loading" });
    await expectStarts(adapter, 1);
    expect(adapter.start).toHaveBeenCalledWith(
      expect.objectContaining({
        purchase: expect.objectContaining({
          variantId: "gid://shopify/ProductVariant/1",
          cartId: undefined,
        }),
        walletCount: 2,
        layout: "vertical",
        getCart,
        signal: expect.any(AbortSignal),
      }),
    );

    outcome.resolve({ status: "ready", wallets: ["apple_pay"], failed: ["paypal"] });

    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
    expect(element.availability).toEqual({
      state: "ready",
      wallets: ["apple_pay"],
      failed: ["paypal"],
    });
    expect(observations).toEqual(["callback:ready", "event:ready"]);
    expect(element.shadowRoot?.querySelector('[part="root"]')?.getAttribute("data-state")).toBe(
      "ready",
    );
  });

  it("coalesces updates, cancels stale work, and ignores stale outcomes", async () => {
    const first = deferred<WalletAdapterOutcome>();
    const second = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(first, second);
    setWalletAdapterFactoryForTesting(() => adapter);
    const ready = vi.fn();
    const element = createElement();

    configureProduct(element, { callbacks: { ready } });
    document.body.append(element);
    await expectStarts(adapter, 1);
    const firstSignal = adapter.start.mock.calls[0]![0].signal;

    element.configure({
      variantId: "gid://shopify/ProductVariant/2",
      sellingPlanId: "gid://shopify/SellingPlan/3",
    });
    await expectStarts(adapter, 2);

    expect(firstSignal.aborted).toBe(true);
    expect(adapter.stop).toHaveBeenCalledTimes(1);
    expect(adapter.start.mock.calls[1]![0].purchase).toMatchObject({
      variantId: "gid://shopify/ProductVariant/2",
      sellingPlanId: "gid://shopify/SellingPlan/3",
    });

    element.configure({
      variantId: "gid://shopify/ProductVariant/2",
      sellingPlanId: "gid://shopify/SellingPlan/3",
    });
    await Promise.resolve();
    expect(adapter.start).toHaveBeenCalledTimes(2);

    second.resolve({ status: "ready", wallets: ["paypal"] });
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
    first.resolve({ status: "ready", wallets: ["apple_pay"] });
    await Promise.resolve();

    expect(element.availability).toMatchObject({ state: "ready", wallets: ["paypal"] });
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it("reports invalid product configuration once and clears it before recovery", async () => {
    const outcome = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(outcome);
    setWalletAdapterFactoryForTesting(() => adapter);
    const errors: Array<WalletDisplayError | null> = [];
    const errorEvents: Array<WalletDisplayError | null> = [];
    const element = createElement();

    element.addEventListener(EXPRESS_CHECKOUT_EVENTS.error, (event) => {
      errorEvents.push((event as CustomEvent<WalletErrorEventDetail>).detail.error);
    });
    configureProduct(element, {
      getCart: undefined,
      callbacks: {
        error: (error) => {
          expect(element.error).toBe(error);
          errors.push(error);
        },
      },
    });
    document.body.append(element);

    await vi.waitFor(() => expect(element.error?.code).toBe("purchase_configuration_invalid"));
    expect(element.availability).toEqual({ state: "unavailable", reason: "setup_error" });
    expect(adapter.start).not.toHaveBeenCalled();

    element.configure({ variantId: "gid://shopify/ProductVariant/1" });
    await Promise.resolve();
    expect(errors).toHaveLength(1);

    element.configure({ getCart });
    await expectStarts(adapter, 1);
    expect(errors).toEqual([
      expect.objectContaining({ code: "purchase_configuration_invalid" }),
      null,
    ]);
    expect(errorEvents).toEqual(errors);

    outcome.resolve({ status: "ready", wallets: ["shop_pay"] });
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
  });

  it("reports the same invalid configuration again after remount", async () => {
    const adapter = createAdapter();
    setWalletAdapterFactoryForTesting(() => adapter);
    const errorCallback = vi.fn();
    const errorEvent = vi.fn();
    const element = createElement();

    configureProduct(element, {
      getCart: undefined,
      callbacks: { error: errorCallback },
    });
    element.addEventListener(EXPRESS_CHECKOUT_EVENTS.error, errorEvent);
    document.body.append(element);

    await vi.waitFor(() => expect(element.error?.code).toBe("purchase_configuration_invalid"));
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorEvent).toHaveBeenCalledTimes(1);

    element.remove();
    expect(element.availability).toEqual({ state: "loading" });
    expect(element.error).toBeNull();

    document.body.append(element);
    await vi.waitFor(() => expect(errorCallback).toHaveBeenCalledTimes(2));
    expect(errorEvent).toHaveBeenCalledTimes(2);
    expect(element.error?.code).toBe("purchase_configuration_invalid");
    expect(adapter.start).not.toHaveBeenCalled();
  });

  it("gives an existing cart priority over product inputs", async () => {
    const first = deferred<WalletAdapterOutcome>();
    const second = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(first, second);
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();

    element.configure({
      storeDomain: "example.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      cartId: "existing-cart-reference",
      variantId: "gid://shopify/ProductVariant/ignored",
    });
    document.body.append(element);
    await expectStarts(adapter, 1);

    expect(adapter.start.mock.calls[0]![0]).toMatchObject({
      purchase: {
        cartId: "existing-cart-reference",
        variantId: undefined,
        sellingPlanId: undefined,
      },
      getCart: undefined,
    });
  });

  it("does not restart an existing-cart flow when getCart changes", async () => {
    const outcome = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(outcome);
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();

    element.configure({
      storeDomain: "example.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      cartId: "existing-cart-reference",
      getCart,
    });
    document.body.append(element);
    await expectStarts(adapter, 1);
    outcome.resolve({ status: "ready", wallets: ["apple_pay"] });
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));

    element.configure({ getCart: vi.fn().mockResolvedValue("another-cart-reference") });
    await Promise.resolve();
    await Promise.resolve();

    expect(adapter.start).toHaveBeenCalledTimes(1);
    expect(adapter.stop).not.toHaveBeenCalled();
    expect(element.availability.state).toBe("ready");
  });

  it("treats an empty ready outcome as unavailable without calling ready", async () => {
    const outcome = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(outcome);
    setWalletAdapterFactoryForTesting(() => adapter);
    const ready = vi.fn();
    const render = vi.fn();
    const element = createElement();

    configureProduct(element, { callbacks: { ready } });
    element.addEventListener(EXPRESS_CHECKOUT_EVENTS.render, render);
    document.body.append(element);
    await expectStarts(adapter, 1);
    outcome.resolve({ status: "ready", wallets: [] });

    await vi.waitFor(() =>
      expect(element.availability).toEqual({ state: "unavailable", reason: "no_wallet" }),
    );
    expect(ready).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("normalizes adapter failures without exposing thrown messages", async () => {
    const adapter = {
      start: vi.fn().mockRejectedValue(new Error("private adapter details")),
      stop: vi.fn(),
    } satisfies WalletAdapter;
    setWalletAdapterFactoryForTesting(() => adapter);
    const errorEvent = vi.fn();
    const element = createElement();

    configureProduct(element, {
      callbacks: {
        error: () => {
          throw new Error("merchant callback failure");
        },
      },
    });
    element.addEventListener(EXPRESS_CHECKOUT_EVENTS.error, errorEvent);
    document.body.append(element);

    await vi.waitFor(() => expect(element.error?.code).toBe("unexpected_error"));
    expect(element.error).toEqual({ phase: "initialization", code: "unexpected_error" });
    expect(element.availability).toEqual({ state: "unavailable", reason: "setup_error" });
    expect(errorEvent).toHaveBeenCalledOnce();
    expect(JSON.stringify(element.error)).not.toContain("private adapter details");
  });

  it("cancels on disconnect and restarts cleanly on remount", async () => {
    const first = deferred<WalletAdapterOutcome>();
    const second = deferred<WalletAdapterOutcome>();
    const adapter = createAdapter(first, second);
    setWalletAdapterFactoryForTesting(() => adapter);
    const ready = vi.fn();
    const element = createElement();

    configureProduct(element, { callbacks: { ready } });
    document.body.append(element);
    await expectStarts(adapter, 1);
    const firstSignal = adapter.start.mock.calls[0]![0].signal;

    element.remove();
    expect(firstSignal.aborted).toBe(true);
    expect(element.availability).toEqual({ state: "loading" });

    first.resolve({ status: "ready", wallets: ["stale_wallet"] });
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    document.body.append(element);
    await expectStarts(adapter, 2);
    second.resolve({ status: "ready", wallets: ["apple_pay"] });
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it("isolates callback failures and multiple element instances", async () => {
    const firstOutcome = deferred<WalletAdapterOutcome>();
    const secondOutcome = deferred<WalletAdapterOutcome>();
    const adapters = [createAdapter(firstOutcome), createAdapter(secondOutcome)];
    setWalletAdapterFactoryForTesting(() => adapters.shift());
    const first = createElement();
    const second = createElement();
    const secondReady = vi.fn();

    configureProduct(first, {
      callbacks: {
        ready: () => {
          throw new Error("merchant callback failure");
        },
      },
    });
    configureProduct(second, { callbacks: { ready: secondReady } });
    document.body.append(first, second);

    await vi.waitFor(() => {
      expect(adapters).toHaveLength(0);
    });
    firstOutcome.resolve({ status: "ready", wallets: ["apple_pay"] });
    secondOutcome.resolve({ status: "ready", wallets: ["paypal"] });

    await vi.waitFor(() => expect(secondReady).toHaveBeenCalledOnce());
    expect(first.availability).toMatchObject({ state: "ready", wallets: ["apple_pay"] });
    expect(second.availability).toMatchObject({ state: "ready", wallets: ["paypal"] });
  });
});
