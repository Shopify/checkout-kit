import { isCheckoutEnvironment, type CheckoutEnvironment } from "../../universal-session/api";
import type { Refs } from "../dom";
import type { AppState } from "../state";

const ENVIRONMENT_LABELS: Record<CheckoutEnvironment, string> = {
  production: "Production",
  development: "Local development",
};

export function renderSettings(refs: Refs, state: AppState): void {
  const isManual = state.sourceMode === "manual";
  refs.storefrontFields.hidden = isManual;
  refs.sessionFields.hidden = isManual;
  refs.workspace.dataset["mode"] = state.sourceMode;

  // Label environments without a session endpoint once the server reports them.
  const configuration = state.configuration;
  for (const option of refs.environmentInput.options) {
    if (!isCheckoutEnvironment(option.value)) continue;
    const missing =
      configuration.status === "loaded" && !configuration.environments.includes(option.value);
    option.textContent = `${ENVIRONMENT_LABELS[option.value]}${missing ? " (not configured)" : ""}`;
  }

  refs.layout.classList.toggle("settings-collapsed", state.settingsCollapsed);
  refs.settingsToggle.setAttribute("aria-expanded", String(!state.settingsCollapsed));
  refs.settingsToggle.setAttribute(
    "aria-label",
    state.settingsCollapsed ? "Show settings panel" : "Hide settings panel",
  );

  // Render the stores list.
  renderStoresList(refs, state);
}

function renderStoresList(refs: Refs, state: AppState): void {
  refs.storesList.replaceChildren();

  if (state.stores.length === 0) {
    refs.storesList.style.display = "none";
    return;
  }

  refs.storesList.style.display = "";

  for (const store of state.stores) {
    const item = document.createElement("li");
    item.className = "store-item";
    item.dataset["domain"] = store.domain;

    const domainSpan = document.createElement("span");
    domainSpan.className = "store-domain";
    domainSpan.textContent = store.domain;

    const statusSpan = document.createElement("span");
    statusSpan.className = "store-status";
    if (store.loadState === "loading") {
      statusSpan.textContent = "Loading…";
    } else if (store.loadState === "failed") {
      // The store's product section explains the failure; keep the list row short.
      statusSpan.textContent = "Couldn't load";
      statusSpan.classList.add("store-status-error");
    } else {
      const count = store.variants.length;
      statusSpan.textContent = `${count} ${count === 1 ? "product" : "products"}`;
    }

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "store-remove";
    removeButton.dataset["storeAction"] = "remove";
    removeButton.setAttribute("aria-label", `Remove ${store.domain}`);
    removeButton.textContent = "×";

    item.append(domainSpan, statusSpan, removeButton);
    refs.storesList.append(item);
  }
}
