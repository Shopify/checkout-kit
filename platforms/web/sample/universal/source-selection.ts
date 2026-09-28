import type { CheckoutEnvironment } from "./policy";

export type CheckoutSourceMode = "generated" | "pasted";

export interface PreparedSource {
  readonly phase: string;
  readonly generation: number;
  readonly readyGeneration: number | null;
  readonly url: string;
}

export interface SelectedSource {
  readonly mode: CheckoutSourceMode;
  readonly url: string;
  readonly ready: boolean;
  readonly hint: string;
}

/**
 * Pasted URLs are an advanced, memory-only input. Both modes cross the same
 * strict destination validator before they can reach the Checkout Kit element.
 */
export function createSourceSelection(
  isAllowed: (url: string, environment: CheckoutEnvironment) => boolean,
): {
  readonly mode: CheckoutSourceMode;
  readonly pastedDraft: string;
  setMode(mode: CheckoutSourceMode): void;
  setPastedDraft(value: string): void;
  select(prepared: PreparedSource, environment: CheckoutEnvironment): SelectedSource;
} {
  let mode: CheckoutSourceMode = "generated";
  let pastedDraft = "";

  return {
    get mode() {
      return mode;
    },
    get pastedDraft() {
      return pastedDraft;
    },
    setMode(next) {
      if (next === mode) return;
      mode = next;
      // Never carry a previously pasted secret into a later presentation.
      pastedDraft = "";
    },
    setPastedDraft(value) {
      pastedDraft = value;
    },
    select(prepared, environment) {
      if (mode === "pasted") {
        const url = pastedDraft.trim();
        if (!url) {
          return {
            mode,
            url: "",
            ready: false,
            hint: "Paste an existing Universal Checkout URL to open it.",
          };
        }
        if (!isAllowed(url, environment)) {
          return {
            mode,
            url: "",
            ready: false,
            hint: "Use a valid Universal Checkout URL for the selected environment.",
          };
        }
        return {
          mode,
          url,
          ready: true,
          hint: "Pasted URL is ready. Open it with Checkout Kit.",
        };
      }

      if (
        prepared.phase !== "ready" ||
        prepared.readyGeneration !== prepared.generation ||
        !prepared.url
      ) {
        return {
          mode,
          url: "",
          ready: false,
          hint: "Create a Universal Checkout URL from the selected carts first.",
        };
      }
      if (!isAllowed(prepared.url, environment)) {
        return {
          mode,
          url: "",
          ready: false,
          hint: "The prepared URL does not match the selected environment. Create it again.",
        };
      }
      return {
        mode,
        url: prepared.url,
        ready: true,
        hint: "The Universal Checkout URL is ready. Open it with Checkout Kit.",
      };
    },
  };
}
