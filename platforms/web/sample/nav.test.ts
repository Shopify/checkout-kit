import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import checkoutHtml from "./index.html?raw";
import shopPayHtml from "./shop-pay/index.html?raw";
import universalHtml from "./universal-checkout/index.html?raw";

// Each sample page and the path the sample server serves it from.
const pages = [
  { path: "/", html: checkoutHtml, label: "Checkout" },
  { path: "/shop-pay/", html: shopPayHtml, label: "Shop Pay" },
  { path: "/universal-checkout/", html: universalHtml, label: "Universal Checkout" },
];
const origin = "https://sample.example.test";

function navLinks(html: string) {
  // Parse only the nav: a parsed page would try to load its stylesheets.
  const template = document.createElement("template");
  template.innerHTML = /<nav class="sample-nav"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
  return [...template.content.querySelectorAll<HTMLAnchorElement>("a")];
}

describe("sample navigation", () => {
  it.each(pages)("links $label to every sample page", ({ path, html }) => {
    const links = navLinks(html);

    expect(links.map((link) => link.textContent)).toEqual(pages.map(({ label }) => label));
    // Relative links keep working when the sample is hosted below the domain root.
    const targets = links.map((link) => {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\.\.?\//);
      return new URL(href, `${origin}${path}`).pathname;
    });
    expect(targets).toEqual(pages.map((page) => page.path));
  });

  it.each(pages)("marks only $label as the current page", ({ html, label }) => {
    const current = navLinks(html).filter((link) => link.getAttribute("aria-current") === "page");

    expect(current.map((link) => link.textContent)).toEqual([label]);
  });

  // Read from disk: Vitest doesn't load stylesheet contents.
  it.each(["./styles.css", "./universal-session/styles.css"])(
    "leaves nav styles to nav.css, not %s, so it looks the same on every page",
    (file) => {
      const css = readFileSync(new URL(file, import.meta.url), "utf8");

      expect(css).toContain("{");
      expect(css).not.toContain(".sample-nav");
    },
  );
});
