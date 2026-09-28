import type { ErrorResponse } from "./checkout.types";
import { toCheckoutError } from "./models/error";
import type { UniversalCheckoutNotification } from "./universal.protocol";
import type {
  UniversalCheckout,
  UniversalCheckoutError,
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutEventType,
  UniversalCheckoutFailure,
  UniversalCheckoutResource,
  UniversalCheckoutResourceError,
  UniversalCheckoutResourceEventDetail,
} from "./universal.types";

export type UniversalCheckoutLifecycleEvent =
  | {
      readonly type: UniversalCheckoutEventType;
      readonly detail: UniversalCheckoutResourceEventDetail;
    }
  | { readonly type: "error"; readonly detail: UniversalCheckoutErrorEventDetail };

export interface UniversalCheckoutReduction {
  readonly checkout?: UniversalCheckout;
  readonly error?: UniversalCheckoutError;
  /** Contiguous lifecycle groups, kept in wire order. */
  readonly events: readonly UniversalCheckoutLifecycleEvent[];
  /** Accepted ec.error members, independent of public event grouping. */
  readonly acceptedTerminalErrors: number;
}

/**
 * Reduces one decoded wire batch into immutable public state and event details.
 * Full snapshots replace only their named shop; omitted shops remain intact.
 */
export class UniversalCheckoutReducer {
  #sessionId?: string;
  #revision?: number;
  #errorRevision?: number;
  #sessionTerminal = false;
  readonly #resourcesByShopId = new Map<string, UniversalCheckoutResource>();
  readonly #errorsByShopId = new Map<string, UniversalCheckoutResourceError>();
  readonly #failedCheckoutIds = new Map<string, string | undefined>();
  readonly #completedCheckoutIds = new Set<string>();
  #sessionError?: UniversalCheckoutResourceError;

  reduce(notifications: readonly UniversalCheckoutNotification[]): UniversalCheckoutReduction {
    const groups: Array<{
      type: UniversalCheckoutLifecycleEvent["type"];
      revision: number;
      entries: Array<
        UniversalCheckoutResourceEventDetail[number] | UniversalCheckoutErrorEventDetail[number]
      >;
    }> = [];
    let terminalCompleteRevision: number | undefined;
    let sawSessionError = false;
    let acceptedTerminalErrors = 0;

    const append = (
      type: UniversalCheckoutLifecycleEvent["type"],
      revision: number,
      entry:
        | UniversalCheckoutResourceEventDetail[number]
        | UniversalCheckoutErrorEventDetail[number],
    ) => {
      const last = groups.at(-1);
      if (last?.type === type && last.revision === revision) {
        last.entries.push(entry);
      } else {
        groups.push({ type, revision, entries: [entry] });
      }
    };

    for (const notification of notifications) {
      // An accepted terminal member ends this session within the current wire
      // batch too. A complete batch may still contain one member per resource
      // at the same revision, even when unrelated members are interleaved.
      if (
        sawSessionError ||
        (terminalCompleteRevision !== undefined &&
          (notification.kind !== "resource" ||
            notification.eventType !== "complete" ||
            notification.context.revision !== terminalCompleteRevision))
      ) {
        continue;
      }
      if (!this.#acceptsSession(notification.context.sessionId, notification.context.revision)) {
        continue;
      }

      if (notification.kind === "resource") {
        const { context } = notification;
        const { shopId } = context;
        const { checkout, eventType } = notification;
        const previous = this.#resourcesByShopId.get(shopId);
        const failedCheckoutId = this.#failedCheckoutIds.get(shopId);
        const replacement = previous !== undefined && previous.id !== checkout.id;

        // Recovery from a terminal resource error requires an explicit new
        // checkout identity and a new start. A changed-resource update alone
        // cannot silently replace a failed checkout.
        if (failedCheckoutId !== undefined || this.#failedCheckoutIds.has(shopId)) {
          if (
            eventType !== "start" ||
            (previous !== undefined && !replacement) ||
            checkout.id === failedCheckoutId
          ) {
            continue;
          }
          this.#failedCheckoutIds.delete(shopId);
          this.#errorsByShopId.delete(shopId);
        } else if (replacement && eventType !== "start") {
          continue;
        }

        if (eventType === "update" && previous === undefined) continue;

        const completedKey = `${shopId}\u0000${checkout.id}`;
        if (this.#completedCheckoutIds.has(completedKey)) continue;

        const unchanged =
          previous !== undefined && isEqualSnapshotValue(previous.checkout, checkout);
        const resource = unchanged
          ? previous
          : Object.freeze({ id: checkout.id, shopId, checkout });
        this.#sessionId ??= context.sessionId;
        this.#resourcesByShopId.set(shopId, resource);
        this.#revision = Math.max(this.#revision ?? context.revision, context.revision);

        let publicType: UniversalCheckoutEventType = eventType;
        if (eventType === "start" && previous && !replacement) publicType = "update";
        if (eventType === "update" && unchanged) continue;
        if (publicType === "update" && unchanged) continue;
        if (eventType === "complete") {
          terminalCompleteRevision = context.revision;
          this.#completedCheckoutIds.add(completedKey);
        }

        append(
          publicType,
          context.revision,
          Object.freeze({ context: Object.freeze({ ...context }), checkout }),
        );
        continue;
      }

      const { context } = notification;
      const failure =
        notification.source === "kit" ? notification.failure : mapProtocolError(notification.error);
      const errorContext = Object.freeze({ ...context });
      const entry = Object.freeze({
        context: errorContext,
        scope: notification.scope,
        error: failure,
      } as const);

      this.#sessionId ??= context.sessionId;
      this.#errorRevision = Math.max(this.#errorRevision ?? context.revision, context.revision);

      if (notification.scope === "resource" && context.shopId !== undefined) {
        const previous = this.#errorsByShopId.get(context.shopId);
        if (previous && isEqualSnapshotValue(previous.error, failure)) continue;
        const resourceError = Object.freeze({
          context: errorContext,
          shopId: context.shopId,
          scope: "resource" as const,
          error: failure,
        });
        this.#errorsByShopId.set(context.shopId, resourceError);
        this.#failedCheckoutIds.set(
          context.shopId,
          this.#resourcesByShopId.get(context.shopId)?.id,
        );
      } else {
        if (this.#sessionError) continue;
        this.#sessionError = Object.freeze({
          context: errorContext,
          scope: "session" as const,
          error: failure,
        });
        sawSessionError = true;
      }
      acceptedTerminalErrors += 1;
      append("error", context.revision, entry);
    }

    if (terminalCompleteRevision !== undefined || sawSessionError) this.#sessionTerminal = true;

    const sessionId = this.#sessionId;
    const revision = this.#revision;
    const errorRevision = this.#errorRevision;
    const resourceErrors = [...this.#errorsByShopId.values()];
    if (this.#sessionError) resourceErrors.push(this.#sessionError);

    return {
      checkout:
        sessionId !== undefined && revision !== undefined && this.#resourcesByShopId.size > 0
          ? Object.freeze({
              sessionId,
              revision,
              resources: Object.freeze([...this.#resourcesByShopId.values()]),
            })
          : undefined,
      error:
        resourceErrors.length > 0
          ? Object.freeze({
              sessionId,
              revision: errorRevision,
              errors: Object.freeze(resourceErrors),
            })
          : undefined,
      events: groups.map((group) =>
        group.type === "error"
          ? {
              type: "error" as const,
              detail: Object.freeze(group.entries) as UniversalCheckoutErrorEventDetail,
            }
          : {
              type: group.type,
              detail: Object.freeze(group.entries) as UniversalCheckoutResourceEventDetail,
            },
      ),
      acceptedTerminalErrors,
    };
  }

  #acceptsSession(sessionId: string, revision: number): boolean {
    if (this.#sessionTerminal) return false;
    if (this.#sessionId !== undefined && sessionId !== this.#sessionId) return false;
    const lastRevision = Math.max(this.#revision ?? -1, this.#errorRevision ?? -1);
    if (revision < lastRevision) return false;
    return true;
  }
}

export function mapProtocolError(error: ErrorResponse): UniversalCheckoutFailure {
  return Object.freeze(toCheckoutError(error));
}

/** Structural equality compares public fields, excluding transport metadata. */
function isEqualSnapshotValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => isEqualSnapshotValue(item, right[index]))
    );
  }

  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(
      ([key, value]) =>
        Object.hasOwn(right, key) &&
        isEqualSnapshotValue(value, (right as Record<string, unknown>)[key]),
    )
  );
}
