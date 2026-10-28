/** Safe, bounded diagnostics for incoming protocol messages, before Kit decoding. */
export interface DisplayProtocolEvent {
  readonly id: number;
  readonly time: string;
  readonly name: string;
  readonly label: string;
  readonly status: string;
  /** A display projection only; never contains the original message. */
  readonly detail: string;
}

export const MAX_PROTOCOL_ENTRIES = 200;
export const MAX_PROTOCOL_MEMBERS = 50;
export const MAX_PROTOCOL_SOURCE_LABELS = 200;
const MAX_ERROR_MESSAGES = 10;
const MAX_JSON_LENGTH = 262_144;

const METHODS = new Set([
  "ec.ready",
  "ec.auth",
  "ec.start",
  "ec.update",
  "ec.complete",
  "ec.error",
  "ec.messages.change",
  "ec.line_items.change",
  "ec.buyer.change",
  "ec.totals.change",
  "ec.payment.change",
  "ec.fulfillment.change",
  "ec.status.change",
  "ec.payment.instruments_change_request",
  "ec.payment.credential_request",
  "ec.fulfillment.address_change_request",
  "ec.window.open_request",
  "ec.resize",
  "ec.unload",
  "ec.close",
  "ec.submit",
  "ec.keep_shopping",
  "ec.dialog.change",
  "ec.content_visible",
  "ec.toast",
  "ec.redemption.change",
  "ec.shop_cash_metadata.change",
  "ec.shop_pay_session_revalidation.request",
  "ec.shop_pay_session_revalidation.change",
]);
const CHECKOUT_STATUSES = new Set([
  "incomplete",
  "requires_escalation",
  "ready_for_complete",
  "complete_in_progress",
  "completed",
  "canceled",
  "unknown",
]);
const RESOURCE_STATUSES = new Set(["active", "failed", "ejected"]);
const ERROR_SCOPES = new Set(["resource", "session"]);
const ERROR_CODES = new Set([
  "storefront_password_required",
  "customer_account_required",
  "cart_expired",
  "cart_completed",
  "invalid_cart",
  "sdk_error",
  "not_found",
  "out_of_stock",
  "item_unavailable",
  "address_undeliverable",
  "payment_failed",
  "eligibility_invalid",
  "identity_required",
  "insufficient_scope",
  "window_open_rejected_error",
  "session_error",
  "currency_mismatch",
  "incompatible_flow",
  "iframe_unload",
  "unrecognized_data",
]);
const MESSAGE_TYPES = new Set(["error", "warning", "info"]);
const SEVERITIES = new Set([
  "recoverable",
  "requires_buyer_input",
  "requires_buyer_review",
  "unrecoverable",
]);

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function allowlisted(value: unknown, allowed: ReadonlySet<string>): string {
  return typeof value === "string" && allowed.has(value) ? value : "unknown";
}

function isResponse(value: RecordValue): boolean {
  return value["method"] === undefined && ("result" in value || "error" in value);
}

function isProtocolCandidate(value: unknown): boolean {
  const message = record(value);
  if (!message || isResponse(message)) return false;
  return typeof message["method"] === "string"
    ? message["method"].startsWith("ec.")
    : "jsonrpc" in message;
}

function safeRevision(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function windowLabel(sourceIndex: number | undefined): string | undefined {
  if (sourceIndex === undefined) return undefined;
  if (sourceIndex === 0) return "Additional window";
  return Number.isSafeInteger(sourceIndex) &&
    sourceIndex > 0 &&
    sourceIndex <= MAX_PROTOCOL_SOURCE_LABELS
    ? `Window ${sourceIndex}`
    : "Unknown window";
}

function projectCheckout(value: unknown): RecordValue {
  const checkout = record(value);
  if (!checkout) return { shape: "invalid" };
  const currency = checkout["currency"];
  return {
    status: allowlisted(checkout["status"], CHECKOUT_STATUSES),
    ...(typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? { currency } : {}),
    lineItemCount: Array.isArray(checkout["line_items"]) ? checkout["line_items"].length : null,
    order: checkout["order"] == null ? "absent" : "present",
    fulfillment: checkout["fulfillment"] == null ? "absent" : "present",
  };
}

function projectError(value: unknown): RecordValue {
  const error = record(value);
  if (!error) return { shape: "invalid" };
  const messages = error["messages"];
  if (!Array.isArray(messages)) return { messages: "invalid" };
  return {
    status: record(error["ucp"])?.["status"] === "error" ? "error" : "unknown",
    messageCount: messages.length,
    messages: messages.slice(0, MAX_ERROR_MESSAGES).map((rawMessage) => {
      const message = record(rawMessage);
      return {
        type: allowlisted(message?.["type"], MESSAGE_TYPES),
        code: allowlisted(message?.["code"], ERROR_CODES),
        severity: allowlisted(message?.["severity"], SEVERITIES),
        content: "[redacted]",
      };
    }),
    ...(messages.length > MAX_ERROR_MESSAGES
      ? { additionalMessageCount: messages.length - MAX_ERROR_MESSAGES }
      : {}),
  };
}

interface ProjectedMember {
  readonly detail: RecordValue;
  readonly method: string;
  readonly status: string;
}

/** No listeners or trust decisions: the owner must filter by origin and presentation lifetime. */
export class UniversalProtocolHistory {
  readonly #labelFor: (value: unknown) => string;
  readonly #now: () => Date;
  #entries: DisplayProtocolEvent[] = [];
  #nextId = 1;

  /** labelFor must return the sample's shared anonymous shop labels. */
  constructor(labelFor: (value: unknown) => string, now: () => Date = () => new Date()) {
    this.#labelFor = labelFor;
    this.#now = now;
  }

  get entries(): readonly DisplayProtocolEvent[] {
    return this.#entries;
  }

  clear(): void {
    this.#entries = [];
  }

  receive(data: unknown, sourceIndex?: number): boolean {
    let payload = data;
    if (typeof payload === "string") {
      if (payload.length > MAX_JSON_LENGTH) return false;
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        return false;
      }
    }
    const batch = Array.isArray(payload);
    const incoming: unknown[] = Array.isArray(payload) ? payload : [payload];
    const visible = incoming.slice(0, MAX_PROTOCOL_MEMBERS);
    if (incoming.length > 0 && !visible.some(isProtocolCandidate)) return false;
    const members = visible.map((value, index) => this.#projectMember(value, index));
    const methods = new Set(members.map(({ method }) => method));
    const statuses = [...new Set(members.map(({ status }) => status))];
    const statusSummary =
      statuses.slice(0, 4).join(" · ") +
      (statuses.length > 4 ? ` · +${statuses.length - 4} status types` : "");
    const truncated = incoming.length > members.length;
    const source = windowLabel(sourceIndex);
    const memberLabel = `${incoming.length} ${incoming.length === 1 ? "member" : "members"}${truncated ? " · truncated" : ""}`;
    const event: DisplayProtocolEvent = {
      id: this.#nextId++,
      time: this.#now().toLocaleTimeString(),
      name:
        incoming.length === 0
          ? "malformed batch"
          : methods.size === 1
            ? (members[0]?.method ?? "unknown")
            : "mixed batch",
      label: source ? `${source} · ${memberLabel}` : memberLabel,
      status: incoming.length === 0 ? "malformed" : statusSummary,
      detail: JSON.stringify(
        {
          ...(source ? { source } : {}),
          transport: batch ? "batch" : "message",
          encoding: typeof data === "string" ? "JSON string" : "structured clone",
          memberCount: incoming.length,
          members: members.map(({ detail }) => detail),
          ...(truncated ? { additionalMemberCount: incoming.length - members.length } : {}),
        },
        null,
        2,
      ),
    };
    this.#entries = [...this.#entries.slice(-(MAX_PROTOCOL_ENTRIES - 1)), event];
    return true;
  }

  #projectMember(value: unknown, index: number): ProjectedMember {
    const message = record(value);
    const method = allowlisted(message?.["method"], METHODS);
    const request =
      message !== undefined && Object.hasOwn(message, "id") && message["id"] !== undefined;
    const response = message !== undefined && isResponse(message);
    const id = message?.["id"];
    const invalidId =
      request &&
      !(id === null || typeof id === "string" || (typeof id === "number" && Number.isFinite(id)));
    const malformed =
      !message ||
      message["jsonrpc"] !== "2.0" ||
      typeof message["method"] !== "string" ||
      invalidId;
    const assessment = response
      ? "response"
      : malformed
        ? "malformed"
        : method === "unknown"
          ? "unsupported"
          : "observed";
    const params = assessment === "observed" ? record(message?.["params"]) : undefined;
    const context = record(params?.["context"]);
    const checkout =
      params?.["checkout"] === undefined ? undefined : projectCheckout(params["checkout"]);
    const resourceStatus =
      context?.["status"] === undefined
        ? undefined
        : allowlisted(context["status"], RESOURCE_STATUSES);
    const revision = safeRevision(context?.["revision"]);
    const error = params?.["error"] === undefined ? undefined : projectError(params["error"]);
    const codes = Array.isArray(error?.["messages"])
      ? error["messages"]
          .map((entry: unknown) => record(entry)?.["code"])
          .filter((code: unknown): code is string => typeof code === "string" && code !== "unknown")
      : [];
    const status =
      assessment !== "observed"
        ? assessment
        : resourceStatus !== undefined && resourceStatus !== "active"
          ? resourceStatus
          : method === "ec.error"
            ? codes.length === 1
              ? `error · ${codes[0]}`
              : "error"
            : typeof checkout?.["status"] === "string"
              ? checkout["status"]
              : "received";
    const projectedParams: RecordValue = {
      ...(context
        ? {
            context: {
              ...(context["scope"] === undefined
                ? {}
                : { scope: allowlisted(context["scope"], ERROR_SCOPES) }),
              ...(context["shop_id"] === undefined
                ? {}
                : { shop_id: this.#labelFor(context["shop_id"]) }),
              ...(context["session_id"] === undefined ? {} : { session_id: "[redacted]" }),
              ...(revision === undefined ? {} : { revision }),
              ...(resourceStatus === undefined ? {} : { status: resourceStatus }),
            },
          }
        : {}),
      ...(checkout ? { checkout } : {}),
      ...(error ? { error } : {}),
    };
    return {
      method: method === "unknown" ? assessment : method,
      status,
      detail: {
        index,
        jsonrpc:
          message?.["jsonrpc"] === "2.0"
            ? "2.0"
            : message?.["jsonrpc"] === undefined
              ? "absent"
              : "invalid",
        method,
        kind: response ? "response" : request ? "request" : "notification",
        id: request ? "present" : "absent",
        assessment,
        // Unknown payloads stay opaque even when they mimic known field names.
        ...(assessment === "observed"
          ? {
              params: params
                ? projectedParams
                : message?.["params"] === undefined
                  ? "absent"
                  : "invalid",
            }
          : {}),
      },
    };
  }
}
