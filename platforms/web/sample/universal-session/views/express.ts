import { setStringAttribute, type Refs } from "../dom";
import type { SamplePage } from "../page";
import {
  selectActiveSourceUrl,
  selectCanPrepare,
  selectExpressNotice,
  selectSession,
  type AppState,
} from "../state";

/** Reflects the settings and the active source onto the checkout element. */
export function renderCheckoutElement(
  element: HTMLElement & { src: string; button?: boolean },
  state: AppState,
): void {
  const src = selectActiveSourceUrl(state);
  setStringAttribute(element, "src", src);
  setStringAttribute(element, "target", state.target);
  setStringAttribute(element, "log-level", state.logLevel);
  // Show the element's button only once a tap can open something.
  if ("button" in element) {
    element.button = state.button && src !== "";
  }
}

/** The express checkout area: preparation, the checkout button, and its status. */
export function renderExpress(refs: Refs, state: AppState, page: SamplePage): void {
  const isManual = state.sourceMode === "manual";
  const ready = selectActiveSourceUrl(state) !== "";

  refs.prepareButton.hidden = isManual;
  refs.prepareButton.disabled = !selectCanPrepare(state);
  const prepareLabel = page.button ? `Prepare ${page.productName}` : "Prepare session";
  refs.prepareButton.textContent =
    selectSession(state).status === "preparing" ? "Preparing…" : prepareLabel;

  refs.hostPayButton.hidden = page.button && state.button;
  refs.hostPayButton.disabled = !ready;

  const buttonVisible = page.button && state.button;
  // The placeholder holds the element's button's place until a session is ready.
  refs.shopPayPlaceholder.hidden = !buttonVisible || ready;

  const notice = selectExpressNotice(state, page);
  refs.sessionStatus.textContent = notice.message;
  refs.sessionStatus.dataset["tone"] = notice.tone;
}
