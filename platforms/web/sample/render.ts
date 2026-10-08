import type { Refs } from "./dom";
import type { AppState } from "./state";
import { renderCart } from "./views/cart";
import { renderLog } from "./views/log";
import { renderProducts } from "./views/products";
import { renderSettings } from "./views/settings";

export function renderApp(refs: Refs, state: AppState, checkout: HTMLElement): void {
  renderProducts(refs, state);
  renderCart(refs, state);
  renderLog(refs, state);
  // Attribute synchronization can reenter rendering through a close event.
  // Run it last so the new event log is not overwritten by this older state.
  renderSettings(refs, state, checkout);
}
