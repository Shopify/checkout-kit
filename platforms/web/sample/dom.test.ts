import { describe, expect, it } from "vitest";

import { $, formatValue, quantityButton, setStringAttribute, timestamp } from "./dom";

describe("$", () => {
  it("returns the matching element", () => {
    document.body.innerHTML = `<div id="target"></div>`;
    expect($("#target").id).toBe("target");
  });

  it("throws when the element is missing", () => {
    document.body.innerHTML = "";
    expect(() => $("#missing")).toThrow(/element not found/);
  });
});

describe("formatValue", () => {
  it("renders an em dash for nullish values", () => {
    expect(formatValue(undefined)).toBe("—");
    expect(formatValue(null)).toBe("—");
  });

  it("passes strings through unchanged", () => {
    expect(formatValue("popup")).toBe("popup");
  });

  it("pretty-prints other values as JSON", () => {
    expect(formatValue({ a: 1 })).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(formatValue(true)).toBe("true");
  });
});

describe("timestamp", () => {
  it("formats the current time as hh:mm:ss.mmm", () => {
    expect(timestamp()).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});

describe("setStringAttribute", () => {
  it("sets the attribute for non-empty strings", () => {
    const el = document.createElement("div");
    setStringAttribute(el, "src", "https://example.test");
    expect(el.getAttribute("src")).toBe("https://example.test");
  });

  it("removes the attribute for empty or null values", () => {
    const el = document.createElement("div");
    el.setAttribute("src", "https://example.test");
    setStringAttribute(el, "src", "");
    expect(el.hasAttribute("src")).toBe(false);

    el.setAttribute("src", "https://example.test");
    setStringAttribute(el, "src", null);
    expect(el.hasAttribute("src")).toBe(false);
  });
});

describe("quantityButton", () => {
  it("builds an increment button with an accessible label", () => {
    const button = quantityButton("+", "increment", "Sample product");
    expect(button.dataset["cartAction"]).toBe("increment");
    expect(button.textContent).toBe("+");
    expect(button.getAttribute("aria-label")).toBe("Increase Sample product");
  });

  it("builds a decrement button with an accessible label", () => {
    const button = quantityButton("−", "decrement", "Sample product");
    expect(button.dataset["cartAction"]).toBe("decrement");
    expect(button.getAttribute("aria-label")).toBe("Decrease Sample product");
  });
});
