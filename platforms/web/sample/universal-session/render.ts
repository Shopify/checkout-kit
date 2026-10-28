import type { Refs } from "./dom";
import type { SamplePage } from "./page";
import type { AppState } from "./state";
import { renderCart } from "./views/cart";
import { renderExpress, renderCheckoutElement } from "./views/express";
import { renderProducts } from "./views/products";
import { renderRuntime } from "./views/runtime";
import { renderSettings } from "./views/settings";

export function renderApp(
  refs: Refs,
  state: AppState,
  element: HTMLElement & { src: string; target: string; logLevel: string; button?: boolean },
  page: SamplePage,
): void {
  // Update the element first, so the runtime panel shows its resulting properties.
  renderCheckoutElement(element, state);
  renderSettings(refs, state);
  renderProducts(refs, state);
  renderCart(refs, state, page);
  renderExpress(refs, state, page);
  renderRuntime(refs, state, element, page);
}
