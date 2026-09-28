/** A bounded, deliberately lossy view of Checkout Kit events for the sample. */

export type KitEventName = "start" | "update" | "complete" | "error" | "close";
export type PresentationPhase = "idle" | "opening" | "active" | "complete" | "failed" | "closed";

export interface DisplayResource {
  readonly label: string;
  readonly status: string;
  readonly lineItemCount: number | null;
  readonly currency?: string;
}

export interface DisplayError {
  readonly label: string;
  readonly scope: "resource" | "session";
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

function safeErrorCode(value: unknown): string {
  return typeof value === "string" && ERROR_CODES.has(value) ? value : "unknown";
}

function safeCurrency(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : undefined;
}

function safeRevision(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function safeHttpStatus(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
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

function projectFailure(value: unknown): {
  readonly code: string;
  readonly message: "[redacted]";
  readonly httpStatusCode?: number;
} {
  const error = asRecord(value);
  const httpStatusCode = safeHttpStatus(error?.["httpStatusCode"]);
  return {
    code: safeErrorCode(error?.["code"]),
    message: "[redacted]",
    ...(httpStatusCode === undefined ? {} : { httpStatusCode }),
  };
}

function noticeFor(phase: PresentationPhase, outcome: "none" | "complete" | "failed"): string {
  switch (phase) {
    case "idle":
      return "Open a universal checkout to see received events.";
    case "opening":
      return "Opening checkout. Waiting for Checkout Kit events.";
    case "active":
      return "Checkout Kit is receiving events from this presentation.";
    case "complete":
      return "Universal checkout completed. The checkout window remains available.";
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
  #nextEntryId = 1;
  #presentation = 0;
  #phase: PresentationPhase = "idle";
  #outcome: "none" | "complete" | "failed" = "none";
  #active = false;
  #entries: DisplayEvent[] = [];
  #resources: DisplayResource[] = [];
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
    this.#errors = [];
    this.#labels.clear();
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
        aggregate: aggregate?.detail,
      });
      this.#active = false;
      this.#phase = "closed";
      return;
    }

    const eventEntries = entriesOf(detail);
    if (eventEntries.length === 0) {
      this.#append(name, name === "error" ? "Session" : "Unknown shop", "unknown", {
        event: name,
        aggregate: aggregate?.detail,
      });
      return;
    }

    for (const eventEntry of eventEntries) {
      const entry = asRecord(eventEntry);
      const context = asRecord(entry?.["context"]);
      const revision = safeRevision(context?.["revision"]);

      if (name === "error") {
        const scope = entry?.["scope"] === "resource" ? "resource" : "session";
        const label = scope === "resource" ? this.#labelFor(context?.["shopId"]) : "Session";
        const failure = projectFailure(entry?.["error"]);
        this.#append(name, label, "error", {
          event: name,
          scope,
          resource: label,
          ...(revision === undefined ? {} : { revision }),
          error: failure,
          aggregate: aggregate?.detail,
          errors: errors ?? this.#errors,
        });
        if (scope === "session") {
          this.#outcome = "failed";
          this.#phase = "failed";
        } else if (this.#phase === "opening") {
          // A resource can fail while the other shops remain interactive.
          this.#phase = "active";
        }
        continue;
      }

      const label = this.#labelFor(context?.["shopId"]);
      const checkout = projectCheckout(entry?.["checkout"]);
      this.#append(name, label, checkout.status, {
        event: name,
        resource: label,
        ...(revision === undefined ? {} : { revision }),
        checkout,
        aggregate: aggregate?.detail,
      });
      if (name === "complete") {
        this.#outcome = "complete";
        this.#phase = "complete";
      } else if (this.#phase === "opening") {
        this.#phase = "active";
      }
    }
  }

  #labelFor(value: unknown): string {
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
    const resources = rawResources.slice(0, MAX_VISIBLE_RESOURCES).map((rawResource) => {
      const resource = asRecord(rawResource);
      const checkout = projectCheckout(resource?.["checkout"]);
      return {
        label: this.#labelFor(resource?.["shopId"]),
        status: checkout.status,
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
      const scope = entry?.["scope"] === "resource" ? "resource" : "session";
      return {
        label:
          scope === "resource"
            ? this.#labelFor(entry?.["shopId"] ?? context?.["shopId"])
            : "Session",
        scope,
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
