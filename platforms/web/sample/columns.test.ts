import { describe, expect, it } from "vitest";

import {
  clampColumnWidth,
  COLUMN_BOUNDS,
  formatColumnWidth,
  nextColumnWidth,
  parseColumnWidth,
} from "./columns";

describe("clampColumnWidth", () => {
  it("clamps below the minimum for each side", () => {
    expect(clampColumnWidth("left", 0)).toBe(COLUMN_BOUNDS.left.min);
    expect(clampColumnWidth("right", 0)).toBe(COLUMN_BOUNDS.right.min);
  });

  it("clamps above the maximum for each side", () => {
    expect(clampColumnWidth("left", 9999)).toBe(COLUMN_BOUNDS.left.max);
    expect(clampColumnWidth("right", 9999)).toBe(COLUMN_BOUNDS.right.max);
  });

  it("rounds a value within range", () => {
    const within = COLUMN_BOUNDS.left.min + 10.6;
    expect(clampColumnWidth("left", within)).toBe(Math.round(within));
  });
});

describe("nextColumnWidth", () => {
  it("grows the left column as the pointer moves right", () => {
    const start = COLUMN_BOUNDS.left.min + 40;
    expect(nextColumnWidth("left", start, 30)).toBe(start + 30);
    expect(nextColumnWidth("left", start, -30)).toBe(start - 30);
  });

  it("grows the right column as the pointer moves left", () => {
    const start = COLUMN_BOUNDS.right.min + 40;
    expect(nextColumnWidth("right", start, -30)).toBe(start + 30);
    expect(nextColumnWidth("right", start, 30)).toBe(start - 30);
  });

  it("clamps the result to the side bounds", () => {
    expect(nextColumnWidth("left", COLUMN_BOUNDS.left.max, 100)).toBe(COLUMN_BOUNDS.left.max);
    expect(nextColumnWidth("right", COLUMN_BOUNDS.right.min, 100)).toBe(COLUMN_BOUNDS.right.min);
  });
});

describe("parseColumnWidth", () => {
  it("parses pixel and bare numeric strings", () => {
    expect(parseColumnWidth("300px")).toBe(300);
    expect(parseColumnWidth("300")).toBe(300);
  });

  it("returns null for non-positive or unparseable values", () => {
    expect(parseColumnWidth("")).toBeNull();
    expect(parseColumnWidth("abc")).toBeNull();
    expect(parseColumnWidth("0px")).toBeNull();
    expect(parseColumnWidth("-40px")).toBeNull();
  });
});

describe("formatColumnWidth", () => {
  it("appends the px unit", () => {
    expect(formatColumnWidth(300)).toBe("300px");
  });

  it("round-trips with parseColumnWidth", () => {
    expect(parseColumnWidth(formatColumnWidth(360))).toBe(360);
  });
});
