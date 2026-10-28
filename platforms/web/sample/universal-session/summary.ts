import type {
  ShopPayEventMap,
  ShopPayErrorEventEntry as ErrorEntry,
  ShopPayResourceEventEntry as ResourceEntry,
} from "@shopify/checkout-kit";

type BlockedDetail = ShopPayEventMap["blocked"]["detail"];

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** One line per error; a resource error names its shop and leaves the session open. */
export function summarizeErrors(errors: readonly ErrorEntry[]): string {
  if (errors.length === 0) return "—";
  return errors
    .map(({ context, error }) =>
      context?.shopId === undefined ? error.code : `${error.code} (shop ${context.shopId})`,
    )
    .join("\n");
}

/** A one-line summary of a checkout element event for the event log. */
export function describeEvent(event: Event): string {
  const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
  switch (event.type) {
    case "start":
    case "update":
    case "complete": {
      const entries = (detail ?? []) as readonly ResourceEntry[];
      const statuses = entries.map(
        ({ context, checkout }) => `${context.status ?? "active"}/${checkout.status}`,
      );
      return `${pluralize(entries.length, "checkout")}: ${statuses.join(", ")}`;
    }
    case "error":
      return summarizeErrors((detail ?? []) as readonly ErrorEntry[]).replaceAll("\n", ", ");
    case "blocked":
      return (detail as BlockedDetail | undefined)?.code ?? "blocked";
    case "close":
      return "The checkout window closed.";
    default:
      return "";
  }
}

/** Shows where a source points without its secret-bearing query. */
export function redactSource(src: string): string {
  if (!src) return "—";
  try {
    const url = new URL(src);
    return `${url.origin}${url.pathname}${url.search ? "?… (key hidden)" : ""}`;
  } catch {
    return "—";
  }
}
