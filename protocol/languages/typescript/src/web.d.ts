export * from "./generated/WebModels";
import type { CheckoutMessage } from "./generated/WebModels";
export type CheckoutMessageError = CheckoutMessage & {
    readonly type: "error";
};
