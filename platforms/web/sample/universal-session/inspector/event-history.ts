/** A bounded, deliberately lossy view of Checkout Kit events for the sample. */

export type KitEventName = "start" | "update" | "complete" | "error" | "close";
export type PresentationPhase =
  | "idle"
  | "opening"
  | "active"
  | "inactive"
  | "complete"
  | "failed"
  | "closed";

export interface DisplayResource {
  readonly label: string;
  readonly status: string;
  readonly checkoutStatus: string;
  readonly resourceStatus?: string;
  readonly lineItemCount: number | null;
  readonly currency?: string;
}

export interface DisplayError {
  /** The display label for the affected resource, when the error is resource-specific. */
  readonly resourceLabel?: string;
  readonly code: string;
}

export interface DisplayEvent {
  readonly id: number;
  readonly time: string;
  readonly name: KitEventName;
  readonly label: string;
  readonly status: string;
  /** Only contains allowlisted values. Never store a raw event or checkout object. */
  readonly detail: string;
}

export interface EventHistorySnapshot {
  readonly presentation: number;
  readonly phase: PresentationPhase;
  readonly notice: string;
  readonly entries: readonly DisplayEvent[];
  readonly resources: readonly DisplayResource[];
  readonly errors: readonly DisplayError[];
}

export const MAX_EVENT_ENTRIES = 200;
export const MAX_EVENT_DETAIL_ENTRIES = 50;

const MAX_RESOURCE_LABELS = 200;
const MAX_VISIBLE_RESOURCES = 50;
const CHECKOUT_STATUSES = new Set([
  "incomplete",
  "requires_escalation",
  "ready_for_complete",
  "complete_in_progress",
  "completed",
  "canceled",
  "unknown",
]);
const ERROR_CODES = new Set([
  "storefront_password_required",
  "customer_account_required",
  "cart_expired",
  "cart_completed",
  "invalid_cart",
  "sdk_error",
  "unsupported_browser",
  "unknown",
]);

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function entriesOf(detail: unknown): readonly unknown[] {
  if (Array.isArray(detail)) return detail;
  return asRecord(detail) ? [detail] : [];
}

function safeStatus(value: unknown): string {
  return typeof value === "string" && CHECKOUT_STATUSES.has(value) ? value : "unknown";
}

function safeResourceStatus(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return value === "active" || value === "completed" || value === "failed" || value === "ejected"
    ? value
    : "unknown";
}

function displayStatus(checkoutStatus: string, resourceStatus: string | undefined): string {
  return resourceStatus === undefined || resourceStatus === "active"
    ? checkoutStatus
    : resourceStatus;
}

function safeErrorCode(value: unknown): string {
  return typeof value === "string" && ERROR_CODES.has(value) ? value : "unknown";
}

function safeCurrency(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : undefined;
}

function safeRevision(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

interface DisplayCheckout {
  readonly status: string;
  readonly lineItemCount: number | null;
  readonly currency?: string;
  readonly order: "present" | "absent";
  readonly fulfillment: "present" | "absent";
}

function projectCheckout(value: unknown): DisplayCheckout {
  const checkout = asRecord(value);
  const currency = safeCurrency(checkout?.["currency"]);
  return {
    status: safeStatus(checkout?.["status"]),
    lineItemCount: Array.isArray(checkout?.["lineItems"]) ? checkout["lineItems"].length : null,
    ...(currency ? { currency } : {}),
    order: checkout?.["order"] == null ? "absent" : "present",
    fulfillment: checkout?.["fulfillment"] == null ? "absent" : "present",
  };
}

function projectFailure(value: unknown): { readonly code: string; readonly message: "[redacted]" } {
  const error = asRecord(value);
  return { code: safeErrorCode(error?.["code"]), message: "[redacted]" };
}

function noticeFor(phase: PresentationPhase, outcome: "none" | "complete" | "failed"): string {
  switch (phase) {
    case "idle":
      return "Open a universal checkout to see received events.";
    case "opening":
      return "Opening checkout. Waiting for Checkout Kit events.";
    case "active":
      return "Checkout Kit is receiving events from this presentation.";
    case "inactive":
      return "All received shops have been ejected. No completion event has been received.";
    case "complete":
      return "All received shops have completed or left checkout. Check each shop’s state below.";
    case "failed":
      return "Checkout could not continue. Review the redacted error event.";
    case "closed":
      if (outcome === "complete") return "Checkout window closed after completion.";
      if (outcome === "failed") return "Checkout window closed after a checkout error.";
      return "Checkout window closed. Open again for a new presentation.";
  }
}

/**
 * Keeps only safe display projections. Resource IDs exist solely as temporary
 * keys for stable local labels and are never copied into entries or markup.
 */
export class UniversalEventHistory {
  readonly #now: () => Date;
  readonly #labels = new Map<string, string>();
  readonly #completedShopLabels = new Set<string>();
  #nextEntryId = 1;
  #presentation = 0;
  #phase: PresentationPhase = "idle";
  #outcome: "none" | "complete" | "failed" = "none";
  #active = false;
  #entries: DisplayEvent[] = [];
  #resources: DisplayResource[] = [];
  #allResourcesEjected = false;
  #errors: DisplayError[] = [];

  constructor(now: () => Date = () => new Date()) {
    this.#now = now;
  }

  get snapshot(): EventHistorySnapshot {
    return {
      presentation: this.#presentation,
      phase: this.#phase,
      notice: noticeFor(this.#phase, this.#outcome),
      entries: this.#entries,
      resources: this.#resources,
      errors: this.#errors,
    };
  }

  beginPresentation(): void {
    this.#presentation += 1;
    this.#active = true;
    this.#phase = "opening";
    this.#outcome = "none";
    this.#entries = [];
    this.#resources = [];
    this.#allResourcesEjected = false;
    this.#errors = [];
    this.#labels.clear();
    this.#completedShopLabels.clear();
  }

  clear(): void {
    this.#entries = [];
  }

  receive(
    name: KitEventName,
    detail: unknown,
    checkoutAggregate: unknown,
    errorAggregate: unknown,
  ): void {
    if (!this.#active) return;

    const aggregate = this.#projectAggregate(checkoutAggregate);
    const errors = this.#projectErrorAggregate(errorAggregate);
    if (aggregate !== undefined) this.#resources = aggregate.resources;
    if (errors !== undefined) this.#errors = errors;
    else if (errorAggregate === undefined && name !== "close") this.#errors = [];

    if (name === "close") {
      this.#append("close", "Presentation", "closed", {
        event: "close",
        entryCount: 0,
        entries: [],
        aggregate: aggregate?.detail,
      });
      this.#active = false;
      this.#phase = "closed";
      return;
    }

    const eventEntries = entriesOf(detail);
    const projected: UnknownRecord[] = [];
    const statusCounts = new Map<string, number>();
    let firstLabel = name === "error" ? "Session" : "Unknown shop";

    for (const [index, eventEntry] of eventEntries.entries()) {
      const entry = asRecord(eventEntry);
      const context = asRecord(entry?.["context"]);
      const revision = safeRevision(context?.["revision"]);
      const safeContext: UnknownRecord = {
        ...(typeof context?.["sessionId"] === "string" ? { sessionId: "[redacted]" } : {}),
        ...(revision === undefined ? {} : { revision }),
      };

      if (name === "error") {
        const resourceLabel =
          typeof context?.["shopId"] === "string" ? this.labelFor(context["shopId"]) : undefined;
        const failure = projectFailure(entry?.["error"]);
        statusCounts.set(failure.code, (statusCounts.get(failure.code) ?? 0) + 1);
        if (index < MAX_EVENT_DETAIL_ENTRIES) {
          if (index === 0) firstLabel = resourceLabel ?? "Session";
          if (resourceLabel !== undefined) safeContext["shopId"] = resourceLabel;
          projected.push({
            ...(context ? { context: safeContext } : {}),
            error: failure,
          });
        }
        if (resourceLabel === undefined) {
          this.#outcome = "failed";
          this.#phase = "failed";
        } else if (this.#phase === "opening") {
          // A resource can fail while the other shops remain interactive.
          this.#phase = "active";
        }
        continue;
      }

      const checkout = projectCheckout(entry?.["checkout"]);
      const resourceStatus = safeResourceStatus(context?.["status"]);
      const status = displayStatus(checkout.status, resourceStatus);
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
      const label = this.labelFor(context?.["shopId"]);
      if (index < MAX_EVENT_DETAIL_ENTRIES) {
        if (index === 0) firstLabel = label;
        projected.push({
          context: {
            ...safeContext,
            shopId: label,
            ...(resourceStatus === undefined ? {} : { status: resourceStatus }),
          },
          checkout,
        });
      }
      const shopId = context?.["shopId"];
      const shopLabel = typeof shopId === "string" ? this.#labels.get(shopId) : undefined;
      if (shopLabel !== undefined) {
        if (name === "complete" && resourceStatus !== "ejected") {
          this.#completedShopLabels.add(shopLabel);
        } else if (name === "start") {
          this.#completedShopLabels.delete(shopLabel);
        }
      }
      if (this.#phase === "opening") this.#phase = "active";
    }

    const count = eventEntries.length;
    const label = count === 1 ? firstLabel : `${count} entries`;
    const status =
      count === 0
        ? "unknown"
        : Array.from(statusCounts, ([value, size]) =>
            count === 1 ? value : `${size} ${value}`,
          ).join(" · ");
    this.#append(name, label, status, {
      event: name,
      entryCount: count,
      entries: projected,
      ...(count > projected.length ? { additionalEntryCount: count - projected.length } : {}),
      aggregate: aggregate?.detail,
      ...(name === "error" ? { errors: errors ?? this.#errors } : {}),
    });

    if (count > 0 && this.#phase !== "failed") {
      const complete = this.#allReceivedShopsResolved(checkoutAggregate, errorAggregate);
      this.#outcome = complete ? "complete" : "none";
      this.#phase = complete ? "complete" : this.#allResourcesEjected ? "inactive" : "active";
    }
  }

  #allReceivedShopsResolved(checkoutAggregate: unknown, errorAggregate: unknown): boolean {
    if (this.#completedShopLabels.size === 0) return false;
    const resources = asRecord(checkoutAggregate)?.["resources"];
    if (!Array.isArray(resources) || resources.length === 0) return false;
    const errors = asRecord(errorAggregate)?.["errors"];
    const failedShops = new Set(
      (Array.isArray(errors) ? errors : []).map((error) => {
        const entry = asRecord(error);
        return entry?.["shopId"] ?? asRecord(entry?.["context"])?.["shopId"];
      }),
    );
    // Use the full accepted aggregates, not the capped display rows. A completed
    // snapshot alone is insufficient: its completion event may still be held.
    return resources.every((value) => {
      const resource = asRecord(value);
      const shopId = resource?.["shopId"];
      if (typeof shopId !== "string") return false;
      const label = this.#labels.get(shopId);
      return (
        (label !== undefined && this.#completedShopLabels.has(label)) ||
        failedShops.has(shopId) ||
        resource?.["status"] === "ejected"
      );
    });
  }

  /** Share stable, redacted shop labels across the sample's event views. */
  labelFor(value: unknown): string {
    if (typeof value !== "string" || value.length === 0 || value.length > 512) {
      return "Unknown shop";
    }
    const known = this.#labels.get(value);
    if (known) return known;
    if (this.#labels.size >= MAX_RESOURCE_LABELS) return "Additional shop";
    const label = `Shop ${this.#labels.size + 1}`;
    this.#labels.set(value, label);
    return label;
  }

  #projectAggregate(
    value: unknown,
  ): { resources: DisplayResource[]; detail: UnknownRecord } | undefined {
    const aggregate = asRecord(value);
    if (!aggregate) return undefined;
    const rawResources = Array.isArray(aggregate["resources"]) ? aggregate["resources"] : [];
    this.#allResourcesEjected =
      rawResources.length > 0 &&
      rawResources.every((resource) => asRecord(resource)?.["status"] === "ejected");
    const resources = rawResources.slice(0, MAX_VISIBLE_RESOURCES).map((rawResource) => {
      const resource = asRecord(rawResource);
      const checkout = projectCheckout(resource?.["checkout"]);
      const resourceStatus = safeResourceStatus(resource?.["status"]);
      return {
        label: this.labelFor(resource?.["shopId"]),
        status: displayStatus(checkout.status, resourceStatus),
        checkoutStatus: checkout.status,
        ...(resourceStatus === undefined ? {} : { resourceStatus }),
        lineItemCount: checkout.lineItemCount,
        ...(checkout.currency ? { currency: checkout.currency } : {}),
      };
    });
    const revision = safeRevision(aggregate["revision"]);
    return {
      resources,
      detail: {
        ...(revision === undefined ? {} : { revision }),
        resourceCount: rawResources.length,
        resources,
        ...(rawResources.length > resources.length
          ? { additionalResourceCount: rawResources.length - resources.length }
          : {}),
      },
    };
  }

  #projectErrorAggregate(value: unknown): DisplayError[] | undefined {
    const aggregate = asRecord(value);
    if (!aggregate) return undefined;
    const rawErrors = Array.isArray(aggregate["errors"]) ? aggregate["errors"] : [];
    return rawErrors.slice(0, MAX_VISIBLE_RESOURCES).map((rawError) => {
      const entry = asRecord(rawError);
      const context = asRecord(entry?.["context"]);
      const shopId = entry?.["shopId"] ?? context?.["shopId"];
      return {
        ...(typeof shopId === "string" ? { resourceLabel: this.labelFor(shopId) } : {}),
        code: projectFailure(entry?.["error"]).code,
      };
    });
  }

  #append(name: KitEventName, label: string, status: string, detail: UnknownRecord): void {
    const event: DisplayEvent = {
      id: this.#nextEntryId++,
      time: this.#now().toLocaleTimeString(),
      name,
      label,
      status,
      detail: JSON.stringify(detail, null, 2),
    };
    this.#entries = [...this.#entries.slice(-(MAX_EVENT_ENTRIES - 1)), event];
  }
}
