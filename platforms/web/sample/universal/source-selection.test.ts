import { describe, expect, it } from "vitest";

import { isContinuationUrl } from "./policy";
import { createSourceSelection } from "./source-selection";

const VALID_URL = "https://shop.app/checkouts/uc/example?key=private";
const prepared = {
  phase: "ready",
  generation: 2,
  readyGeneration: 2,
  url: VALID_URL,
};

describe("Universal sample source selection", () => {
  it("accepts only the exact configured continuation host and path", () => {
    expect(isContinuationUrl(VALID_URL, "production")).toBe(true);
    expect(isContinuationUrl(VALID_URL, "development")).toBe(false);
    expect(
      isContinuationUrl(
        "https://shop.app.evil.test/checkouts/uc/example?key=private",
        "production",
      ),
    ).toBe(false);
    expect(isContinuationUrl("https://shop.app/cart/example?key=private", "production")).toBe(
      false,
    );
  });

  it("uses only a validated URL prepared for the current generation", () => {
    const source = createSourceSelection(
      (url, environment) => environment === "production" && url === VALID_URL,
    );
    expect(source.select(prepared, "production")).toMatchObject({
      mode: "generated",
      url: VALID_URL,
      ready: true,
    });
    expect(source.select({ ...prepared, generation: 3 }, "production").ready).toBe(false);
    expect(source.select(prepared, "development").ready).toBe(false);
    expect(source.select({ ...prepared, phase: "error" }, "production").ready).toBe(false);
  });

  it("keeps pasted input in memory and clears it when switching modes", () => {
    const source = createSourceSelection((url) => url === VALID_URL);
    source.setMode("pasted");
    source.setPastedDraft(`  ${VALID_URL}  `);
    expect(source.select({ ...prepared, phase: "editing" }, "production")).toMatchObject({
      mode: "pasted",
      url: VALID_URL,
      ready: true,
    });
    source.setMode("generated");
    expect(source.pastedDraft).toBe("");
    source.setMode("pasted");
    expect(source.select(prepared, "production").ready).toBe(false);
    expect(source.pastedDraft).toBe("");
  });

  it("does not pass a pasted lookalike or stale environment URL to the element", () => {
    const source = createSourceSelection(
      (url, environment) => environment === "production" && url === VALID_URL,
    );
    source.setMode("pasted");
    source.setPastedDraft("https://shop.app.evil.test/checkouts/uc/example?key=private");
    expect(source.select(prepared, "production").url).toBe("");
    source.setPastedDraft(VALID_URL);
    expect(source.select(prepared, "development").url).toBe("");
  });
});
