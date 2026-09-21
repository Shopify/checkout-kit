import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "./wallets-index";

import {
  setWalletAdapterFactoryForTesting,
  type WalletAdapter,
  type WalletAdapterOutcome,
  type WalletAdapterRequest,
} from "./wallets-adapter";
import type { ShopifyAcceleratedCheckoutButtons } from "./wallets-index";
import type { GetCart, WalletDisplayError } from "./wallets.types";

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

function createAdapter(cartUpdated: NonNullable<WalletAdapter["cartUpdated"]>) {
  return {
    start: vi.fn(async (_request: WalletAdapterRequest) => ({
      status: "ready" as const,
      wallets: ["apple_pay"],
    })),
    stop: vi.fn(),
    cartUpdated,
  } satisfies WalletAdapter;
}

function createElement(): ShopifyAcceleratedCheckoutButtons {
  return document.createElement(tagName);
}

function configureCart(
  element: ShopifyAcceleratedCheckoutButtons,
  cartId = "existing-cart-reference",
): void {
  element.configure({
    storeDomain: "example.myshopify.com",
    country: "CA",
    locale: "en-CA",
    currency: "CAD",
    cartId,
  });
}

async function mountCart(adapter: ReturnType<typeof createAdapter>) {
  setWalletAdapterFactoryForTesting(() => adapter);
  const element = createElement();
  configureCart(element);
  document.body.append(element);
  await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
  return element;
}

describe("existing-cart update notifications", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  afterEach(() => {
    setWalletAdapterFactoryForTesting();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("coalesces repeated signals and preserves one signal received during refresh", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const cartUpdated = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const element = await mountCart(createAdapter(cartUpdated));

    element.cartUpdated();
    element.cartUpdated();
    element.cartUpdated();
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledOnce());

    element.cartUpdated();
    element.cartUpdated();
    first.resolve();
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledTimes(2));

    second.resolve();
    await Promise.resolve();
    expect(cartUpdated).toHaveBeenCalledTimes(2);
  });

  it("holds an update received during initialization until the cart flow is ready", async () => {
    const ready = deferred<WalletAdapterOutcome>();
    const cartUpdated = vi.fn();
    const adapter = {
      start: vi.fn(() => ready.promise),
      stop: vi.fn(),
      cartUpdated,
    } satisfies WalletAdapter;
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();

    configureCart(element);
    document.body.append(element);
    await vi.waitFor(() => expect(adapter.start).toHaveBeenCalledOnce());

    element.cartUpdated();
    await Promise.resolve();
    expect(cartUpdated).not.toHaveBeenCalled();

    ready.resolve({ status: "ready", wallets: ["apple_pay"] });
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledOnce());
  });

  it("discards pending work when the configured cart is replaced", async () => {
    const first = deferred<void>();
    const cartUpdated = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(undefined);
    const adapter = createAdapter(cartUpdated);
    const element = await mountCart(adapter);

    element.cartUpdated();
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledOnce());
    element.cartUpdated();

    element.cartId = "replacement-cart-reference";
    await vi.waitFor(() => expect(adapter.start).toHaveBeenCalledTimes(2));
    first.resolve();
    await Promise.resolve();
    expect(cartUpdated).toHaveBeenCalledOnce();

    element.cartUpdated();
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledTimes(2));
  });

  it("does not forward signals without a connected existing-cart flow", async () => {
    const cartUpdated = vi.fn();
    const adapter = createAdapter(cartUpdated);
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();

    element.configure({
      storeDomain: "example.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      variantId: "gid://shopify/ProductVariant/1",
      getCart,
    });
    document.body.append(element);
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));

    element.cartUpdated();
    await Promise.resolve();
    expect(cartUpdated).not.toHaveBeenCalled();

    element.remove();
    element.cartId = "existing-cart-reference";
    element.cartUpdated();
    await Promise.resolve();
    expect(cartUpdated).not.toHaveBeenCalled();
  });

  it("normalizes refresh failures and allows a later retry", async () => {
    const second = deferred<void>();
    const cartUpdated = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("private refresh details"))
      .mockImplementationOnce(() => second.promise);
    const errors: Array<WalletDisplayError | null> = [];
    const adapter = createAdapter(cartUpdated);
    setWalletAdapterFactoryForTesting(() => adapter);
    const element = createElement();

    element.callbacks = { error: (error) => errors.push(error) };
    configureCart(element);
    document.body.append(element);
    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));

    element.cartUpdated();
    await vi.waitFor(() => expect(element.error?.phase).toBe("interaction"));
    expect(element.error).toEqual({ phase: "interaction", code: "unexpected_error" });
    expect(JSON.stringify(element.error)).not.toContain("private refresh details");

    element.cartUpdated();
    await vi.waitFor(() => expect(cartUpdated).toHaveBeenCalledTimes(2));
    expect(element.error).toBeNull();
    expect(errors).toEqual([{ phase: "interaction", code: "unexpected_error" }, null]);

    second.resolve();
  });
});
