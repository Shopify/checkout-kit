import { beforeEach, describe, expect, it } from "vitest";

import page from "../universal.html?raw";
import { querySourceViewRefs, renderSourceView } from "./source-view";

beforeEach(() => {
  const start = page.indexOf('<main id="layout">');
  const end = page.indexOf("</main>", start);
  document.body.innerHTML = page.slice(start, end + "</main>".length);
});

describe("Universal checkout source controls", () => {
  it("keeps the pasted input mounted while readiness changes", () => {
    const refs = querySourceViewRefs();
    const input = refs.pastedUrl;
    const selected = {
      mode: "pasted" as const,
      url: "",
      ready: false,
      hint: "Use a valid Universal Checkout URL.",
    };
    renderSourceView(refs, "pasted", "partial input", selected);
    input.focus();
    renderSourceView(refs, "pasted", "partial input", {
      ...selected,
      ready: true,
      hint: "Ready.",
    });
    expect(refs.pastedUrl).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("partial input");
    expect(refs.openButton.disabled).toBe(false);
    expect(refs.pastedFields.hidden).toBe(false);
  });

  it("disables Open and clears the advanced input when generated mode is restored", () => {
    const refs = querySourceViewRefs();
    renderSourceView(refs, "pasted", "https://shop.app/checkouts/uc/example?key=private", {
      mode: "pasted",
      url: "",
      ready: false,
      hint: "Invalid.",
    });
    renderSourceView(refs, "generated", "", {
      mode: "generated",
      url: "",
      ready: false,
      hint: "Create a URL first.",
    });
    expect(refs.pastedFields.hidden).toBe(true);
    expect(refs.pastedUrl.value).toBe("");
    expect(refs.openButton.disabled).toBe(true);
    expect(refs.status.textContent).toBe("Create a URL first.");
  });
});
