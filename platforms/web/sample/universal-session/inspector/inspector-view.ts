import type { DisplayEvent, EventHistorySnapshot } from "./event-history";
import type { DisplayProtocolEvent } from "./protocol-history";

type TimelineEntry = DisplayEvent | DisplayProtocolEvent;

const KIT_ATTRIBUTION = "Received from Checkout Kit · redacted display";
const PROTOCOL_ATTRIBUTION = "Incoming protocol · redacted · may be rejected by Kit";

export interface InspectorView {
  readonly surface: HTMLElement;
  readonly focusButton: HTMLButtonElement;
  readonly closeButton: HTMLButtonElement;
  readonly clearButton: HTMLButtonElement;
  render(snapshot: EventHistorySnapshot, protocolEntries?: readonly DisplayProtocolEvent[]): void;
  dispose(): void;
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function eventItem(entry: TimelineEntry, attributionText: string): HTMLLIElement {
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
  attribution.textContent = attributionText;
  const detail = document.createElement("pre");
  detail.textContent = entry.detail;
  disclosure.append(summary, attribution, detail);
  item.append(disclosure);
  return item;
}

/** Reuse existing nodes so a focused/expanded event stays put during later events. */
function renderTimeline(
  list: HTMLElement,
  entries: readonly TimelineEntry[],
  attribution: string,
): void {
  const wanted = new Set(entries.map((entry) => String(entry.id)));
  const present = new Map<string, HTMLElement>();
  for (const child of Array.from(list.children)) {
    const element = child as HTMLElement;
    const key = element.dataset["entryId"];
    if (!key || !wanted.has(key)) element.remove();
    else present.set(key, element);
  }
  for (const entry of entries) {
    if (!present.has(String(entry.id))) list.append(eventItem(entry, attribution));
  }
}

function resourceStatus(status: string): string {
  if (status === "ejected") return "Ejected — cannot complete in this session";
  if (status === "failed") return "Failed — can retry";
  return status;
}

function renderResources(list: HTMLElement, snapshot: EventHistorySnapshot): void {
  const items: HTMLLIElement[] = [];
  for (const resource of snapshot.resources) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = resource.label;
    const status = document.createElement("span");
    status.className = "status-pill uc-resource-status";
    status.dataset["status"] = resource.status;
    status.textContent = resourceStatus(resource.status);
    const extra = document.createElement("span");
    extra.className = "muted";
    const lines =
      resource.lineItemCount === null
        ? "line items unavailable"
        : `${resource.lineItemCount} ${resource.lineItemCount === 1 ? "line item" : "line items"}`;
    extra.textContent = resource.currency ? `${lines} · ${resource.currency}` : lines;
    item.append(name, status, extra);
    const error = snapshot.errors.find((entry) => entry.resourceLabel === resource.label);
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

function sessionErrors(headingLevel: "h3" | "h4") {
  const section = document.createElement("section");
  section.className = "uc-session-errors";
  section.setAttribute("role", "status");
  section.hidden = true;
  const heading = document.createElement(headingLevel);
  heading.textContent = "Session errors";
  const list = document.createElement("ul");
  section.append(heading, list);
  return {
    section,
    render(snapshot: EventHistorySnapshot) {
      const errors = snapshot.errors.filter((entry) => entry.resourceLabel === undefined);
      section.hidden = errors.length === 0;
      list.replaceChildren(
        ...errors.map((entry) => {
          const item = document.createElement("li");
          item.textContent = `Session error: ${entry.code}`;
          return item;
        }),
      );
    },
  };
}

function eventColumn(options: {
  readonly protocol: boolean;
  readonly headingLevel: "h3" | "h4";
  readonly list?: HTMLElement;
  readonly empty?: HTMLElement;
}) {
  const section = document.createElement("section");
  section.className = "uc-event-column";
  const heading = document.createElement(options.headingLevel);
  heading.textContent = options.protocol ? "Protocol messages" : "Kit events";
  const attribution = options.protocol ? PROTOCOL_ATTRIBUTION : KIT_ATTRIBUTION;
  const description = document.createElement("p");
  description.className = "uc-event-column-description";
  description.textContent = attribution;
  const list = options.list ?? document.createElement("ol");
  if (!options.list) {
    list.className = options.protocol ? "uc-protocol-event-log" : "uc-overlay-event-log";
    list.setAttribute(
      "aria-label",
      options.protocol ? "Incoming protocol messages" : "Checkout Kit received events",
    );
  }
  const empty = options.empty ?? document.createElement("p");
  if (!options.empty) {
    empty.className = "muted";
    empty.textContent = options.protocol
      ? "Incoming protocol messages appear here."
      : "Received checkout events appear here.";
  }
  section.append(heading, description, list, empty);
  return {
    section,
    render(entries: readonly TimelineEntry[]) {
      renderTimeline(list, entries, attribution);
      empty.hidden = entries.length > 0;
    },
  };
}

export function createInspectorView(options: {
  readonly productName: string;
  readonly hostProtocolSection: HTMLElement;
  readonly onFocus: () => void;
  readonly onClose: () => void;
  readonly onClear: () => void;
}): InspectorView {
  const { productName } = options;

  // Overlay surface that fills the element's overlay slot while checkout is open.
  const surface = document.createElement("section");
  surface.className = "uc-overlay-surface";
  surface.setAttribute("aria-label", `${productName} activity`);

  const header = document.createElement("header");
  header.className = "uc-overlay-header";
  const headingGroup = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "uc-overlay-eyebrow";
  eyebrow.textContent = "Checkout Kit · activity";
  const heading = document.createElement("h2");
  heading.textContent = `${productName} activity`;
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
  const overlayErrors = sessionErrors("h4");
  resourceSection.append(resourceHeading, resourceEmpty, resourceList, overlayErrors.section);

  const activitySection = document.createElement("section");
  activitySection.className = "uc-overlay-activity";
  const activityHeader = document.createElement("div");
  activityHeader.className = "uc-overlay-activity-header";
  const activityHeading = document.createElement("h3");
  activityHeading.textContent = "Event timeline";
  const clearButton = button("Clear events", "secondary-action");
  activityHeader.append(activityHeading, clearButton);
  const overlayColumns = document.createElement("div");
  overlayColumns.className = "uc-event-columns";
  const overlayKit = eventColumn({ protocol: false, headingLevel: "h4" });
  const overlayProtocol = eventColumn({ protocol: true, headingLevel: "h4" });
  overlayColumns.append(overlayKit.section, overlayProtocol.section);
  activitySection.append(activityHeader, overlayColumns);
  surface.append(header, notice, resourceSection, activitySection);

  // Host page: render protocol messages into the provided section.
  const hostProtocolList = document.createElement("ol");
  hostProtocolList.className = "uc-protocol-event-log";
  hostProtocolList.id = "protocol-log";
  hostProtocolList.setAttribute("aria-label", "Incoming protocol messages");
  const hostProtocolEmpty = document.createElement("p");
  hostProtocolEmpty.className = "muted";
  hostProtocolEmpty.id = "protocol-empty";
  hostProtocolEmpty.textContent = "Incoming protocol messages appear here.";
  const hostProtocol = eventColumn({
    protocol: true,
    headingLevel: "h3",
    list: hostProtocolList,
    empty: hostProtocolEmpty,
  });
  // The column holds its heading, list, and empty text; it stays on the page after close.
  options.hostProtocolSection.append(hostProtocol.section);

  focusButton.addEventListener("click", options.onFocus);
  closeButton.addEventListener("click", options.onClose);
  clearButton.addEventListener("click", options.onClear);
  let disposed = false;

  return {
    surface,
    focusButton,
    closeButton,
    clearButton,
    render(snapshot, protocolEntries = []) {
      heading.textContent =
        snapshot.presentation === 0
          ? `${productName} activity`
          : `${productName} · presentation ${snapshot.presentation}`;
      notice.textContent = snapshot.notice;
      resourceEmpty.hidden = snapshot.resources.length > 0;
      renderResources(resourceList, snapshot);
      overlayErrors.render(snapshot);
      overlayKit.render(snapshot.entries);
      overlayProtocol.render(protocolEntries);
      hostProtocol.render(protocolEntries);
      const hasEvents = snapshot.entries.length > 0 || protocolEntries.length > 0;
      clearButton.disabled = !hasEvents;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      focusButton.removeEventListener("click", options.onFocus);
      closeButton.removeEventListener("click", options.onClose);
      clearButton.removeEventListener("click", options.onClear);
      surface.remove();
      hostProtocol.section.remove();
    },
  };
}
