import { describe, expect, it } from "vitest";

import { createTemplate, css, html, safe, type SafeMarkup } from "./utils";

describe("safe", () => {
  it("returns the input unchanged at runtime", () => {
    expect(safe("<b>hi</b>")).toBe("<b>hi</b>");
  });
});

describe("html / css tagged templates", () => {
  it("concatenates static strings only", () => {
    expect(html`<p>hello</p>`).toBe("<p>hello</p>");
  });

  it("interpolates SafeMarkup values between segments", () => {
    const name = safe("<em>Westin</em>");
    expect(html`hello ${name}!`).toBe("hello <em>Westin</em>!");
  });

  it("handles multiple interpolations", () => {
    const a = safe("A");
    const b = safe("B");
    expect(html`${a}-${b}-${a}`).toBe("A-B-A");
  });

  it("falls back to empty strings when the template array has missing slots", () => {
    const emptyStrings = Object.assign([], { raw: [] }) as unknown as TemplateStringsArray;
    expect(html(emptyStrings)).toBe("");
  });

  it("css is the same function as html", () => {
    expect(css).toBe(html);
  });

  describe("unsafe interpolation", () => {
    it("rejects raw strings at the type level", () => {
      const raw = "<script>alert(1)</script>";
      // @ts-expect-error — raw strings must go through `safe()` first.
      const result = html`prefix ${raw} suffix`;
      // The directive above asserts the compile-time guard. At runtime the
      // call still succeeds; this assertion exists so the test exercises
      // something other than the type-system check.
      expect(typeof result).toBe("string");
    });

    it("does not sanitize values at runtime if the type system is bypassed", () => {
      const escaped = "<script>alert(1)</script>" as unknown as SafeMarkup;
      expect(html`prefix ${escaped} suffix`).toBe("prefix <script>alert(1)</script> suffix");
    });
  });
});

describe("createTemplate", () => {
  it("returns an HTMLTemplateElement whose content holds the parsed fragment", () => {
    const template = createTemplate(html`<div class="hi">hi</div>`);
    expect(template).toBeInstanceOf(HTMLTemplateElement);
    const div = template.content.querySelector("div");
    expect(div).toBeTruthy();
    expect(div!.classList.contains("hi")).toBe(true);
    expect(div!.textContent).toBe("hi");
  });

  it("clones to a live tree when content is appended", () => {
    const template = createTemplate(html`<span>cloned</span>`);
    const host = document.createElement("div");
    host.append(template.content.cloneNode(true));
    expect(host.querySelector("span")!.textContent).toBe("cloned");
  });
});
