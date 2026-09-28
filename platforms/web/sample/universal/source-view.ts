import { $ } from "../dom";
import type { CheckoutSourceMode, SelectedSource } from "./source-selection";

export interface SourceViewRefs {
  readonly generatedInput: HTMLInputElement;
  readonly pastedInput: HTMLInputElement;
  readonly pastedFields: HTMLElement;
  readonly pastedUrl: HTMLInputElement;
  readonly status: HTMLElement;
  readonly openButton: HTMLButtonElement;
}

export function querySourceViewRefs(): SourceViewRefs {
  return {
    generatedInput: $<HTMLInputElement>("#uc-source-generated"),
    pastedInput: $<HTMLInputElement>("#uc-source-pasted"),
    pastedFields: $<HTMLElement>("#uc-pasted-fields"),
    pastedUrl: $<HTMLInputElement>("#uc-pasted-url"),
    status: $<HTMLElement>("#uc-source-status"),
    openButton: $<HTMLButtonElement>("#uc-open"),
  };
}

/** Update persistent controls in place so checkout events cannot steal focus. */
export function renderSourceView(
  refs: SourceViewRefs,
  mode: CheckoutSourceMode,
  pastedDraft: string,
  selected: SelectedSource,
): void {
  refs.generatedInput.checked = mode === "generated";
  refs.pastedInput.checked = mode === "pasted";
  refs.pastedFields.hidden = mode !== "pasted";
  refs.pastedUrl.disabled = mode !== "pasted";
  if (refs.pastedUrl.value !== pastedDraft) refs.pastedUrl.value = pastedDraft;
  refs.pastedUrl.setAttribute(
    "aria-invalid",
    String(mode === "pasted" && pastedDraft.trim() !== "" && !selected.ready),
  );
  refs.status.textContent = selected.hint;
  refs.status.dataset["tone"] = selected.ready ? "success" : "info";
  refs.openButton.disabled = !selected.ready;
}
