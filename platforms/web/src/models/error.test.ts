import { describe, expect, expectTypeOf, it } from "vitest";
import type { ErrorResponse } from "@shopify/checkout-kit-protocol";

import { toCheckoutError, type CheckoutError, type CheckoutErrorCode } from "./error";

function protocolError(messages: unknown): ErrorResponse {
  // The shared decoder does not validate every member of the messages field.
  return { messages, ucp: { version: "2026-04-08", status: "error" } } as ErrorResponse;
}

describe("toCheckoutError", () => {
  it.each([
    "storefront_password_required",
    "customer_account_required",
    "cart_expired",
    "cart_completed",
    "invalid_cart",
  ] as const)("maps the checkout recovery reason %s", (code) => {
    expect(
      toCheckoutError(protocolError([{ type: "error", code, content: "Sample failure" }])),
    ).toEqual({ code, message: "Sample failure" });
  });

  it("prefers an unrecoverable error over earlier errors and other message types", () => {
    const error = toCheckoutError(
      protocolError([
        { type: "warning", severity: "unrecoverable", code: "invalid_cart", content: "Warning" },
        { type: "error", severity: "recoverable", code: "invalid_cart", content: "Earlier error" },
        {
          type: "error",
          severity: "unrecoverable",
          code: "cart_expired",
          content: "Expired checkout",
        },
        {
          type: "error",
          severity: "unrecoverable",
          code: "cart_completed",
          content: "Later terminal error",
        },
      ]),
    );

    expect(error).toEqual({ code: "cart_expired", message: "Expired checkout" });
  });

  it("falls back to the first error when no unrecoverable error is present", () => {
    const error = toCheckoutError(
      protocolError([
        { type: "info", content: "Sample information" },
        { type: "error", code: "INVALID_CART", content: "First error" },
        { type: "error", code: "cart_expired", content: "Later error" },
      ]),
    );

    expect(error).toEqual({ code: "invalid_cart", message: "First error" });
  });

  it.each(["new_checkout_reason", "network_error", "http_error", "sdk_error", 123, null])(
    "maps unsupported or malformed code %s to unknown without discarding the diagnostic",
    (code) => {
      const error = toCheckoutError(
        protocolError([{ type: "error", code, content: "Diagnostic description" }]),
      );

      expect(error).toEqual({ code: "unknown", message: "Diagnostic description" });
    },
  );

  it.each(
    [undefined, null, "invalid", {}, [], [null, 123, "invalid", {}, []]].map((messages) => ({
      messages,
    })),
  )("handles malformed or empty message collections: $messages", ({ messages }) => {
    expect(toCheckoutError(protocolError(messages))).toEqual({
      code: "unknown",
      message: "Embedded checkout reported an error.",
    });
  });

  it("ignores malformed entries around an error message", () => {
    expect(
      toCheckoutError(
        protocolError([
          null,
          false,
          [],
          { type: "error", code: "cart_expired", content: "Expired" },
        ]),
      ),
    ).toEqual({ code: "cart_expired", message: "Expired" });
  });

  it.each([undefined, null, 123, {}, "", "   "])(
    "provides a diagnostic fallback for invalid message content: %j",
    (content) => {
      expect(
        toCheckoutError(protocolError([{ type: "error", code: "invalid_cart", content }])),
      ).toEqual({ code: "invalid_cart", message: "Embedded checkout reported an error." });
    },
  );

  it("does not select warning or informational messages as checkout failure reasons", () => {
    expect(
      toCheckoutError(
        protocolError([
          { type: "warning", severity: "unrecoverable", code: "invalid_cart", content: "Warning" },
          { type: "info", code: "cart_expired", content: "Information" },
        ]),
      ),
    ).toEqual({ code: "unknown", message: "Embedded checkout reported an error." });
  });

  it("exposes only a stable code and diagnostic message", () => {
    expectTypeOf<keyof CheckoutError>().toEqualTypeOf<"code" | "message">();
    expectTypeOf<CheckoutError["code"]>().toEqualTypeOf<CheckoutErrorCode>();
    expectTypeOf<CheckoutError["message"]>().toEqualTypeOf<string>();

    const error = toCheckoutError(
      protocolError([{ type: "error", code: "invalid_cart", content: "Invalid checkout" }]),
    );
    expect(error).not.toHaveProperty("ucp");
    expect(error).not.toHaveProperty("messages");
  });
});
