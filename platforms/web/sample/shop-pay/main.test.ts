import type { ShopPay } from "@shopify/checkout-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@shopify/checkout-kit/shop-pay";

import { SAMPLE_API_PATHS } from "../universal-session/api";

const NAV = `<header class="topbar">
  <div>
    <h1>Checkout Kit</h1>
    <p class="subtitle">Shop Pay Playground</p>
    <p id="checkout-kit-provenance" class="subtitle">SDK loading…</p>
  </div>
</header>`;

const DOMAIN = "your-store.myshopify.com";
const CONTINUE_URL = "https://shop.app/checkouts/uc/session-1?key=synthetic-session-key";
// Like the real page: the app renders the layout into an empty <main>.
const BODY = `${NAV}<main id="layout"></main>`;

const PRODUCTS = {
  products: [
    { title: "Synthetic tee", vendor: "Example", variants: [{ id: 101, price: "20.00" }] },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let sessionResponse: () => Response;
const fetcher = vi.fn<typeof fetch>(async (input) => {
  const url = String(input);
  if (url === SAMPLE_API_PATHS.configuration) {
    return json({ storefrontDomain: DOMAIN, storeDomains: [DOMAIN], environments: ["production"] });
  }
  if (url === `https://${DOMAIN}/products.json`) return json(PRODUCTS);
  if (url.startsWith(SAMPLE_API_PATHS.currency)) return json({ currencyCode: "CAD" });
  if (url === SAMPLE_API_PATHS.session) return sessionResponse();
  return json({}, 404);
});

const $ = <T extends Element = HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`missing ${selector}`);
  return element;
};
const shopPay = () => $<ShopPay>("shop-pay");
const status = () => $("#session-status").textContent;

async function start(): Promise<void> {
  await import("./main");
  // Load the configured storefront, then its products after the debounce.
  await vi.advanceTimersByTimeAsync(600);
}

async function addProductAndPrepare(): Promise<void> {
  $<HTMLButtonElement>("#product-list [data-cart-action='add']").click();
  $<HTMLButtonElement>("#prepare-session").click();
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.stubGlobal("fetch", fetcher);
  localStorage.clear();
  document.body.innerHTML = BODY ?? "";
  sessionResponse = () => json({ continueUrl: CONTINUE_URL, currencyCode: "CAD" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetcher.mockClear();
});

describe("Shop Pay playground", () => {
  it("loads the configured storefront and waits for a cart", async () => {
    await start();

    // Store should be loaded from configuration.
    expect($("#stores-list").children).toHaveLength(1);
    expect($("#product-list").textContent).toContain("Synthetic tee");
    expect($<HTMLButtonElement>("#prepare-session").disabled).toBe(true);
    expect(shopPay().hasAttribute("src")).toBe(false);
    expect(shopPay().button).toBe(false);
    expect($("#shop-pay-placeholder").hidden).toBe(false);
  });

  it("prepares a session and shows Shop Pay's button", async () => {
    await start();
    await addProductAndPrepare();

    const request = fetcher.mock.calls.find(([url]) => url === SAMPLE_API_PATHS.session);
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      environment: "production",
      stores: [{ domain: DOMAIN, lines: [{ variantId: "101", quantity: 1 }] }],
    });
    expect(shopPay().src).toBe(CONTINUE_URL);
    expect(shopPay().button).toBe(true);
    expect(shopPay().shadowRoot?.querySelector(".shop-pay-button")).not.toBeNull();
    expect($("#shop-pay-placeholder").hidden).toBe(true);
    expect(status()).toBe("Session ready for 1 store in CAD. Tap Shop Pay's button to open it.");
    // The keyed URL is given to the element but never displayed.
    expect(document.body.textContent).not.toContain("synthetic-session-key");
  });

  it("discards the session when the cart changes", async () => {
    await start();
    await addProductAndPrepare();

    $<HTMLButtonElement>("#selected-lines [data-cart-action='increment']").click();

    expect(shopPay().hasAttribute("src")).toBe(false);
    expect(shopPay().button).toBe(false);
    expect($<HTMLButtonElement>("#prepare-session").disabled).toBe(false);
  });

  it("uses the page's own button when the button attribute is off", async () => {
    await start();
    const toggle = $<HTMLInputElement>("#shop-pay-button");
    toggle.click();
    await addProductAndPrepare();

    const hostButton = $<HTMLButtonElement>("#host-pay");
    expect(shopPay().button).toBe(false);
    expect(hostButton.hidden).toBe(false);
    expect(hostButton.disabled).toBe(false);
    expect(status()).toContain("Click Buy with Shop Pay");

    const open = vi.spyOn(shopPay(), "open").mockImplementation(() => {});
    hostButton.click();
    expect(open).toHaveBeenCalledOnce();
  });

  it("explains a failed preparation", async () => {
    sessionResponse = () => json({ error: "session_ineligible", stage: "session" }, 422);
    await start();
    await addProductAndPrepare();

    expect($("#session-status").dataset["tone"]).toBe("error");
    expect(status()).toContain("session_ineligible");
    expect($<HTMLButtonElement>("#prepare-session").disabled).toBe(false);
  });

  it("logs events and lets the buyer prepare again after a completed session closes", async () => {
    await start();
    await addProductAndPrepare();

    shopPay().dispatchEvent(new CustomEvent("complete", { detail: [] }));
    expect(status()).toContain("Shop Pay completed this session");
    expect(shopPay().src).toBe(CONTINUE_URL);

    shopPay().dispatchEvent(new CustomEvent("close", { detail: null }));
    expect(status()).toBe("Shop Pay completed the last session. Prepare again for a new order.");
    expect(shopPay().hasAttribute("src")).toBe(false);
    expect($<HTMLButtonElement>("#prepare-session").disabled).toBe(false);

    const names = [...document.querySelectorAll(".event-entry-name")].map((el) => el.textContent);
    expect(names).toEqual(["close", "complete"]);
  });

  it("opens a pasted session without saving it", async () => {
    await start();
    const manual = $<HTMLInputElement>("input[name='source-mode'][value='manual']");
    manual.click();
    const input = $<HTMLInputElement>("#manual-src");
    input.value = CONTINUE_URL;
    input.dispatchEvent(new Event("input"));

    expect($("#workspace").dataset["mode"]).toBe("manual");
    expect($("#storefront-fields").hidden).toBe(true);
    expect($("#prepare-session").hidden).toBe(true);
    expect(shopPay().src).toBe(CONTINUE_URL);
    expect(shopPay().button).toBe(true);
    expect($("#state-src").textContent).toBe(
      "https://shop.app/checkouts/uc/session-1?… (key hidden)",
    );
    const stored = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.getItem(localStorage.key(index) ?? ""),
    );
    expect(stored.join(" ")).not.toContain("synthetic-session-key");
  });
});
