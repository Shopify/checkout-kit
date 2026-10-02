import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

import { checkoutOrigin } from "./checkout-fixture";

export type CheckoutStubMode = "blank" | "handshake";

const syntheticCheckout = fileURLToPath(
  new URL("../fixtures/synthetic-checkout.html", import.meta.url),
);

export async function stubEmbeddedCheckout(
  context: BrowserContext,
  mode: CheckoutStubMode,
): Promise<void> {
  await context.route(`${checkoutOrigin}/**`, (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      ...(mode === "blank"
        ? { body: "<!doctype html><title>Checkout popup</title>" }
        : { path: syntheticCheckout }),
    }),
  );
}
