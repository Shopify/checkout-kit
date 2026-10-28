import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@shopify/checkout-kit/shop-pay";
import "@shopify/checkout-kit/shopify-universal-checkout";

import { SAMPLE_API_PATHS } from "./api";
import { startSessionSample } from "./app";
import type { SamplePage } from "./page";

const SHOP_PAY: SamplePage = {
  tag: "shop-pay",
  productName: "Shop Pay",
  storagePrefix: "checkout-kit:shop-pay-demo",
  button: true,
};
const UNIVERSAL: SamplePage = {
  tag: "shopify-universal-checkout",
  productName: "Universal Checkout",
  storagePrefix: "checkout-kit:universal-demo",
  button: false,
};

const DOMAIN = "store-one.myshopify.com";
const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-session-key";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

const fetcher = vi.fn<typeof fetch>(async (input) => {
  const url = String(input);
  if (url === SAMPLE_API_PATHS.configuration) {
    return json({ storeDomains: [], environments: ["production"] });
  }
  if (url.startsWith(`https://${DOMAIN}/products.json`)) {
    return json({
      products: [
        { title: "Synthetic tee", vendor: "Example", variants: [{ id: 101, price: "20.00" }] },
      ],
    });
  }
  if (url.startsWith(SAMPLE_API_PATHS.currency)) return json({ currencyCode: "CAD" });
  if (url === SAMPLE_API_PATHS.session)
    return json({ continueUrl: CONTINUE_URL, currencyCode: "CAD" });
  return new Response("{}", { status: 404 });
});

const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
};

type SampleElement = HTMLElement & { src: string; open(): void };

/** Starts a page the way its main.ts does, from an empty layout. */
async function start(page: SamplePage): Promise<SampleElement> {
  document.body.innerHTML = `<p id="checkout-kit-provenance"></p><main id="layout"></main>`;
  startSessionSample(page);
  await vi.advanceTimersByTimeAsync(0);
  return $<SampleElement>(page.tag);
}

async function addStoreAndPrepare(): Promise<void> {
  if (!document.querySelector(`.store-item[data-domain="${DOMAIN}"]`)) {
    $<HTMLInputElement>("#storefront-domain").value = DOMAIN;
    $<HTMLButtonElement>("#add-store-button").click();
  }
  await vi.advanceTimersByTimeAsync(0);
  $<HTMLButtonElement>(
    `.store-products-section[data-domain="${DOMAIN}"] [data-cart-action='add']`,
  ).click();
  $<HTMLButtonElement>("#prepare-session").click();
  await vi.advanceTimersByTimeAsync(0);
}

/** A protocol batch from the checkout window, as the browser would deliver it. */
function sendProtocol(source: object, origin = "https://shop.app"): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: [{ jsonrpc: "2.0", method: "ec.update", params: {} }],
      origin,
      source: source as Window,
    }),
  );
}

const protocolEntries = () => document.querySelectorAll("#protocol-log > li").length;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetcher);
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetcher.mockClear();
});

describe("session sample app", () => {
  it("restores the saved stores and keeps each page's settings apart", async () => {
    localStorage.setItem("checkout-kit:universal-demo:stores", JSON.stringify([DOMAIN]));

    await start(UNIVERSAL);
    expect(
      [...document.querySelectorAll(".store-item")].map(
        (item) => (item as HTMLElement).dataset["domain"],
      ),
    ).toEqual([DOMAIN]);
    expect($(`.store-products-section[data-domain="${DOMAIN}"] .product-card`)).toBeTruthy();

    document.body.innerHTML = "";
    await start(SHOP_PAY);
    expect(document.querySelectorAll(".store-item")).toHaveLength(0);
  });

  it("configures the Universal Checkout page without Shop Pay's button", async () => {
    const element = await start(UNIVERSAL);

    expect(element.tagName.toLowerCase()).toBe("shopify-universal-checkout");
    expect(document.querySelector("input[name='button']")).toBeNull();
    expect($("#layout").textContent).not.toContain("Shop Pay");

    await addStoreAndPrepare();
    const open = $<HTMLButtonElement>("#host-pay");
    expect(open.hidden).toBe(false);
    expect(open.textContent).toContain("Open Universal Checkout");
    expect(element.src).toBe(CONTINUE_URL);
    expect(localStorage.getItem("checkout-kit:universal-demo:button")).toBeNull();
  });

  it("records protocol messages after the page's own button opens checkout", async () => {
    const element = await start(UNIVERSAL);
    const open = vi.spyOn(element, "open").mockImplementation(() => {});
    const source = {};
    await addStoreAndPrepare();

    sendProtocol(source);
    expect(protocolEntries()).toBe(0);

    $<HTMLButtonElement>("#host-pay").click();
    expect(open).toHaveBeenCalledOnce();
    sendProtocol(source, "https://unrelated.example.test");
    sendProtocol(source);
    expect(protocolEntries()).toBe(1);

    // The host section keeps the messages after the checkout closes, until Clear.
    element.dispatchEvent(new CustomEvent("close", { detail: null }));
    sendProtocol(source);
    expect(protocolEntries()).toBe(1);
    $<HTMLButtonElement>("#clear-log").click();
    expect(protocolEntries()).toBe(0);
  });

  it("starts recording before Shop Pay's own button opens checkout", async () => {
    const element = await start(SHOP_PAY);
    const source = {};
    let recordedBeforeOpen: number | undefined;
    // Shop Pay's button calls open() on the element; a message sent from inside open() must
    // already be recorded.
    vi.spyOn(element, "open").mockImplementation(() => {
      sendProtocol(source);
      recordedBeforeOpen = protocolEntries();
    });
    await addStoreAndPrepare();

    $<HTMLButtonElement>(".shop-pay-button", element.shadowRoot!).click();

    expect(recordedBeforeOpen).toBe(1);
  });
});
