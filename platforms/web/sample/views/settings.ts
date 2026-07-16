import { normalizeStorefrontDomain } from "../cart";
import { setStringAttribute, type Refs } from "../dom";
import { selectActiveSourceUrl, type AppState } from "../state";

export function renderSettings(refs: Refs, state: AppState, checkout: HTMLElement): void {
  const isManual = state.sourceMode === "manual";
  refs.storefrontSourceFields.hidden = isManual;
  refs.buildWorkspace.hidden = isManual;
  refs.manualWorkspace.hidden = !isManual;

  const isInvalid =
    state.sourceMode === "build" && normalizeStorefrontDomain(state.storefrontDomain) === "";
  refs.storefrontInput.setAttribute("aria-invalid", String(isInvalid));

  const activeUrl = selectActiveSourceUrl(state);
  const hasSrc = activeUrl.length > 0;
  refs.cartCheckoutButton.disabled = state.sourceMode !== "build" || !hasSrc;
  refs.manualCheckoutButton.disabled = state.sourceMode !== "manual" || !hasSrc;
  refs.cartCheckoutHint.hidden = refs.cartCheckoutButton.disabled === false;

  refs.layout.classList.toggle("settings-collapsed", state.settingsCollapsed);
  refs.settingsToggle.setAttribute("aria-expanded", String(!state.settingsCollapsed));
  refs.settingsToggle.setAttribute(
    "aria-label",
    state.settingsCollapsed ? "Show settings panel" : "Hide settings panel",
  );

  setStringAttribute(checkout, "src", activeUrl);
  setStringAttribute(checkout, "target", state.target);
  setStringAttribute(checkout, "appearance", state.appearance);
  setStringAttribute(checkout, "log-level", state.logLevel);
}
