import { beforeEach, describe, expect, it } from "vitest";

import { COLUMN_BOUNDS } from "./columns";
import { createColumnResizer } from "./column-resizer";

type Handles = {
  layout: HTMLElement;
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  leftHandle: HTMLElement;
  rightHandle: HTMLElement;
};

function mount(): Handles {
  document.body.innerHTML = `
    <main id="layout">
      <section class="panel settings-panel"></section>
      <section class="panel storefront"></section>
      <section class="panel runtime-panel"></section>
      <div class="col-resizer" id="resize-left" tabindex="0"></div>
      <div class="col-resizer" id="resize-right" tabindex="0"></div>
    </main>`;
  return {
    layout: document.querySelector<HTMLElement>("#layout")!,
    leftPanel: document.querySelector<HTMLElement>(".settings-panel")!,
    rightPanel: document.querySelector<HTMLElement>(".runtime-panel")!,
    leftHandle: document.querySelector<HTMLElement>("#resize-left")!,
    rightHandle: document.querySelector<HTMLElement>("#resize-right")!,
  };
}

function pointer(type: string, clientX: number): MouseEvent {
  return new MouseEvent(type, { clientX, bubbles: true, cancelable: true });
}

function arrow(key: string): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
}

let dom: Handles;
beforeEach(() => {
  localStorage.clear();
  dom = mount();
});

describe("createColumnResizer.applyWidths", () => {
  it("applies persisted widths as CSS variables", () => {
    localStorage.setItem("checkout-kit:web-demo:col-left", "300");
    localStorage.setItem("checkout-kit:web-demo:col-right", "420");
    const resizer = createColumnResizer(dom);

    resizer.applyWidths();

    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("300px");
    expect(dom.layout.style.getPropertyValue("--col-right")).toBe("420px");
  });

  it("leaves the variables unset when nothing is persisted", () => {
    const resizer = createColumnResizer(dom);
    resizer.applyWidths();
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("");
  });

  it("clamps persisted widths beyond the bounds", () => {
    localStorage.setItem("checkout-kit:web-demo:col-left", "9999");
    createColumnResizer(dom).applyWidths();
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe(`${COLUMN_BOUNDS.left.max}px`);
  });
});

describe("createColumnResizer drag", () => {
  it("grows the left column as the pointer moves right and persists on release", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    dom.leftHandle.dispatchEvent(pointer("pointerdown", 0));
    dom.leftHandle.dispatchEvent(pointer("pointermove", 40));

    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("340px");

    dom.leftHandle.dispatchEvent(pointer("pointerup", 40));
    expect(localStorage.getItem("checkout-kit:web-demo:col-left")).toBe("340");
  });

  it("grows the right column as the pointer moves left", () => {
    createColumnResizer({ ...dom, readWidth: () => 400 });

    dom.rightHandle.dispatchEvent(pointer("pointerdown", 0));
    dom.rightHandle.dispatchEvent(pointer("pointermove", -50));

    expect(dom.layout.style.getPropertyValue("--col-right")).toBe("450px");

    dom.rightHandle.dispatchEvent(pointer("pointerup", -50));
    expect(localStorage.getItem("checkout-kit:web-demo:col-right")).toBe("450");
  });

  it("clamps to the maximum while dragging", () => {
    createColumnResizer({ ...dom, readWidth: () => COLUMN_BOUNDS.left.max });

    dom.leftHandle.dispatchEvent(pointer("pointerdown", 0));
    dom.leftHandle.dispatchEvent(pointer("pointermove", 500));

    expect(dom.layout.style.getPropertyValue("--col-left")).toBe(`${COLUMN_BOUNDS.left.max}px`);
  });

  it("stops tracking the pointer after release", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    dom.leftHandle.dispatchEvent(pointer("pointerdown", 0));
    dom.leftHandle.dispatchEvent(pointer("pointermove", 20));
    dom.leftHandle.dispatchEvent(pointer("pointerup", 20));
    dom.leftHandle.dispatchEvent(pointer("pointermove", 200));

    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("320px");
  });

  it("does not persist when pressed and released without moving", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    dom.leftHandle.dispatchEvent(pointer("pointerdown", 0));
    dom.leftHandle.dispatchEvent(pointer("pointerup", 0));

    expect(localStorage.getItem("checkout-kit:web-demo:col-left")).toBeNull();
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("");
  });
});

describe("createColumnResizer keyboard", () => {
  it("nudges the width with arrow keys and persists", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    dom.leftHandle.dispatchEvent(arrow("ArrowRight"));
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("316px");
    expect(localStorage.getItem("checkout-kit:web-demo:col-left")).toBe("316");

    dom.leftHandle.dispatchEvent(arrow("ArrowLeft"));
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("300px");
  });

  it("ignores unrelated keys", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });
    dom.leftHandle.dispatchEvent(arrow("Enter"));
    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("");
  });
});

describe("createColumnResizer aria", () => {
  it("exposes the width range and current value via aria", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    expect(dom.leftHandle.getAttribute("aria-valuemin")).toBe(String(COLUMN_BOUNDS.left.min));
    expect(dom.leftHandle.getAttribute("aria-valuemax")).toBe(String(COLUMN_BOUNDS.left.max));
    expect(dom.rightHandle.getAttribute("aria-valuemin")).toBe(String(COLUMN_BOUNDS.right.min));
    expect(dom.rightHandle.getAttribute("aria-valuemax")).toBe(String(COLUMN_BOUNDS.right.max));

    dom.leftHandle.dispatchEvent(arrow("ArrowRight"));
    expect(dom.leftHandle.getAttribute("aria-valuenow")).toBe("316");
  });

  it("initializes aria-valuenow on load when no width is persisted", () => {
    createColumnResizer({ ...dom, readWidth: () => 300 });

    expect(dom.leftHandle.getAttribute("aria-valuenow")).toBe("300");
    expect(dom.rightHandle.getAttribute("aria-valuenow")).toBe("300");
  });
});

describe("createColumnResizer reset", () => {
  it("clears the width and storage on double-click", () => {
    localStorage.setItem("checkout-kit:web-demo:col-left", "300");
    const resizer = createColumnResizer(dom);
    resizer.applyWidths();

    dom.leftHandle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    expect(dom.layout.style.getPropertyValue("--col-left")).toBe("");
    expect(localStorage.getItem("checkout-kit:web-demo:col-left")).toBeNull();
  });
});
