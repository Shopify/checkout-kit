import { afterEach, describe, expect, it, vi } from "vitest";

import batches from "../../src/__fixtures__/provisional-universal-checkout-batches.json";
import "../../src/universal";
import { mountUniversalOverlay, type UniversalOverlay } from "./overlay";
import { isContinuationUrl } from "./policy";

const SOURCE = "https://shop.app/checkouts/uc/example?key=synthetic";
let overlay: UniversalOverlay | undefined;

function popup(): Window {
  return {
    closed: false,
    close: vi.fn(),
    focus: vi.fn(),
    postMessage: vi.fn(),
  } as unknown as Window;
}

function send(source: Window, data: unknown, origin = "https://shop.app"): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: structuredClone(data),
      origin,
      source,
    }),
  );
}

afterEach(() => {
  overlay?.dispose();
  overlay = undefined;
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("Universal sample with the registered Checkout Kit element", () => {
  it("renders trusted two-shop batches in the slotted overlay and isolates the next presentation", () => {
    document.body.innerHTML = `
      <div class="events-header"><h2>Events</h2></div>
      <p id="runtime-notice"></p>
      <ul id="event-log"></ul>
    `;
    const hostLog = document.querySelector<HTMLElement>("#event-log")!;
    const hostNotice = document.querySelector<HTMLElement>("#runtime-notice")!;
    const hostHeader = document.querySelector<HTMLElement>(".events-header")!;
    const element = document.createElement("shopify-universal-checkout");
    element.telemetry = false;

    const firstPopup = popup();
    const secondPopup = popup();
    vi.spyOn(window, "open").mockReturnValueOnce(firstPopup).mockReturnValueOnce(secondPopup);
    vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
      function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    );
    vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(
      function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    );

    overlay = mountUniversalOverlay({
      parent: document.body,
      hostLog,
      hostHeader,
      hostNotice,
      element,
      validateSource: (value) => (isContinuationUrl(value, "production") ? value : undefined),
    });
    expect(
      overlay.configure({ src: SOURCE, target: "popup", appearance: "", logLevel: "warn" }),
    ).toBe(true);
    expect(overlay.attemptOpen()).toBe(true);
    expect(element.shadowRoot?.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    expect(element.querySelector('[slot="overlay"]')).not.toBeNull();

    send(firstPopup, batches.ready.request);
    expect(firstPopup.postMessage).toHaveBeenCalledWith(batches.ready.response, "https://shop.app");

    // Structured clone preserves explicit undefined keys from pre-fix producers.
    const start = structuredClone(batches.start);
    for (const entry of start) {
      Object.assign(entry.params.checkout, { order: undefined, fulfillment: undefined });
    }
    send(firstPopup, start);

    expect(overlay.snapshot.entries.map((entry) => entry.name)).toEqual(["start", "start"]);
    expect(overlay.snapshot.resources.map((resource) => resource.label)).toEqual([
      "Shop 1",
      "Shop 2",
    ]);
    expect(hostLog.children).toHaveLength(2);
    expect(element.querySelector(".uc-overlay-event-log")?.children).toHaveLength(2);
    expect(hostNotice.textContent).toContain("receiving events");
    expect(hostLog.textContent).not.toContain("gid://shopify/");
    expect(hostLog.textContent).not.toContain("synthetic");

    const partial = structuredClone(batches.complete[0]!);
    Object.assign(partial, { method: "ec.update" });
    partial.params.context.revision = 2;
    send(firstPopup, [partial]);
    expect(overlay.snapshot.phase).toBe("active");
    expect(overlay.snapshot.resources.map((resource) => resource.status)).toEqual([
      "completed",
      "incomplete",
    ]);

    send(firstPopup, batches.complete);
    expect(overlay.snapshot.phase).toBe("complete");
    expect(overlay.snapshot.resources.map((resource) => resource.status)).toEqual([
      "completed",
      "completed",
    ]);
    expect(overlay.snapshot.entries.map((entry) => entry.name)).toEqual([
      "start",
      "start",
      "update",
      "complete",
      "complete",
    ]);

    element.close();
    expect(overlay.snapshot.phase).toBe("closed");
    expect(overlay.snapshot.entries.at(-1)?.name).toBe("close");

    expect(overlay.attemptOpen()).toBe(true);
    expect(overlay.snapshot.presentation).toBe(2);
    expect(overlay.snapshot.entries).toHaveLength(0);
    send(firstPopup, start);
    send(secondPopup, start, "https://foreign.example.test");
    expect(overlay.snapshot.entries).toHaveLength(0);
    send(secondPopup, batches.start);
    expect(overlay.snapshot.entries.map((entry) => entry.name)).toEqual(["start", "start"]);
    expect(hostLog.children).toHaveLength(2);
  });
});
