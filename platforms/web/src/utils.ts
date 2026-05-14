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
 * Branded type marking a string as safe to interpolate into an `html`
 * or `css` tagged template. The brand can only be added via `safe()`,
 * `html\`\``, or `css\`\``, so any direct interpolation of a raw
 * `string` is a compile-time error.
 */
declare const SafeBrand: unique symbol;
export type SafeMarkup = string & { readonly [SafeBrand]: true };

/**
 * Use this to drop a plain string into an `html` or `css` template.
 * Reach for it sparingly: anything that came from an attribute,
 * property, or message payload belongs outside the template, applied
 * through DOM APIs after render.
 */
export const safe = (value: string): SafeMarkup => value as SafeMarkup;

/**
 * Tagged template literal that concatenates strings and `SafeMarkup`
 * values into a `SafeMarkup` result. The `html` name is purely for
 * editor syntax highlighting — it does NOT escape or sanitize. The
 * `SafeMarkup` interpolation constraint at the type level prevents
 * accidentally embedding a raw string without going through `safe()`.
 */
export const html = (strings: TemplateStringsArray, ...values: SafeMarkup[]): SafeMarkup => {
  let raw = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    raw += values[i] + (strings[i + 1] ?? "");
  }
  return raw as SafeMarkup;
};

/** Same semantics as `html`; separate name for CSS editor highlighting. */
export const css: typeof html = html;

/**
 * Parses a `SafeMarkup` string into an inert `<template>`.
 */
export function createTemplate(content: SafeMarkup): HTMLTemplateElement {
  const template = document.createElement("template");
  const range = document.createRange();
  range.selectNodeContents(template.content);
  template.content.appendChild(range.createContextualFragment(content));
  return template;
}
