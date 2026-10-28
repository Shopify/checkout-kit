import type { ErrorResponse } from "@shopify/checkout-kit-core/checkout/types";
import { toCheckoutError } from "@shopify/checkout-kit-core/checkout/models/error";
import type { UniversalCheckoutNotification, UniversalCheckoutResourceEventType } from "./protocol";
import type {
  UniversalCheckoutErrorEventDetail,
  UniversalCheckoutFailure,
  UniversalCheckoutResourceEventDetail,
  UniversalCheckoutResourceStatus,
  UniversalCheckoutSnapshot,
} from "./universal.types";

/** A shop's latest accepted snapshot and session status. */
interface Resource {
  readonly id: string;
  readonly status?: UniversalCheckoutResourceStatus;
  readonly checkout: UniversalCheckoutSnapshot;
}

export type UniversalCheckoutLifecycleEvent =
  | {
      readonly type: UniversalCheckoutResourceEventType;
      readonly detail: UniversalCheckoutResourceEventDetail;
    }
  | { readonly type: "error"; readonly detail: UniversalCheckoutErrorEventDetail };

export interface UniversalCheckoutReduction {
  /** Contiguous lifecycle groups, kept in wire order. */
  readonly events: readonly UniversalCheckoutLifecycleEvent[];
  /** Accepted ec.error members, independent of public event grouping. */
  readonly acceptedTerminalErrors: number;
}

/**
 * Reduces one decoded wire batch into immutable event details.
 * Full snapshots replace only their named shop; omitted shops remain intact.
 */
export class UniversalCheckoutReducer {
  #sessionId?: string;
  #revision?: number;
  #errorRevision?: number;
  #sessionTerminal = false;
  readonly #resourcesByShopId = new Map<string, Resource>();
  readonly #errorsByShopId = new Map<string, UniversalCheckoutFailure>();
  readonly #failedCheckoutIds = new Map<string, string | undefined>();
  readonly #completedCheckoutIds = new Set<string>();
  readonly #completedShopIds = new Set<string>();
  #expectedShopCount = 0;

  /**
   * Records the shops announced by one batched `ec.ready`, one request per
   * shop. The session ends once each of them has completed or failed.
   */
  expectShops(count: number): void {
    this.#expectedShopCount = Math.max(this.#expectedShopCount, count);
  }

  reduce(notifications: readonly UniversalCheckoutNotification[]): UniversalCheckoutReduction {
    const groups: Array<{
      type: UniversalCheckoutLifecycleEvent["type"];
      revision: number;
      entries: Array<
        UniversalCheckoutResourceEventDetail[number] | UniversalCheckoutErrorEventDetail[number]
      >;
    }> = [];
    let terminalRevision: number | undefined;
    // An ejected shop in a legacy completion batch is not a completed order,
    // so a completion group needs at least one completed shop.
    const completionRevisions = new Set<number>();
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
      // The member that resolves the last shop ends this session within the
      // current wire batch too. Keep sibling completions and resource errors at
      // the same revision, even when unrelated members are interleaved.
      if (
        sawSessionError ||
        (terminalRevision !== undefined &&
          (notification.context.revision !== terminalRevision ||
            (notification.kind === "resource"
              ? notification.eventType !== "complete"
              : notification.scope !== "resource")))
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

        // Tolerate earlier producers that included ejected shops in completion,
        // even after a terminal resource error. This records the final resource
        // state without recovering the checkout or clearing its error.
        const completesEjectedResource =
          eventType === "complete" &&
          context.status === "ejected" &&
          previous !== undefined &&
          !replacement &&
          failedCheckoutId === checkout.id;

        // Recovery from a terminal resource error requires an explicit new
        // checkout identity and a new start. A changed-resource update alone
        // cannot silently replace a failed checkout.
        if (this.#failedCheckoutIds.has(shopId) && !completesEjectedResource) {
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

        const completedKey = `${shopId}\u0000${checkout.id}`;
        if (this.#completedCheckoutIds.has(completedKey)) continue;

        const unchanged =
          previous !== undefined &&
          previous.status === context.status &&
          isEqualSnapshotValue(previous.checkout, checkout);
        const resource: Resource = unchanged
          ? previous
          : {
              id: checkout.id,
              ...(context.status !== undefined && { status: context.status }),
              checkout,
            };
        this.#sessionId ??= context.sessionId;
        this.#resourcesByShopId.set(shopId, resource);
        this.#revision = Math.max(this.#revision ?? context.revision, context.revision);

        let publicType: UniversalCheckoutResourceEventType = eventType;
        if (eventType === "start" && previous && !replacement) publicType = "update";
        if (eventType === "update" && unchanged) continue;
        if (publicType === "update" && unchanged) continue;
        // Legacy producers can include ejected snapshots alongside successful
        // completions. An ejected resource cannot complete the session itself.
        if (eventType === "complete" && context.status !== "ejected") {
          this.#completedCheckoutIds.add(completedKey);
          this.#completedShopIds.add(shopId);
          completionRevisions.add(context.revision);
        }
        if (terminalRevision === undefined && this.#isEveryShopResolved()) {
          terminalRevision = context.revision;
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
      const entry = Object.freeze({
        context: Object.freeze({ ...context }),
        ...(notification.checkout !== undefined && { checkout: notification.checkout }),
        error: failure,
      } as const);

      this.#sessionId ??= context.sessionId;
      this.#errorRevision = Math.max(this.#errorRevision ?? context.revision, context.revision);

      if (notification.scope === "resource" && context.shopId !== undefined) {
        const previous = this.#errorsByShopId.get(context.shopId);
        if (previous && isEqualSnapshotValue(previous, failure)) continue;
        this.#errorsByShopId.set(context.shopId, failure);
        // An error can carry a shop's first snapshot. Record that identity so a
        // later start for the same failed checkout cannot recover it, and keep
        // it when a later error for the shop has no snapshot.
        this.#failedCheckoutIds.set(
          context.shopId,
          this.#resourcesByShopId.get(context.shopId)?.id ??
            notification.checkout?.id ??
            this.#failedCheckoutIds.get(context.shopId),
        );
        if (terminalRevision === undefined && this.#isEveryShopResolved()) {
          terminalRevision = context.revision;
        }
      } else {
        sawSessionError = true;
      }
      acceptedTerminalErrors += 1;
      append("error", context.revision, entry);
    }

    if (terminalRevision !== undefined || sawSessionError) this.#sessionTerminal = true;

    return {
      events: groups
        .filter((group) => group.type !== "complete" || completionRevisions.has(group.revision))
        .map((group) =>
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

  /**
   * At least one shop completed and every other shop the session announced or
   * reported has completed, failed, or been ejected. Ejection counts for
   * producers that report it without an error. A session with no completion
   * stays open, so a failed shop can still recover with a new checkout.
   */
  #isEveryShopResolved(): boolean {
    if (this.#completedShopIds.size === 0) return false;
    const shopIds = new Set([...this.#resourcesByShopId.keys(), ...this.#errorsByShopId.keys()]);
    const shopCount = Math.max(this.#expectedShopCount, shopIds.size);
    if (shopCount === 0) return false;
    let resolved = 0;
    for (const shopId of shopIds) {
      if (
        this.#completedShopIds.has(shopId) ||
        this.#errorsByShopId.has(shopId) ||
        this.#resourcesByShopId.get(shopId)?.status === "ejected"
      ) {
        resolved += 1;
      }
    }
    return resolved >= shopCount;
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
