import {
  EmbeddedCheckoutProtocol,
  INVALID_PARAMS_CODE,
  INVALID_PARAMS_MESSAGE,
  METHOD_NOT_FOUND_CODE,
  METHOD_NOT_FOUND_MESSAGE,
  ProtocolValidationError,
  type ErrorResponse,
  type WindowOpenRequest,
} from "@shopify/checkout-kit-protocol";

import type {
  UniversalCheckoutContext,
  UniversalCheckoutFailure,
  UniversalCheckoutEventType,
  UniversalCheckoutSnapshot,
} from "./universal.types";

export const UNIVERSAL_CHECKOUT_PROTOCOL_VERSION = "2026-08-25";

export type JsonRpcId = string | number | null;

export type JsonRpcResponse =
  | { readonly jsonrpc: "2.0"; readonly id: JsonRpcId; readonly result: unknown }
  | {
      readonly jsonrpc: "2.0";
      readonly id: JsonRpcId;
      readonly error: { readonly code: number; readonly message: string };
    };

export type UniversalCheckoutRequest =
  | { readonly kind: "ready"; readonly id: JsonRpcId }
  | { readonly kind: "windowOpen"; readonly id: JsonRpcId; readonly request: WindowOpenRequest }
  | { readonly kind: "reject"; readonly response: JsonRpcResponse };

export interface UniversalCheckoutResourceNotification {
  readonly kind: "resource";
  readonly eventType: UniversalCheckoutEventType;
  readonly context: UniversalCheckoutContext;
  readonly checkout: UniversalCheckoutSnapshot;
}

interface UniversalCheckoutErrorNotificationBase {
  readonly kind: "error";
  readonly context: {
    readonly sessionId: string;
    readonly revision: number;
    readonly shopId?: string;
  };
  readonly scope: "resource" | "session";
}

export type UniversalCheckoutErrorNotification = UniversalCheckoutErrorNotificationBase &
  (
    | { readonly source: "protocol"; readonly error: ErrorResponse }
    | { readonly source: "kit"; readonly failure: UniversalCheckoutFailure }
  );

export type UniversalCheckoutNotification =
  | UniversalCheckoutResourceNotification
  | UniversalCheckoutErrorNotification;

export interface UniversalCheckoutInvalidEntry {
  readonly index: number;
  /** An allowlisted method, never an arbitrary incoming method string. */
  readonly method: string;
  /** A schema-owned path, never a raw value or arbitrary exception message. */
  readonly field: string;
  readonly reason: "missing_required" | "invalid_type";
  readonly revision?: number;
}

export interface UniversalCheckoutProtocolBatch {
  readonly requests: readonly UniversalCheckoutRequest[];
  /** Accepted members in their original wire order. */
  readonly notifications: readonly UniversalCheckoutNotification[];
  readonly invalidEntries: readonly UniversalCheckoutInvalidEntry[];
}

interface JsonRpcEntry {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly id?: unknown;
  readonly params?: unknown;
}

const { Event } = EmbeddedCheckoutProtocol;

const RESOURCE_EVENT_TYPES: Readonly<Record<string, UniversalCheckoutEventType>> = {
  "ec.start": "start",
  "ec.update": "update",
  "ec.complete": "complete",
};

const KNOWN_METHODS = new Set([
  ...Object.keys(RESOURCE_EVENT_TYPES),
  Event.error.method,
  Event.ready.method,
  Event.windowOpen.method,
]);

const CHECKOUT_STATUSES = new Set([
  "incomplete",
  "requires_escalation",
  "ready_for_complete",
  "complete_in_progress",
  "completed",
  "canceled",
]);

/** Universal Checkout continuation URLs have a `/checkouts/uc/` path. */
export function isUniversalCheckoutUrl(url: URL): boolean {
  const segments = url.pathname.split("/");
  return segments.some((segment, index) => segment === "checkouts" && segments[index + 1] === "uc");
}

/**
 * Parse a structured-clone JSON-RPC batch one member at a time. A bad member
 * never discards its valid siblings, and unsupported notifications are ignored.
 */
export function parseUniversalCheckoutProtocolBatch(
  data: unknown,
): UniversalCheckoutProtocolBatch | undefined {
  if (!Array.isArray(data) || data.length === 0) return;

  const requests: UniversalCheckoutRequest[] = [];
  const notifications: UniversalCheckoutNotification[] = [];
  const invalidEntries: UniversalCheckoutInvalidEntry[] = [];

  data.forEach((value: unknown, index) => {
    if (!isJsonRpcEntry(value)) {
      invalidEntries.push({ index, method: "unknown", field: "message", reason: "invalid_type" });
      return;
    }

    const { method, params } = value;
    const safeMethod = KNOWN_METHODS.has(method) ? method : "unknown";
    // Structured clone preserves an own key whose value is undefined. JSON-RPC
    // treats that the same as an omitted id, while an actual invalid id still
    // invalidates the member.
    const hasId = Object.hasOwn(value, "id") && value.id !== undefined;
    const id = hasId && isJsonRpcId(value.id) ? value.id : undefined;
    if (hasId && id === undefined) {
      invalidEntries.push({ index, method: safeMethod, field: "id", reason: "invalid_type" });
      return;
    }

    const reject = (field: string, reason: UniversalCheckoutInvalidEntry["reason"]) => {
      invalidEntries.push({ index, method: safeMethod, field, reason, ...safeRevision(params) });
      if (id !== undefined) requests.push({ kind: "reject", response: invalidParamsResponse(id) });
    };

    if (method === Event.ready.method) {
      if (id === undefined) {
        reject("id", "missing_required");
        return;
      }
      try {
        Event.ready.decode(params);
        requests.push({ kind: "ready", id });
      } catch (error) {
        const failure = decodeFailure(error);
        reject(failure.field, failure.reason);
      }
      return;
    }

    if (method === Event.windowOpen.method) {
      if (id === undefined) {
        reject("id", "missing_required");
        return;
      }
      try {
        requests.push({ kind: "windowOpen", id, request: Event.windowOpen.decode(params) });
      } catch (error) {
        const failure = decodeFailure(error);
        reject(failure.field, failure.reason);
      }
      return;
    }

    const eventType = Object.hasOwn(RESOURCE_EVENT_TYPES, method)
      ? RESOURCE_EVENT_TYPES[method]
      : undefined;
    if (eventType) {
      try {
        const context = parseContext(params, "resource");
        const checkout = Event.start.decode(params).checkout;
        // The shared codec verifies these fields exist, but does not verify
        // their container types. Keep an invalid resource out of public state.
        if (!Array.isArray(checkout.lineItems)) {
          throw new EntryValidationError("Checkout.line_items", "invalid_type");
        }
        if (!Array.isArray(checkout.links)) {
          throw new EntryValidationError("Checkout.links", "invalid_type");
        }
        if (!Array.isArray(checkout.totals)) {
          throw new EntryValidationError("Checkout.totals", "invalid_type");
        }
        if (typeof checkout.status !== "string") {
          throw new EntryValidationError("Checkout.status", "invalid_type");
        }
        const { ucp: _, ...publicFields } = checkout;
        const snapshot = immutableClone({
          ...publicFields,
          status: CHECKOUT_STATUSES.has(checkout.status) ? checkout.status : "unknown",
        }) as UniversalCheckoutSnapshot;
        notifications.push({ kind: "resource", eventType, context, checkout: snapshot });
      } catch (error) {
        const failure = decodeFailure(error);
        reject(failure.field, failure.reason);
      }
      return;
    }

    if (method === Event.error.method) {
      let context: ReturnType<typeof parseContext>;
      try {
        context = parseContext(params, "error");
      } catch (error) {
        const failure = decodeFailure(error);
        reject(failure.field, failure.reason);
        return;
      }
      const scope = context.shopId === undefined ? "session" : "resource";
      try {
        const error = Event.error.decode(params).error;
        validateProtocolError(error);
        notifications.push({ kind: "error", source: "protocol", scope, context, error });
      } catch (error) {
        const failure = decodeFailure(error);
        reject(failure.field, failure.reason);
        // A recognized terminal notification with a validated scope still has
        // a terminal outcome. Never promote an unscoped malformed member to a
        // session-wide failure; that path returned above.
        notifications.push({
          kind: "error",
          source: "kit",
          scope,
          context,
          failure: Object.freeze({
            code: "sdk_error",
            message: "Checkout sent an invalid terminal error.",
          }),
        });
      }
      return;
    }

    if (id !== undefined) {
      requests.push({ kind: "reject", response: methodNotFoundResponse(id) });
    }
  });

  return { requests, notifications, invalidEntries };
}

/** Distinguishes malformed protocol envelopes from unrelated popup messages. */
export function isMalformedUniversalCheckoutProtocolEnvelope(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  return isRecord(data) && Object.hasOwn(data, "jsonrpc") && data.jsonrpc === "2.0";
}

function validateProtocolError(error: ErrorResponse): void {
  if (!Array.isArray(error.messages)) {
    throw new EntryValidationError("ErrorResponse.messages", "invalid_type");
  }
  for (const message of error.messages) {
    if (
      !isRecord(message) ||
      typeof message.type !== "string" ||
      typeof message.content !== "string"
    ) {
      throw new EntryValidationError("ErrorResponse.messages", "invalid_type");
    }
  }
}

function parseContext(params: unknown, kind: "resource"): UniversalCheckoutContext;
function parseContext(
  params: unknown,
  kind: "error",
): { sessionId: string; revision: number; shopId?: string };
function parseContext(
  params: unknown,
  kind: "resource" | "error",
): { sessionId: string; revision: number; shopId?: string } {
  if (!isRecord(params) || !isRecord(params.context)) {
    throw new EntryValidationError("context", "missing_required");
  }

  const context = params.context;
  if (typeof context.session_id !== "string" || context.session_id.length === 0) {
    throw new EntryValidationError("context.session_id", "invalid_type");
  }
  if (!Number.isSafeInteger(context.revision) || (context.revision as number) < 0) {
    throw new EntryValidationError("context.revision", "invalid_type");
  }
  if (typeof context.shop_id === "string" && context.shop_id.length > 0) {
    return {
      sessionId: context.session_id,
      revision: context.revision as number,
      shopId: context.shop_id,
    };
  }
  // Absence of shop_id alone is not authority to fail every resource. A wire
  // session error must explicitly declare its scope.
  if (kind === "error" && context.scope === "session" && context.shop_id === undefined) {
    return { sessionId: context.session_id, revision: context.revision as number };
  }
  throw new EntryValidationError("context.shop_id", "missing_required");
}

function immutableClone<Value>(value: Value): Value {
  const clone = structuredClone(value);
  const seen = new WeakSet<object>();
  const freeze = (item: unknown): void => {
    if (item === null || typeof item !== "object" || seen.has(item)) return;
    seen.add(item);
    for (const child of Object.values(item)) freeze(child);
    Object.freeze(item);
  };
  freeze(clone);
  return clone;
}

function decodeFailure(error: unknown): {
  field: string;
  reason: UniversalCheckoutInvalidEntry["reason"];
} {
  if (error instanceof ProtocolValidationError) {
    return { field: error.modelPath, reason: error.reason };
  }
  if (error instanceof EntryValidationError) {
    return { field: error.field, reason: error.reason };
  }
  return { field: "params", reason: "invalid_type" };
}

class EntryValidationError extends Error {
  constructor(
    readonly field: string,
    readonly reason: UniversalCheckoutInvalidEntry["reason"],
  ) {
    super(`Invalid ${field}`);
  }
}

function safeRevision(params: unknown): { revision?: number } {
  if (!isRecord(params) || !isRecord(params.context)) return {};
  const revision = params.context.revision;
  return Number.isSafeInteger(revision) && (revision as number) >= 0
    ? { revision: revision as number }
    : {};
}

function invalidParamsResponse(id: JsonRpcId): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code: INVALID_PARAMS_CODE, message: INVALID_PARAMS_MESSAGE },
  };
}

function methodNotFoundResponse(id: JsonRpcId): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code: METHOD_NOT_FOUND_CODE, message: METHOD_NOT_FOUND_MESSAGE },
  };
}

function isJsonRpcEntry(value: unknown): value is JsonRpcEntry {
  return (
    isRecord(value) &&
    value.jsonrpc === "2.0" &&
    typeof value.method === "string" &&
    value.method.length > 0
  );
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
