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

/**
 * A handful of utils copied from storefront-components repo
 * https://github.com/Shopify/storefront-components/tree/preview/src/utilities
 */

export class ShopifyElement extends HTMLElement {
  #shadow?: ShadowRoot;
  disconnected = false;
  events: Record<string, EventListener> = {};

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
  }

  render(content: string) {
    if (this.disconnected) {
      return;
    }
    if (!this.#shadow) throw new ShopifyElementError("No shadow root found");

    let wrapper = this.#shadow.querySelector("#shopify-element-wrapper");

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "shopify-element-wrapper";
      this.#shadow.appendChild(wrapper);
    }

    const range = document.createRange();
    range.selectNodeContents(wrapper);
    const fragment = range.createContextualFragment(content);

    wrapper.textContent = "";
    wrapper.appendChild(fragment);
  }

  styles(...styles: string[]) {
    // @todo - Use constructible stylesheets when we drop support for Safari 16.
    const sheet = document.createElement("style");
    sheet.textContent = styles.join("\n");
    this.#shadow?.appendChild(sheet);
  }

  connectedCallback() {
    Object.entries(this.events).forEach(([eventKey, listener]) => {
      const parts = eventKey.split(" ");
      const type = parts[0] ?? "";
      const selector = parts[1];

      // Event delegation. Events should automatically be cleared when the element is disconnected.
      (selector === "this" ? this : this.shadowRoot)?.addEventListener(type, (event) => {
        const target = event.target as Element | null;
        const selected =
          selector === undefined
            ? undefined
            : selector === "this"
              ? target
              : target?.matches(selector)
                ? target
                : (target?.closest(selector) ?? null);

        if ((selector && selected) || selector === "this")
          listener({
            ...event,
            target: (selector === "this" ? this : selected) as Element,
          });
      });
    });
  }

  disconnectedCallback() {
    this.disconnected = true;
  }
}

export class ShopifyElementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyElementError";
  }
}

function concatTemplateStrings(strings: TemplateStringsArray, ...values: unknown[]) {
  const processedStrings = strings.map((str) =>
    str.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r").replace(/\\\\/g, "\\"),
  );
  let result = processedStrings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    result += String(values[i]) + (processedStrings[i + 1] ?? "");
  }
  return result;
}
export const html = concatTemplateStrings;
export const css = concatTemplateStrings;
