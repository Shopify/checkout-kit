import { afterEach, describe, expect, it, vi } from "vitest";

import "./wallets-index";

import type { WalletBootstrapClient, WalletBootstrapResult } from "./wallets-bootstrap-client";
import type {
  PortableWalletsChild,
  PortableWalletsRuntime,
  PortableWalletsRuntimeLoader,
} from "./wallets-runtime-loader";
import { setWalletAdapterFactoryForTesting, type WalletAdapterRequest } from "./wallets-adapter";
import {
  createPortableWalletsAdapter,
  type PortableWalletsAdapterServices,
} from "./wallets-portable-adapter";
import type { GetCart, WalletPurchaseSnapshot, WalletRenderEventDetail } from "./wallets.types";

const tagName = "shopify-accelerated-checkout-buttons";

function bootstrapResult(overrides: Partial<WalletBootstrapResult> = {}): WalletBootstrapResult {
  const shopPay = {
    name: "shop_pay",
    supports_subs: true,
    supports_def_opts: true,
    wallet_params: { channel: "headless" },
  };
  const applePay = {
    name: "apple_pay",
    supports_subs: false,
    supports_def_opts: false,
    wallet_params: { merchant: "private-wallet-config" },
  };
  return {
    shopId: "gid://shopify/Shop/1",
    presentmentCurrency: "CAD",
    walletConfigs: [shopPay, applePay],
    recommendedWallet: shopPay,
    fallbackWallet: applePay,
    enabledFlags: ["flag-a"],
    variantParams: [{ id: "gid://shopify/ProductVariant/1", requiresShipping: true }],
    purchaseContext: { requiresShipping: true, hasSellingPlan: false },
    ...overrides,
  };
}

function productPurchase(): WalletPurchaseSnapshot {
  return {
    storeDomain: "example.myshopify.com",
    country: "CA",
    locale: "en-CA",
    currency: "CAD",
    cartId: undefined,
    variantId: "gid://shopify/ProductVariant/1",
    sellingPlanId: undefined,
  };
}

function cartPurchase(): WalletPurchaseSnapshot {
  return {
    storeDomain: "example.myshopify.com",
    country: "US",
    locale: "en",
    currency: "USD",
    cartId: "opaque-cart-reference",
    variantId: undefined,
    sellingPlanId: undefined,
  };
}

function adapterRequest(
  purchase: WalletPurchaseSnapshot = productPurchase(),
  overrides: Partial<WalletAdapterRequest> = {},
): WalletAdapterRequest {
  return {
    purchase,
    walletCount: 0,
    getCart: vi.fn<GetCart>().mockResolvedValue("created-cart-reference"),
    mount: document.createElement("div"),
    signal: new AbortController().signal,
    ...overrides,
  };
}

function mockChild() {
  let outcomeHandler:
    | ((outcome: {
        readonly rendered: ReadonlyArray<string>;
        readonly failed: ReadonlyArray<string>;
      }) => void)
    | undefined;
  let errorHandler: ((code: string, message?: string) => void) | undefined;
  const element = Object.assign(document.createElement("div"), {
    configure: vi.fn(),
    setCheckoutClient: vi.fn(),
    setDatasource: vi.fn(),
    setSurfaceAdapter: vi.fn(),
    setTopLevelErrorHandler: vi.fn((handler: (code: string, message?: string) => void) => {
      errorHandler = handler;
    }),
    setRenderOutcomeHandler: vi.fn(
      (
        handler: (outcome: {
          readonly rendered: ReadonlyArray<string>;
          readonly failed: ReadonlyArray<string>;
        }) => void,
      ) => {
        outcomeHandler = handler;
      },
    ),
    updateContext: vi.fn(),
    checkoutChanged: vi.fn(),
  });

  return {
    element,
    emitOutcome: (outcome: {
      readonly rendered: ReadonlyArray<string>;
      readonly failed: ReadonlyArray<string>;
    }) => outcomeHandler?.(outcome),
    emitError: (code: string, message?: string) => errorHandler?.(code, message),
  };
}

function mockRuntime(child = mockChild()) {
  const runtime = {
    createChild: vi.fn(
      (_presentation: Parameters<PortableWalletsRuntime["createChild"]>[0]) => child.element,
    ),
    createCheckoutClient: vi.fn(
      (_options: Parameters<PortableWalletsRuntime["createCheckoutClient"]>[0]) => ({}),
    ),
    createDatasource: vi.fn(
      (_options: Parameters<PortableWalletsRuntime["createDatasource"]>[0]) => ({}),
    ),
    createSurfaceAdapter: vi.fn(
      (_source: Parameters<PortableWalletsRuntime["createSurfaceAdapter"]>[0]) => ({}),
    ),
    resolveCartContext: vi.fn(async () => ({
      requiresShipping: true,
      hasSellingPlan: false,
    })),
    createProductCart: vi.fn(
      ({ signal, getCart }: Parameters<PortableWalletsRuntime["createProductCart"]>[0]) =>
        async (wallet: string): Promise<string> =>
          getCart({ wallet, signal }),
    ),
  } satisfies PortableWalletsRuntime;
  return { runtime, child };
}

function mockServices(
  result: WalletBootstrapResult = bootstrapResult(),
  mocked = mockRuntime(),
): {
  readonly services: PortableWalletsAdapterServices;
  readonly bootstrapClient: {
    readonly load: ReturnType<typeof vi.fn>;
    readonly cancel: ReturnType<typeof vi.fn>;
  };
  readonly runtimeLoader: { readonly load: ReturnType<typeof vi.fn> };
  readonly checkoutClient: object;
  readonly createCheckoutClient: ReturnType<typeof vi.fn>;
  readonly terminalError: ReturnType<typeof vi.fn>;
  readonly runtime: typeof mocked.runtime;
  readonly child: typeof mocked.child;
} {
  const bootstrapClient = {
    load: vi.fn().mockResolvedValue(result),
    cancel: vi.fn(),
  } satisfies WalletBootstrapClient;
  const runtimeLoader = {
    load: vi.fn().mockResolvedValue(mocked.runtime),
  } satisfies PortableWalletsRuntimeLoader;
  const checkoutClient = { type: "mock-checkout-client" };
  const createCheckoutClient = vi.fn().mockResolvedValue(checkoutClient);
  const terminalError = vi.fn();
  return {
    services: {
      bootstrapClient,
      runtimeLoader,
      createCheckoutClient,
      onTerminalError: terminalError,
    },
    bootstrapClient,
    runtimeLoader,
    checkoutClient,
    createCheckoutClient,
    terminalError,
    runtime: mocked.runtime,
    child: mocked.child,
  };
}

async function waitForMount(child: PortableWalletsChild, mount: HTMLElement): Promise<void> {
  await vi.waitFor(() => expect(child.parentElement).toBe(mount));
}

afterEach(() => {
  setWalletAdapterFactoryForTesting();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("createPortableWalletsAdapter", () => {
  it("composes a product child from injected bootstrap and runtime services", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest();

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);

    expect(mocks.bootstrapClient.load).toHaveBeenCalledWith({
      purchase: request.purchase,
      signal: expect.any(AbortSignal),
    });
    expect(mocks.runtimeLoader.load).toHaveBeenCalledOnce();
    expect(mocks.createCheckoutClient).toHaveBeenCalledWith({
      runtime: mocks.runtime,
      purchase: request.purchase,
      signal: expect.any(AbortSignal),
      onTerminalError: expect.any(Function),
    });
    expect(mocks.runtime.resolveCartContext).not.toHaveBeenCalled();
    expect(mocks.runtime.createChild).toHaveBeenCalledWith("multi");
    expect(mocks.child.element.configure).toHaveBeenCalledWith({
      presentation: "multi",
      buyerCountry: "CA",
      buyerCurrency: "CAD",
      shopId: "gid://shopify/Shop/1",
      variantParams: [{ id: "gid://shopify/ProductVariant/1", requiresShipping: true }],
      enabledFlags: ["flag-a"],
      walletConfigs: [
        expect.objectContaining({ name: "shop_pay" }),
        expect.objectContaining({ name: "apple_pay" }),
      ],
    });
    expect(mocks.child.element.updateContext).toHaveBeenCalledWith({
      requiresShipping: true,
      hasSellingPlan: false,
    });
    expect(mocks.child.element.setCheckoutClient).toHaveBeenCalledWith(mocks.checkoutClient);
    expect(mocks.child.element.getAttributeNames()).toEqual([]);
    expect(request.mount.textContent).not.toContain("private-wallet-config");

    mocks.child.emitOutcome({ rendered: ["shop_pay"], failed: ["apple_pay"] });
    await expect(result).resolves.toEqual({
      status: "ready",
      wallets: ["shop_pay"],
      failed: ["apple_pay"],
    });
  });

  it("uses single presentation when walletCount is one", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest(productPurchase(), {
      walletCount: 1,
      layout: "vertical",
    });

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);

    expect(mocks.runtime.createChild).toHaveBeenCalledWith("single");
    expect(mocks.child.element.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        presentation: "single",
        layout: "vertical",
        recommendedWallet: expect.objectContaining({ name: "shop_pay" }),
        fallbackWallet: expect.objectContaining({ name: "apple_pay" }),
      }),
    );
    mocks.child.emitOutcome({ rendered: ["shop_pay"], failed: [] });
    await expect(result).resolves.toMatchObject({ status: "ready" });
  });

  it("caps multi-wallet configuration without changing the bootstrap result", async () => {
    const bootstrap = bootstrapResult();
    const mocks = mockServices(bootstrap);
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest(productPurchase(), { walletCount: 2 });

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);

    const configuration = mocks.child.element.configure.mock.calls[0]![0];
    expect(configuration).toMatchObject({ presentation: "multi" });
    if (configuration.presentation !== "multi") throw new Error("Expected multi mode");
    expect(configuration.walletConfigs).toHaveLength(2);
    expect(bootstrap.walletConfigs).toHaveLength(2);
    mocks.child.emitOutcome({ rendered: ["shop_pay", "apple_pay"], failed: [] });
    await expect(result).resolves.toMatchObject({ status: "ready" });
  });

  it("returns no_wallet without loading PW when bootstrap has no candidates", async () => {
    const mocks = mockServices(
      bootstrapResult({
        walletConfigs: [],
        recommendedWallet: null,
        fallbackWallet: null,
      }),
    );
    const adapter = createPortableWalletsAdapter(mocks.services);

    await expect(adapter.start(adapterRequest())).resolves.toEqual({
      status: "unavailable",
      reason: "no_wallet",
    });
    expect(mocks.runtimeLoader.load).not.toHaveBeenCalled();
    expect(mocks.createCheckoutClient).not.toHaveBeenCalled();
    expect(mocks.runtime.createChild).not.toHaveBeenCalled();
  });

  it("resolves existing-cart context before mounting the child", async () => {
    const mocks = mockServices(bootstrapResult({ purchaseContext: undefined }));
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest(cartPurchase(), { getCart: undefined });

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);

    expect(mocks.runtime.resolveCartContext).toHaveBeenCalledWith({
      checkoutClient: mocks.checkoutClient,
      cartId: "opaque-cart-reference",
    });
    const datasourceOptions = mocks.runtime.createDatasource.mock.calls[0]![0];
    expect(datasourceOptions.resolveCartId?.()).toBe("opaque-cart-reference");
    expect(datasourceOptions.createCart).toBeUndefined();
    const cartTokenSource = mocks.runtime.createSurfaceAdapter.mock.calls[0]![0];
    expect(cartTokenSource()).toBe("opaque-cart-reference");
    expect(mocks.child.element.updateContext.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.child.element.setRenderOutcomeHandler.mock.invocationCallOrder[0]!,
    );

    mocks.child.emitOutcome({ rendered: ["apple_pay"], failed: [] });
    await expect(result).resolves.toMatchObject({ status: "ready" });
  });

  it("does not request a product cart before wallet activation", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    const getCart = vi.fn<GetCart>().mockResolvedValue("created-cart-reference");
    const request = adapterRequest(productPurchase(), { getCart });

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);

    expect(getCart).not.toHaveBeenCalled();
    const datasourceOptions = mocks.runtime.createDatasource.mock.calls[0]![0];
    expect(datasourceOptions.resolveCartId).toBeUndefined();
    await expect(datasourceOptions.createCart?.("apple_pay")).resolves.toBe(
      "created-cart-reference",
    );
    expect(getCart).toHaveBeenCalledWith({
      purchase: request.purchase,
      wallet: "apple_pay",
      signal: expect.any(AbortSignal),
    });
    const cartTokenSource = mocks.runtime.createSurfaceAdapter.mock.calls[0]![0];
    expect(cartTokenSource()).toBe("created-cart-reference");

    mocks.child.emitOutcome({ rendered: ["apple_pay"], failed: [] });
    await expect(result).resolves.toMatchObject({ status: "ready" });
  });

  it("fails closed when existing-cart context is unresolved", async () => {
    const mocked = mockRuntime();
    mocked.runtime.resolveCartContext.mockResolvedValueOnce(
      undefined as unknown as Awaited<ReturnType<PortableWalletsRuntime["resolveCartContext"]>>,
    );
    const mocks = mockServices(bootstrapResult({ purchaseContext: undefined }), mocked);
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest(cartPurchase(), { getCart: undefined });

    const failure = await adapter.start(request).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Private wallet adapter initialization failed.");
    expect(request.mount.childElementCount).toBe(0);
    expect(mocks.runtime.createChild).not.toHaveBeenCalled();
  });

  it("normalizes empty and failed render outcomes", async () => {
    const failedMocks = mockServices();
    const failedAdapter = createPortableWalletsAdapter(failedMocks.services);
    const failedRequest = adapterRequest();
    const failedResult = failedAdapter.start(failedRequest);
    await waitForMount(failedMocks.child.element, failedRequest.mount);
    failedMocks.child.emitOutcome({ rendered: [], failed: ["paypal"] });

    await expect(failedResult).resolves.toEqual({
      status: "unavailable",
      reason: "setup_error",
    });

    const emptyMocks = mockServices();
    const emptyAdapter = createPortableWalletsAdapter(emptyMocks.services);
    const emptyRequest = adapterRequest();
    const emptyResult = emptyAdapter.start(emptyRequest);
    await waitForMount(emptyMocks.child.element, emptyRequest.mount);
    emptyMocks.child.emitOutcome({ rendered: [], failed: [] });

    await expect(emptyResult).resolves.toEqual({
      status: "unavailable",
      reason: "no_wallet",
    });
  });

  it("rejects malformed private render outcomes", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest();

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);
    mocks.child.emitOutcome({ rendered: [""], failed: [] });

    await expect(result).rejects.toThrow("Private wallet adapter initialization failed.");
    expect(request.mount.childElementCount).toBe(0);
  });

  it("cancels ignored bootstrap results when the source generation aborts", async () => {
    let resolveBootstrap!: (value: WalletBootstrapResult) => void;
    const pendingBootstrap = new Promise<WalletBootstrapResult>((resolve) => {
      resolveBootstrap = resolve;
    });
    const mocks = mockServices();
    mocks.bootstrapClient.load.mockReturnValueOnce(pendingBootstrap);
    const adapter = createPortableWalletsAdapter(mocks.services);
    const source = new AbortController();
    const request = adapterRequest(productPurchase(), { signal: source.signal });

    const result = adapter.start(request);
    source.abort();
    resolveBootstrap(bootstrapResult());

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.runtimeLoader.load).not.toHaveBeenCalled();
    expect(request.mount.childElementCount).toBe(0);
  });

  it("stop removes a mounted child and rejects its pending outcome", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest();

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);
    adapter.stop?.();

    expect(request.mount.childElementCount).toBe(0);
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("forwards private terminal errors without allowing observer failures to escape", async () => {
    const mocks = mockServices();
    mocks.terminalError.mockImplementation(() => {
      throw new Error("observer failure");
    });
    const adapter = createPortableWalletsAdapter(mocks.services);
    const request = adapterRequest();

    const result = adapter.start(request);
    await waitForMount(mocks.child.element, request.mount);
    mocks.child.emitError("provider_unavailable", "Try again");
    const checkoutRequest = mocks.createCheckoutClient.mock.calls[0]![0];
    expect(() =>
      checkoutRequest.onTerminalError({
        wallet: "apple_pay",
        errorCode: "authorization_failed",
        localizedMessage: "Not authorized",
      }),
    ).not.toThrow();

    expect(mocks.terminalError).toHaveBeenNthCalledWith(1, {
      errorCode: "provider_unavailable",
      localizedMessage: "Try again",
    });
    expect(mocks.terminalError).toHaveBeenNthCalledWith(2, {
      wallet: "apple_pay",
      errorCode: "authorization_failed",
      localizedMessage: "Not authorized",
    });

    mocks.child.emitOutcome({ rendered: ["apple_pay"], failed: [] });
    await expect(result).resolves.toMatchObject({ status: "ready" });

    adapter.stop?.();
    mocks.child.emitError("stale_child_error");
    checkoutRequest.onTerminalError({
      wallet: "paypal",
      errorCode: "stale_client_error",
    });
    expect(mocks.terminalError).toHaveBeenCalledTimes(2);
  });

  it("redacts initialization failures", async () => {
    const mocks = mockServices();
    mocks.runtimeLoader.load.mockRejectedValueOnce(
      new Error("private runtime URL and authorization details"),
    );
    const adapter = createPortableWalletsAdapter(mocks.services);

    const failure = await adapter.start(adapterRequest()).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Private wallet adapter initialization failed.");
    expect((failure as Error).message).not.toContain("authorization details");
    expect(failure).not.toHaveProperty("cause");
  });

  it("drives the public element through the same private adapter interface", async () => {
    const mocks = mockServices();
    const adapter = createPortableWalletsAdapter(mocks.services);
    setWalletAdapterFactoryForTesting(() => adapter);
    const getCart = vi.fn<GetCart>().mockResolvedValue("created-cart-reference");
    const render = vi.fn();
    const element = document.createElement(tagName);

    element.addEventListener("shopify:express-checkouts:render", render);
    element.configure({
      storeDomain: "example.myshopify.com",
      country: "CA",
      locale: "en-CA",
      currency: "CAD",
      variantId: "gid://shopify/ProductVariant/1",
      getCart,
    });
    document.body.append(element);

    const mount = element.shadowRoot?.querySelector<HTMLElement>('[part="root"]');
    if (!mount) throw new Error("Expected private mount");
    await waitForMount(mocks.child.element, mount);
    mocks.child.emitOutcome({ rendered: ["shop_pay"], failed: ["apple_pay"] });

    await vi.waitFor(() => expect(element.availability.state).toBe("ready"));
    expect(element.availability).toEqual({
      state: "ready",
      wallets: ["shop_pay"],
      failed: ["apple_pay"],
    });
    const detail = (render.mock.calls[0]![0] as CustomEvent<WalletRenderEventDetail>).detail;
    expect(detail.availability).toEqual(element.availability);
  });
});
