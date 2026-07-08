import { formatValue, type Refs } from "../dom";
import type { AppState, LogEntry } from "../state";

function buildLogEntry(entry: LogEntry): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "event-entry";

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

  const pre = document.createElement("pre");
  pre.textContent = entry.snapshot;

  li.append(header, pre);
  return li;
}

export function renderLog(refs: Refs, state: AppState): void {
  refs.stateCheckout.textContent = formatValue(state.component.checkout);
  refs.stateError.textContent = formatValue(state.component.error);
  refs.stateTarget.textContent = formatValue(state.target);
  refs.stateAppearance.textContent = formatValue(state.appearance);
  refs.stateDebug.textContent = formatValue(state.debug);

  refs.eventLog.replaceChildren();
  for (const entry of state.log) {
    refs.eventLog.append(buildLogEntry(entry));
  }
}
