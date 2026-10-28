import type { Refs } from "../dom";
import type { SamplePage } from "../page";
import type { AppState, LogEntry } from "../state";
import { redactSource } from "../summary";

function buildLogEntry(entry: LogEntry): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "event-entry";
  li.dataset["type"] = entry.type;

  const header = document.createElement("header");
  header.className = "event-entry-header";

  const name = document.createElement("span");
  name.className = "event-entry-name";
  name.textContent = entry.type;
  header.append(name);

  const time = document.createElement("time");
  time.className = "event-entry-time";
  time.textContent = entry.time;
  header.append(time);
  li.append(header);

  if (entry.summary) {
    const summary = document.createElement("p");
    summary.className = "event-entry-summary";
    summary.textContent = entry.summary;
    li.append(summary);
  }

  const pre = document.createElement("pre");
  pre.textContent = entry.snapshot;
  li.append(pre);
  return li;
}

/** Component state, read from the element itself, above the event log. */
export function renderRuntime(
  refs: Refs,
  state: AppState,
  element: HTMLElement & { src: string; target: string; logLevel: string; button?: boolean },
  page: SamplePage,
): void {
  refs.stateSrc.textContent = redactSource(element.src);
  if (page.button && refs.stateButton) {
    refs.stateButton.textContent = String(element.button ?? false);
  }
  refs.stateTarget.textContent = element.target;
  refs.stateLogLevel.textContent = element.logLevel;

  refs.eventLog.replaceChildren(...state.log.map(buildLogEntry));

  refs.layout.classList.toggle("events-collapsed", state.eventsCollapsed);
  refs.eventsToggle.setAttribute("aria-expanded", String(!state.eventsCollapsed));
  refs.eventsToggle.setAttribute(
    "aria-label",
    state.eventsCollapsed ? "Show events panel" : "Hide events panel",
  );
}
