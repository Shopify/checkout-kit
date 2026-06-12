export * from "./generated/WebModels";

import type {CheckoutMessage} from "./generated/WebModels";

// Narrowing alias for the `error` variant of the message union. The generated
// `CheckoutMessage` collapses the three message variants into a single
// interface, so consumers that need to talk specifically about errors get the
// discriminated subtype via this alias.
export type CheckoutMessageError = CheckoutMessage & {readonly type: "error"};
