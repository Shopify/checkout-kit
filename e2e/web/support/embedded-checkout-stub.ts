import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { BrowserContext } from "@playwright/test";

import { CheckoutFixture } from "./checkout-fixture";

const SYNTHETIC_CHECKOUT_HTML = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "synthetic-checkout.html",
);

const HTML = "text/html; charset=utf-8";

export class EmbeddedCheckoutStub {
  static async blank(context: BrowserContext): Promise<void> {
    await context.route(CheckoutFixture.glob, (route) =>
      route.fulfill({ status: 200, contentType: HTML, body: "<!doctype html><title>popup</title>" }),
    );
  }

  static async handshake(context: BrowserContext): Promise<void> {
    await context.route(CheckoutFixture.glob, (route) =>
      route.fulfill({ path: SYNTHETIC_CHECKOUT_HTML, contentType: HTML }),
    );
  }
}
