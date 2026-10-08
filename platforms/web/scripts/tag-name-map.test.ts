import { describe, expect, it } from "vitest";

import { appendTagNameMap, collectTagNames, createTagNameCollector } from "./tag-name-map";

const component = (tag: string, name: string) => `
import { ${name} } from './${tag}';
declare global {
    interface HTMLElementTagNameMap {
        "${tag}": ${name};
    }
}
`;

const rolledUp = `
export declare class ShopifyCheckout extends HTMLElement {
    open(): void;
}
declare class OtherElement extends HTMLElement {
}
export { OtherElement }
export { }
`;

describe("collectTagNames", () => {
  it("reads entries from a declare global block", () => {
    expect(collectTagNames(component("shopify-checkout", "ShopifyCheckout"))).toEqual(
      new Map([["shopify-checkout", "ShopifyCheckout"]]),
    );
  });

  it("ignores declarations without a tag-name augmentation", () => {
    expect(collectTagNames(rolledUp).size).toBe(0);
    expect(collectTagNames("declare global { interface Window { checkout: unknown } }").size).toBe(
      0,
    );
  });

  it("rejects entries it cannot reproduce in the rolled-up declarations", () => {
    expect(() =>
      collectTagNames(
        'declare global { interface HTMLElementTagNameMap { "x-el": import("./x").X } }',
      ),
    ).toThrow(/Unsupported HTMLElementTagNameMap entry/);
  });
});

describe("createTagNameCollector", () => {
  it("merges every component and rejects conflicting classes for one tag", () => {
    const collector = createTagNameCollector();
    collector.add("a.d.ts", component("shopify-checkout", "ShopifyCheckout"));
    collector.add("b.d.ts", component("other-element", "OtherElement"));
    collector.add("index.d.ts", rolledUp);
    expect(collector.tags).toEqual(
      new Map([
        ["shopify-checkout", "ShopifyCheckout"],
        ["other-element", "OtherElement"],
      ]),
    );
    expect(() => collector.add("c.d.ts", component("other-element", "ShopifyCheckout"))).toThrow(
      /maps to both OtherElement and ShopifyCheckout/,
    );
  });
});

describe("appendTagNameMap", () => {
  it("appends one sorted augmentation for exported classes", () => {
    const output = appendTagNameMap(
      rolledUp,
      new Map([
        ["shopify-checkout", "ShopifyCheckout"],
        ["other-element", "OtherElement"],
      ]),
    );
    expect(
      output.endsWith(`export { }

declare global {
  interface HTMLElementTagNameMap {
    "other-element": OtherElement;
    "shopify-checkout": ShopifyCheckout;
  }
}
`),
    ).toBe(true);
    expect(collectTagNames(output).size).toBe(2);
  });

  it("fails when a mapped class is not exported from the entry", () => {
    expect(() =>
      appendTagNameMap(rolledUp, new Map([["missing-element", "MissingElement"]])),
    ).toThrow(/must be exported from the package entry: MissingElement/);
  });

  it("leaves declarations without custom elements untouched and never appends twice", () => {
    expect(appendTagNameMap(rolledUp, new Map())).toBe(rolledUp);
    const once = appendTagNameMap(rolledUp, new Map([["shopify-checkout", "ShopifyCheckout"]]));
    expect(() =>
      appendTagNameMap(once, new Map([["shopify-checkout", "ShopifyCheckout"]])),
    ).toThrow(/already augment/);
  });
});
