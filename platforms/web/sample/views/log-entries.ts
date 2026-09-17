import type { LogEntry } from "../state";

/**
 * Build a single `<li class="event-entry">` node.
 *
 * When `fresh` is `true` the node carries a `data-fresh` attribute that
 * triggers the CSS `event-flash` animation. The attribute is removed
 * automatically once the animation finishes so the entry settles into
 * its normal style.
 */
export function buildLogEntry(entry: LogEntry, fresh: boolean): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "event-entry";

  if (fresh) {
    li.setAttribute("data-fresh", "");
    li.addEventListener("animationend", () => li.removeAttribute("data-fresh"), { once: true });
  }

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

/**
 * Incrementally sync the `<ul id="event-log">` DOM with the state log
 * array. New entries (always prepended to `log`) are inserted at the top
 * with the flash animation. When the log shrinks (clear button) the
 * list is rebuilt without animation.
 */
export function renderLogEntries(eventLog: HTMLUListElement, log: readonly LogEntry[]): void {
  const existingCount = eventLog.children.length;
  const newCount = log.length - existingCount;

  // Log was cleared (or is shorter for any reason) — full rebuild, no flash.
  if (newCount < 0) {
    eventLog.replaceChildren();
    for (const entry of log) {
      eventLog.append(buildLogEntry(entry, false));
    }
    return;
  }

  // Nothing new.
  if (newCount === 0) return;

  // Prepend genuinely new entries with the flash.
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < newCount; i++) {
    const entry = log[i];
    if (entry) fragment.append(buildLogEntry(entry, true));
  }
  eventLog.prepend(fragment);
}
