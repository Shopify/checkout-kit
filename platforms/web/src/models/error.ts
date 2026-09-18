import type { ErrorResponse } from "@shopify/checkout-kit-protocol";

/** Stable checkout error reasons applications can use to choose recovery. */
export type CheckoutErrorCode =
  | "storefront_password_required"
  | "customer_account_required"
  | "cart_expired"
  | "cart_completed"
  | "invalid_cart"
  | "unknown";

/** A checkout error with a stable reason and a diagnostic description. */
export interface CheckoutError {
  code: CheckoutErrorCode;
  /** Diagnostic text; use `code` for application behavior. */
  message: string;
}

interface ErrorMessage {
  type: "error";
  severity?: unknown;
  code?: unknown;
  content?: unknown;
}

const UNKNOWN_ERROR_MESSAGE = "Embedded checkout reported an error.";

/** Maps a protocol error without exposing its envelope or arbitrary codes. */
export function toCheckoutError(protocolError: ErrorResponse): CheckoutError {
  // The protocol decoder preserves message contents, including malformed ones.
  const messages: unknown[] = Array.isArray(protocolError.messages) ? protocolError.messages : [];
  const errors = messages.filter(isErrorMessage);
  const representative =
    errors.find((message) => message.severity === "unrecoverable") ?? errors[0];
  const content = representative?.content;

  return {
    code: toCheckoutErrorCode(representative?.code),
    message: typeof content === "string" && content.trim() !== "" ? content : UNKNOWN_ERROR_MESSAGE,
  };
}

function isErrorMessage(value: unknown): value is ErrorMessage {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "type" in value &&
    value.type === "error"
  );
}

function toCheckoutErrorCode(value: unknown): CheckoutErrorCode {
  if (typeof value !== "string") return "unknown";

  // Only checkout-origin recovery reasons are accepted from protocol messages.
  const code = value.toLowerCase();
  switch (code) {
    case "storefront_password_required":
    case "customer_account_required":
    case "cart_expired":
    case "cart_completed":
    case "invalid_cart":
      return code;
    default:
      return "unknown";
  }
}
