import type { WalletsRefs } from "../wallets-dom";
import type { WalletsAppState } from "../wallets-state";
import { renderLogEntries } from "./log-entries";

export function renderWalletsLog(refs: WalletsRefs, state: WalletsAppState): void {
  renderLogEntries(refs.eventLog, state.log);

  refs.layout.classList.toggle("events-collapsed", state.eventsCollapsed);
  refs.eventsToggle.setAttribute("aria-expanded", String(!state.eventsCollapsed));
  refs.eventsToggle.setAttribute(
    "aria-label",
    state.eventsCollapsed ? "Show events panel" : "Hide events panel",
  );
}
