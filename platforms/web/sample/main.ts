// Importing the package registers the <shopify-checkout> custom element
// as a side effect — once the component implementation lands. Today the
// package only exports `VERSION`, so the element below renders as an
// unknown HTML element and the playground produces no events at runtime.
import "../src";

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
  cart: $<HTMLElement>("#state-cart"),
  locale: $<HTMLElement>("#state-locale"),
  orderConfirmation: $<HTMLElement>("#state-order-confirmation"),
  error: $<HTMLElement>("#state-error"),
  sessionId: $<HTMLElement>("#state-session-id"),
};

// ───── Mount the component (off-layout) ───────────────────────────────────
//
// In real merchant integrations the <shopify-checkout> element lives wherever
// it makes sense in the page. For popup / auto targets it has no visible UI
// of its own beyond a transient dialog scrim that appears when open() is
// called, so we attach it to <body> and leave the storefront panel free for
// the merchant's product UI.

const checkout = document.createElement("shopify-checkout");
document.body.append(checkout);

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
  setStringAttribute(checkout, "color-scheme", data.get("color-scheme"));
  if (data.has("preload")) {
    checkout.setAttribute("preload", "");
  } else {
    checkout.removeAttribute("preload");
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

const EVENT_TYPES = [
  "checkout:start",
  "checkout:complete",
  "checkout:close",
  "checkout:error",
  "checkout:addressChangeStart",
  "checkout:paymentMethodChangeStart",
  "checkout:submitStart",
] as const;

const RESPONDABLE_EVENTS = new Set<string>([
  "checkout:addressChangeStart",
  "checkout:paymentMethodChangeStart",
  "checkout:submitStart",
]);

for (const type of EVENT_TYPES) {
  checkout.addEventListener(type, () => {
    appendLog(type);
    refreshState();
  });
}

clearLogButton.addEventListener("click", () => {
  eventLog.replaceChildren();
});

function snapshotState(): Record<string, unknown> {
  return {
    cart: checkout.cart,
    locale: checkout.locale,
    orderConfirmation: checkout.orderConfirmation,
    error: checkout.error,
    sessionId: checkout.sessionId,
  };
}

function refreshState(): void {
  stateNodes.cart.textContent = formatValue(checkout.cart);
  stateNodes.locale.textContent = formatValue(checkout.locale);
  stateNodes.orderConfirmation.textContent = formatValue(checkout.orderConfirmation);
  stateNodes.error.textContent = formatValue(checkout.error);
  stateNodes.sessionId.textContent = formatValue(checkout.sessionId);
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
