/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { describe, expect, it } from "vitest";

import { createTemplate, css, html, safe } from "./utils";

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
});

describe("createTemplate", () => {
  it("returns an HTMLTemplateElement whose content holds the parsed fragment", () => {
    const template = createTemplate(html`<div class="hi">hi</div>`);
    expect(template).toBeInstanceOf(HTMLTemplateElement);
    const div = template.content.querySelector("div");
    expect(div).toBeTruthy();
    expect(div?.classList.contains("hi")).toBe(true);
    expect(div?.textContent).toBe("hi");
  });

  it("clones to a live tree when content is appended", () => {
    const template = createTemplate(html`<span>cloned</span>`);
    const host = document.createElement("div");
    host.append(template.content.cloneNode(true));
    expect(host.querySelector("span")?.textContent).toBe("cloned");
  });
});
