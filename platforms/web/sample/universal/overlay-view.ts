import type { DisplayEvent, EventHistorySnapshot } from "./event-history";

export interface OverlayView {
  readonly surface: HTMLElement;
  readonly focusButton: HTMLButtonElement;
  readonly closeButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
  readonly hostClearButton: HTMLButtonElement;
  render(snapshot: EventHistorySnapshot): void;
  dispose(): void;
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function eventItem(entry: DisplayEvent): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "event-entry uc-event-entry";
  item.dataset["entryId"] = String(entry.id);

  const disclosure = document.createElement("details");
  const summary = document.createElement("summary");
  summary.className = "uc-event-summary";

  const name = document.createElement("span");
  name.className = "event-entry-name";
  name.textContent = entry.name;
  const resource = document.createElement("span");
  resource.className = "uc-event-resource";
  resource.textContent = entry.label;
  const status = document.createElement("span");
  status.className = "uc-event-status";
  status.textContent = entry.status;
  const time = document.createElement("time");
  time.className = "event-entry-time";
  time.textContent = entry.time;

  summary.append(name, resource, status, time);
  const attribution = document.createElement("p");
  attribution.className = "uc-event-attribution";
  attribution.textContent = "Received from Checkout Kit · redacted display";
  const detail = document.createElement("pre");
  detail.textContent = entry.detail;
  disclosure.append(summary, attribution, detail);
  item.append(disclosure);
  return item;
}

/** Reuse existing nodes so a focused/expanded event stays put during later events. */
function renderTimeline(list: HTMLElement, entries: readonly DisplayEvent[]): void {
  const wanted = new Set(entries.map((entry) => String(entry.id)));
  const present = new Map<string, HTMLElement>();
  for (const child of Array.from(list.children)) {
    const element = child as HTMLElement;
    const key = element.dataset["entryId"];
    if (!key || !wanted.has(key)) element.remove();
    else present.set(key, element);
  }
  for (const entry of entries) {
    if (!present.has(String(entry.id))) list.append(eventItem(entry));
  }
}

function renderResources(list: HTMLElement, snapshot: EventHistorySnapshot): void {
  const items: HTMLLIElement[] = [];
  for (const resource of snapshot.resources) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = resource.label;
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = resource.status;
    const extra = document.createElement("span");
    extra.className = "muted";
    const lines =
      resource.lineItemCount === null
        ? "line items unavailable"
        : `${resource.lineItemCount} ${resource.lineItemCount === 1 ? "line item" : "line items"}`;
    extra.textContent = resource.currency ? `${lines} · ${resource.currency}` : lines;
    item.append(name, status, extra);
    const error = snapshot.errors.find(
      (entry) => entry.scope === "resource" && entry.label === resource.label,
    );
    if (error) {
      const errorStatus = document.createElement("span");
      errorStatus.className = "uc-resource-error";
      errorStatus.textContent = `Error: ${error.code}`;
      item.append(errorStatus);
    }
    items.push(item);
  }
  list.replaceChildren(...items);
}

export function createOverlayView(options: {
  readonly hostLog: HTMLElement;
  readonly hostHeader: HTMLElement;
  readonly hostNotice: HTMLElement;
  readonly onFocus: () => void;
  readonly onClose: () => void;
  readonly onClear: () => void;
}): OverlayView {
  const surface = document.createElement("section");
  surface.className = "uc-overlay-surface";
  surface.slot = "overlay";
  surface.setAttribute("aria-label", "Universal checkout activity");

  const header = document.createElement("header");
  header.className = "uc-overlay-header";
  const headingGroup = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "uc-overlay-eyebrow";
  eyebrow.textContent = "Checkout Kit · received events";
  const heading = document.createElement("h2");
  heading.textContent = "Universal checkout activity";
  headingGroup.append(eyebrow, heading);
  const controls = document.createElement("div");
  controls.className = "uc-overlay-controls";
  const focusButton = button("Focus checkout", "secondary-action");
  const closeButton = button("Close checkout", "secondary-action");
  controls.append(focusButton, closeButton);
  header.append(headingGroup, controls);

  const notice = document.createElement("p");
  notice.className = "uc-overlay-notice";
  notice.setAttribute("role", "status");

  const resourceSection = document.createElement("section");
  resourceSection.className = "uc-overlay-resources";
  const resourceHeading = document.createElement("h3");
  resourceHeading.textContent = "Resource state";
  const resourceEmpty = document.createElement("p");
  resourceEmpty.className = "muted";
  resourceEmpty.textContent = "No checkout state received yet.";
  const resourceList = document.createElement("ol");
  resourceList.setAttribute("aria-label", "Checkout resources");
  resourceSection.append(resourceHeading, resourceEmpty, resourceList);

  const activitySection = document.createElement("section");
  activitySection.className = "uc-overlay-activity";
  const activityHeader = document.createElement("div");
  activityHeader.className = "uc-overlay-activity-header";
  const activityHeading = document.createElement("h3");
  activityHeading.textContent = "Event timeline";
  const clearButton = button("Clear events", "secondary-action");
  activityHeader.append(activityHeading, clearButton);
  const overlayLog = document.createElement("ol");
  overlayLog.className = "uc-overlay-event-log";
  overlayLog.setAttribute("aria-label", "Checkout Kit received events");
  const overlayEmpty = document.createElement("p");
  overlayEmpty.className = "muted";
  overlayEmpty.textContent = "Received checkout events appear here.";
  activitySection.append(activityHeader, overlayLog, overlayEmpty);

  surface.append(header, notice, resourceSection, activitySection);

  const hostClearButton = button("Clear", "secondary-action uc-event-clear");
  hostClearButton.setAttribute("aria-label", "Clear received checkout events");
  options.hostHeader.append(hostClearButton);

  focusButton.addEventListener("click", options.onFocus);
  closeButton.addEventListener("click", options.onClose);
  clearButton.addEventListener("click", options.onClear);
  hostClearButton.addEventListener("click", options.onClear);

  return {
    surface,
    focusButton,
    closeButton,
    clearButton,
    hostClearButton,
    render(snapshot) {
      heading.textContent =
        snapshot.presentation === 0
          ? "Universal checkout activity"
          : `Universal checkout · presentation ${snapshot.presentation}`;
      notice.textContent = snapshot.notice;
      options.hostNotice.textContent = snapshot.notice;
      resourceEmpty.hidden = snapshot.resources.length > 0;
      renderResources(resourceList, snapshot);
      renderTimeline(overlayLog, snapshot.entries);
      renderTimeline(options.hostLog, snapshot.entries);
      overlayEmpty.hidden = snapshot.entries.length > 0;
      clearButton.disabled = snapshot.entries.length === 0;
      hostClearButton.disabled = snapshot.entries.length === 0;
    },
    dispose() {
      focusButton.removeEventListener("click", options.onFocus);
      closeButton.removeEventListener("click", options.onClose);
      clearButton.removeEventListener("click", options.onClear);
      hostClearButton.removeEventListener("click", options.onClear);
      hostClearButton.remove();
    },
  };
}
