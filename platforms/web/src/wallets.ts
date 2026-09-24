const ROOT_PART = "root";

/**
 * Checkout Kit's merchant-facing accelerated checkout wallet element.
 *
 * This initial shell intentionally contains no wallet, cart, network, or
 * lifecycle behavior. Those capabilities are layered on in focused changes.
 */
export class ShopifyAcceleratedCheckoutButtons extends HTMLElement {
  constructor() {
    super();

    const root = document.createElement("div");
    root.setAttribute("part", ROOT_PART);
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Accelerated checkout");

    this.attachShadow({ mode: "open" }).append(root);
  }
}
