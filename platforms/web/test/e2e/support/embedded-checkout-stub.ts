import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

import { checkoutOrigin } from "./checkout-fixture";

export type CheckoutStubMode = "blank" | "handshake" | "universal";

const syntheticCheckouts = {
  handshake: fileURLToPath(new URL("../fixtures/synthetic-checkout.html", import.meta.url)),
  universal: fileURLToPath(
    new URL("../fixtures/synthetic-universal-checkout.html", import.meta.url),
  ),
};

export async function stubEmbeddedCheckout(context: BrowserContext, mode: CheckoutStubMode) {
  await context.route(`${checkoutOrigin}/**`, (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      ...(mode === "blank"
        ? { body: "<!doctype html><title>Checkout popup</title>" }
        : { path: syntheticCheckouts[mode] }),
    }),
  );
}
