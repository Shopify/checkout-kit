import {MODEL_EXTRACTIONS} from "./method_catalog.mjs";

// `ReadyResult` -> `ReadySuccess`. The success branch of each result `oneOf`
// becomes its own struct under this name; the union keeps the `*Result` name.
export function successTypeName(rootTitle) {
  if (!rootTitle.endsWith("Result")) {
    throw new Error(`Result rootTitle must end in "Result": ${rootTitle}`);
  }
  return rootTitle.replace(/Result$/, "Success");
}

// One descriptor per generated result union, derived from MODEL_EXTRACTIONS so it
// cannot drift from the spec-driven extraction list. Each result is a discriminated
// union of its success branch and the shared `ErrorResponse`, chosen by the UCP
// envelope's `status`.
export const RESULT_UNIONS = MODEL_EXTRACTIONS
  .filter((entry) => entry.kind === "result")
  .map((entry) => ({
    name: entry.rootTitle,
    successType: successTypeName(entry.rootTitle),
    errorType: "ErrorResponse",
  }));
