// Registers `<shopify-checkout>` (same entry as published `@shopify/checkout-kit`).
import "@shopify/checkout-kit";
import type { ShopifyCheckout } from "@shopify/checkout-kit";

import "./styles.css";

// ───── Helpers ─────────────────────────────────────────────────────────────

function $<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`[playground] element not found: ${selector}`);
  }
  return el;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

// ───── DOM references ──────────────────────────────────────────────────────

const form = $<HTMLFormElement>("#options-form");
const eventLog = $<HTMLUListElement>("#event-log");
const clearLogButton = $<HTMLButtonElement>("#clear-log");
const buyNowButton = $<HTMLButtonElement>("#buy-now");
const buyHint = $<HTMLParagraphElement>("#buy-hint");

const stateNodes = {
  checkout: $<HTMLElement>("#state-checkout"),
  error: $<HTMLElement>("#state-error"),
  target: $<HTMLElement>("#state-target"),
  debug: $<HTMLElement>("#state-debug"),
};

// ───── Mount the component (off-layout) ───────────────────────────────────
//
// In real merchant integrations the <shopify-checkout> element lives wherever
// it makes sense in the page. For popup / auto targets it has no visible UI
// of its own beyond a transient dialog scrim that appears when open() is
// called, so we attach it to <body> and leave the storefront panel free for
// the merchant's product UI.

const checkout = document.createElement("shopify-checkout") as ShopifyCheckout;
document.body.append(checkout);

const checkoutEl: HTMLElement = checkout;

// ───── Form ↔ attributes ──────────────────────────────────────────────────

function setStringAttribute(el: HTMLElement, name: string, value: FormDataEntryValue | null): void {
  if (typeof value === "string" && value.length > 0) {
    el.setAttribute(name, value);
  } else {
    el.removeAttribute(name);
  }
}

function syncAttributes(): void {
  const data = new FormData(form);
  setStringAttribute(checkout, "src", data.get("src"));
  setStringAttribute(checkout, "target", data.get("target"));
  if (data.has("debug")) {
    checkout.setAttribute("debug", "");
  } else {
    checkout.removeAttribute("debug");
  }

  refreshBuyButton(data.get("src"));
}

function refreshBuyButton(src: FormDataEntryValue | null): void {
  const hasSrc = typeof src === "string" && src.length > 0;
  buyNowButton.disabled = !hasSrc;
  buyHint.style.display = hasSrc ? "none" : "";
}

form.addEventListener("input", syncAttributes);
form.addEventListener("change", syncAttributes);
syncAttributes();

// ───── Methods (Buy now + manual debug buttons) ───────────────────────────

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-method]");
  if (!button || button.disabled) return;

  switch (button.dataset["method"]) {
    case "open":
      checkout.open();
      break;
    case "close":
      checkout.close();
      break;
    case "focus":
      checkout.focus();
      break;
    default:
      break;
  }
});

// ───── Variant swatches (visual only) ─────────────────────────────────────

const swatches = document.querySelectorAll<HTMLButtonElement>(".swatch");
for (const swatch of swatches) {
  swatch.addEventListener("click", () => {
    for (const other of swatches) {
      other.setAttribute("aria-pressed", "false");
    }
    swatch.setAttribute("aria-pressed", "true");
  });
}

// ───── Event log ──────────────────────────────────────────────────────────

/** Dispatched by `ShopifyCheckout` (see `src/checkout.ts`). */
const EVENT_TYPES = [
  "checkout:start",
  "checkout:complete",
  "checkout:close",
  "checkout:error",
  "checkout:lineItemsChange",
  "checkout:buyerChange",
  "checkout:totalsChange",
  "checkout:messagesChange",
] as const;

const RESPONDABLE_EVENTS = new Set<string>([]);

for (const type of EVENT_TYPES) {
  checkoutEl.addEventListener(type, () => {
    appendLog(type);
    refreshState();
  });
}

clearLogButton.addEventListener("click", () => {
  eventLog.replaceChildren();
});

function snapshotState(): Record<string, unknown> {
  return {
    checkout: checkout.checkout,
    error: checkout.error,
    target: checkout.target,
    debug: checkout.debug,
  };
}

function refreshState(): void {
  stateNodes.checkout.textContent = formatValue(checkout.checkout);
  stateNodes.error.textContent = formatValue(checkout.error);
  stateNodes.target.textContent = formatValue(checkout.target);
  stateNodes.debug.textContent = formatValue(checkout.debug);
}

function appendLog(type: string): void {
  const li = document.createElement("li");
  li.className = "event-entry";

  const header = document.createElement("header");
  header.className = "event-entry-header";

  const name = document.createElement("span");
  name.className = "event-entry-name";
  name.textContent = type;
  header.append(name);

  if (RESPONDABLE_EVENTS.has(type)) {
    const badge = document.createElement("span");
    badge.className = "event-entry-badge";
    badge.textContent = "respondable";
    header.append(badge);
  }

  const time = document.createElement("time");
  time.className = "event-entry-time";
  time.textContent = timestamp();
  header.append(time);

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(snapshotState(), null, 2);

  li.append(header, pre);
  eventLog.prepend(li);
}
