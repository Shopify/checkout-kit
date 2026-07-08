import type { Refs } from "./dom";
import type { AppState } from "./state";
import { renderCart } from "./views/cart";
import { renderLog } from "./views/log";
import { renderProducts } from "./views/products";
import { renderSettings } from "./views/settings";

export function renderApp(refs: Refs, state: AppState, checkout: HTMLElement): void {
  renderSettings(refs, state, checkout);
  renderProducts(refs, state);
  renderCart(refs, state);
  renderLog(refs, state);
}
