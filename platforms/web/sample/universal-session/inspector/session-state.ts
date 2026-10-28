import type {
  ShopifyUniversalCheckoutEventMap,
  ShopifyUniversalCheckoutErrorEventEntry as ErrorEntry,
  ShopifyUniversalCheckoutResourceStatus as ResourceStatus,
  ShopifyUniversalCheckoutSnapshot as CheckoutSnapshot,
} from "@shopify/checkout-kit";

type ErrorDetail = ShopifyUniversalCheckoutEventMap["error"]["detail"];
type ResourceDetail = ShopifyUniversalCheckoutEventMap["update"]["detail"];

/** One shop's latest accepted entry. */
export interface SessionResource {
  readonly shopId: string;
  readonly status?: ResourceStatus;
  readonly checkout: CheckoutSnapshot;
}

/** Every shop reported so far, after the latest event. */
export interface SessionCheckout {
  readonly revision: number;
  readonly resources: readonly SessionResource[];
}

/** Every failure still standing: one per failed shop, plus any session failure. */
export interface SessionError {
  readonly revision?: number;
  readonly errors: readonly ErrorEntry[];
}

/**
 * The host's view of the open session, folded from the element's events. Each
 * event carries only the shops it describes, so the latest entry per shop is
 * that shop's current state. Attach listeners before calling `open()`.
 */
export class UniversalSessionState {
  #revision?: number;
  #errorRevision?: number;
  readonly #resourcesByShopId = new Map<string, SessionResource>();
  readonly #errorsByShopId = new Map<string, ErrorEntry>();
  #sessionErrors: ErrorEntry[] = [];

  get checkout(): SessionCheckout | undefined {
    if (this.#revision === undefined) return undefined;
    return { revision: this.#revision, resources: [...this.#resourcesByShopId.values()] };
  }

  get error(): SessionError | undefined {
    const errors = [...this.#errorsByShopId.values(), ...this.#sessionErrors];
    if (errors.length === 0) return undefined;
    return {
      ...(this.#errorRevision === undefined ? {} : { revision: this.#errorRevision }),
      errors,
    };
  }

  /** Forget the previous presentation before opening the next one. */
  reset(): void {
    this.#revision = undefined;
    this.#errorRevision = undefined;
    this.#resourcesByShopId.clear();
    this.#errorsByShopId.clear();
    this.#sessionErrors = [];
  }

  /** Apply a `start`, `update` or `complete` event. A `start` recovers a failed shop. */
  update(type: "start" | "update" | "complete", detail: ResourceDetail): void {
    for (const { context, checkout } of detail) {
      if (type === "start") this.#errorsByShopId.delete(context.shopId);
      this.#revision = Math.max(this.#revision ?? context.revision, context.revision);
      this.#resourcesByShopId.set(context.shopId, {
        shopId: context.shopId,
        ...(context.status !== undefined && { status: context.status }),
        checkout,
      });
    }
  }

  /** Apply an `error` event. A shop's error stands until a new checkout starts for it. */
  fail(detail: ErrorDetail): void {
    for (const entry of detail) {
      const { context } = entry;
      if (context !== undefined) {
        this.#errorRevision = Math.max(this.#errorRevision ?? context.revision, context.revision);
      }
      if (context?.shopId !== undefined) this.#errorsByShopId.set(context.shopId, entry);
      else this.#sessionErrors.push(entry);
    }
  }
}
