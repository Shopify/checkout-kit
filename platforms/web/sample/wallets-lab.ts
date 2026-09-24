import { setWalletAdapterFactoryForDevelopment, type WalletAdapter } from "../src/wallets-adapter";
import type { ShopifyAcceleratedCheckoutButtons } from "../src/wallets";
import type {
  WalletDisplayError,
  WalletErrorEventDetail,
  WalletRenderEventDetail,
} from "../src/wallets.types";
import {
  WalletLabAdapter,
  type WalletLabEvent,
  type WalletLabScenario,
  type WalletLabSettings,
} from "./wallets-lab-adapter";

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing wallet lab element: ${id}`);
  return element as T;
};

const form = byId<HTMLFormElement>("wallet-lab-form");
const elementMount = byId<HTMLDivElement>("wallet-element-mount");
const scenario = byId<HTMLSelectElement>("scenario");
const delay = byId<HTMLSelectElement>("adapter-delay");
const configurationApi = byId<HTMLSelectElement>("configuration-api");
const country = byId<HTMLSelectElement>("country");
const locale = byId<HTMLSelectElement>("locale");
const currency = byId<HTMLSelectElement>("currency");
const layout = byId<HTMLSelectElement>("layout");
const walletCount = byId<HTMLSelectElement>("wallet-count");
const sellingPlan = byId<HTMLInputElement>("selling-plan");
const availabilityBadge = byId<HTMLSpanElement>("availability-badge");
const surfaceHelp = byId<HTMLParagraphElement>("surface-help");
const flowDescription = byId<HTMLParagraphElement>("flow-description");
const stateAvailability = byId<HTMLElement>("state-availability");
const stateError = byId<HTMLElement>("state-error");
const stateFlow = byId<HTMLElement>("state-flow");
const stateApi = byId<HTMLElement>("state-api");
const configurationPreview = byId<HTMLElement>("configuration-preview");
const eventLog = byId<HTMLOListElement>("event-log");
const eventEmpty = byId<HTMLElement>("event-empty");
const eventCount = byId<HTMLElement>("event-count");
const releaseLoading = byId<HTMLButtonElement>("release-loading");
const notifyCart = byId<HTMLButtonElement>("notify-cart");
const burstCart = byId<HTMLButtonElement>("burst-cart");

const events: Array<{
  source: "action" | "adapter" | "callback" | "event" | "wallet";
  name: string;
  detail?: Record<string, boolean | number | string>;
}> = [];
let walletElement: ShopifyAcceleratedCheckoutButtons | undefined;
let activeAdapter: WalletLabAdapter | undefined;

function selectedFlow(): "cart" | "product" {
  const selected = form.querySelector<HTMLInputElement>('input[name="flow"]:checked');
  return selected?.value === "cart" ? "cart" : "product";
}

function settings(): WalletLabSettings {
  return {
    scenario: scenario.value as WalletLabScenario,
    delayMs: Number(delay.value),
  };
}

function record(
  source: "action" | "adapter" | "callback" | "event" | "wallet",
  name: string,
  detail?: Record<string, boolean | number | string>,
): void {
  events.unshift({ source, name, detail });
  events.splice(40);
  renderInspector();
}

function recordAdapter(event: WalletLabEvent): void {
  record(event.source, event.name, event.detail);
}

setWalletAdapterFactoryForDevelopment((): WalletAdapter => {
  activeAdapter = new WalletLabAdapter(settings, recordAdapter);
  return activeAdapter;
});

await import("@shopify/checkout-kit/wallets");

function merchantCallbacks() {
  return {
    ready: () => record("callback", "ready"),
    error: (error: WalletDisplayError | null) =>
      record(
        "callback",
        "error",
        error ? { phase: error.phase, code: error.code } : { cleared: true },
      ),
  };
}

function getCart() {
  return Promise.resolve("fixture-created-cart-reference");
}

function configureElement(element: ShopifyAcceleratedCheckoutButtons): void {
  const flow = selectedFlow();
  const common = {
    storeDomain: "fixture.myshopify.com",
    country: country.value,
    locale: locale.value,
    currency: currency.value,
    walletCount: Number(walletCount.value),
    layout: layout.value as "horizontal" | "vertical",
  };
  const product = {
    variantId: "gid://shopify/ProductVariant/1",
    sellingPlanId: sellingPlan.checked ? "gid://shopify/SellingPlan/1" : undefined,
    getCart,
  };

  switch (configurationApi.value) {
    case "properties":
      Object.assign(
        element,
        common,
        flow === "cart" ? { cartId: "fixture-cart-reference" } : product,
        {
          callbacks: merchantCallbacks(),
        },
      );
      break;
    case "attributes":
      element.setAttribute("store-domain", common.storeDomain);
      element.setAttribute("country", common.country);
      element.setAttribute("locale", common.locale);
      element.setAttribute("currency", common.currency);
      element.setAttribute("layout", common.layout);
      if (common.walletCount > 0) element.setAttribute("wallet-count", String(common.walletCount));
      if (flow === "cart") element.cartId = "fixture-cart-reference";
      else {
        element.setAttribute("variant-id", product.variantId);
        if (product.sellingPlanId) element.setAttribute("selling-plan-id", product.sellingPlanId);
        element.getCart = product.getCart;
      }
      element.callbacks = merchantCallbacks();
      break;
    default:
      element.configure({
        ...common,
        ...(flow === "cart" ? { cartId: "fixture-cart-reference" } : product),
        callbacks: merchantCallbacks(),
      });
  }
}

function mountElement(): void {
  walletElement?.remove();
  activeAdapter = undefined;

  const element = document.createElement(
    "shopify-accelerated-checkout-buttons",
  ) as ShopifyAcceleratedCheckoutButtons;
  element.addEventListener("shopify:express-checkouts:render", (event) => {
    const detail = (event as CustomEvent<WalletRenderEventDetail>).detail;
    record("event", "shopify:express-checkouts:render", {
      state: detail.availability.state,
    });
  });
  element.addEventListener("shopify:express-checkouts:error", (event) => {
    const error = (event as CustomEvent<WalletErrorEventDetail>).detail.error;
    record(
      "event",
      "shopify:express-checkouts:error",
      error ? { phase: error.phase, code: error.code } : { cleared: true },
    );
  });

  configureElement(element);
  walletElement = element;
  elementMount.replaceChildren(element);
  record("action", "element:mount", {
    flow: selectedFlow(),
    configuration: configurationApi.value,
  });
  renderInspector();
}

function publicConfiguration() {
  const flow = selectedFlow();
  return {
    storeDomain: "fixture.myshopify.com",
    country: country.value,
    locale: locale.value,
    currency: currency.value,
    flow,
    purchase:
      flow === "cart"
        ? { cartId: "[private property]" }
        : {
            variantId: "gid://shopify/ProductVariant/1",
            sellingPlanId: sellingPlan.checked ? "gid://shopify/SellingPlan/1" : undefined,
            getCart: "[function]",
          },
    walletCount: Number(walletCount.value),
    layout: layout.value,
  };
}

function renderInspector(): void {
  const availability = walletElement?.availability ?? { state: "loading" as const };
  const flow = selectedFlow();
  const error = walletElement?.error;

  availabilityBadge.dataset.state = availability.state;
  availabilityBadge.textContent = availability.state;
  stateAvailability.textContent =
    availability.state === "ready"
      ? `ready (${availability.wallets.join(", ")})`
      : availability.state;
  stateError.textContent = error ? `${error.phase}: ${error.code}` : "none";
  stateFlow.textContent = flow;
  stateApi.textContent =
    configurationApi.value === "configure" ? "configure()" : configurationApi.value;
  configurationPreview.textContent = JSON.stringify(publicConfiguration(), null, 2);

  flowDescription.textContent =
    flow === "cart"
      ? "The cart reference is assigned as a JavaScript property and never reflected into markup."
      : "Buy now creates a fixture cart only after wallet activation.";
  sellingPlan.disabled = flow === "cart";
  releaseLoading.disabled = scenario.value !== "slow-ready";
  notifyCart.disabled = flow !== "cart";
  burstCart.disabled = flow !== "cart";

  surfaceHelp.textContent = surfaceMessage(availability.state, error);
  eventLog.replaceChildren(
    ...events.map((entry) => {
      const item = document.createElement("li");
      item.dataset.source = entry.source;
      const name = document.createElement("code");
      name.textContent = `${entry.source}.${entry.name}`;
      item.append(name);
      if (entry.detail) {
        const detail = document.createElement("span");
        detail.className = "event-meta";
        detail.textContent = Object.entries(entry.detail)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(" · ");
        item.append(detail);
      }
      return item;
    }),
  );
  eventEmpty.hidden = events.length > 0;
  eventCount.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;
}

function surfaceMessage(
  state: "loading" | "ready" | "unavailable",
  error: WalletDisplayError | null | undefined,
): string {
  if (state === "loading") return "The adapter is resolving wallet availability.";
  if (state === "ready") return "Fixture wallet buttons are ready for interaction.";
  if (error) return `Unavailable with public error code: ${error.code}.`;
  return "No fixture wallet is available for this scenario.";
}

form.addEventListener("change", mountElement);
byId<HTMLButtonElement>("reset-lab").addEventListener("click", () => {
  form.reset();
  events.length = 0;
  mountElement();
});
byId<HTMLButtonElement>("clear-events").addEventListener("click", () => {
  events.length = 0;
  renderInspector();
});
releaseLoading.addEventListener("click", () => {
  record("action", "loading:release");
  activeAdapter?.release();
});
notifyCart.addEventListener("click", () => {
  record("action", "cartUpdated");
  walletElement?.cartUpdated();
});
burstCart.addEventListener("click", () => {
  record("action", "cartUpdated:burst", { count: 5 });
  for (let index = 0; index < 5; index += 1) walletElement?.cartUpdated();
});
byId<HTMLButtonElement>("remount-element").addEventListener("click", () => {
  if (!walletElement) return;
  record("action", "element:disconnect");
  walletElement.remove();
  queueMicrotask(() => {
    if (!walletElement) return;
    elementMount.append(walletElement);
    record("action", "element:remount");
  });
});
byId<HTMLButtonElement>("invalid-config").addEventListener("click", () => {
  record("action", "configuration:invalid");
  walletElement?.configure({
    cartId: undefined,
    variantId: "gid://shopify/ProductVariant/1",
    getCart: undefined,
  });
});

mountElement();
