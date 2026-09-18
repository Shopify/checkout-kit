import { formatValue, type Refs } from "../dom";
import type { AppState } from "../state";
import { renderLogEntries } from "./log-entries";

export function renderLog(refs: Refs, state: AppState): void {
  refs.stateCheckout.textContent = formatValue(state.component.checkout);
  refs.stateError.textContent = formatValue(state.component.error);
  refs.stateTarget.textContent = formatValue(state.target);
  refs.stateAppearance.textContent = formatValue(state.appearance);
  refs.stateLogLevel.textContent = formatValue(state.logLevel);

  renderLogEntries(refs.eventLog, state.log);

  refs.layout.classList.toggle("events-collapsed", state.eventsCollapsed);
  refs.eventsToggle.setAttribute("aria-expanded", String(!state.eventsCollapsed));
  refs.eventsToggle.setAttribute(
    "aria-label",
    state.eventsCollapsed ? "Show events panel" : "Hide events panel",
  );
}
