import { beforeEach, describe, expect, it } from "vitest";

import { loadUniversalDisplay, persistUniversalWidth, readUniversalWidth } from "./storage";

beforeEach(() => localStorage.clear());

describe("Universal sample storage", () => {
  it("uses column keys separate from the standard sample", () => {
    localStorage.setItem("checkout-kit:web-demo:col-left", "280");
    persistUniversalWidth("left", 320);
    expect(readUniversalWidth("left")).toBe(320);
    expect(localStorage.getItem("checkout-kit:web-demo:col-left")).toBe("280");
    expect(loadUniversalDisplay().target).toBe("popup");
  });
});
