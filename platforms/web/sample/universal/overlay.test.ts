import { beforeEach, describe, expect, it, vi } from "vitest";

import { mountUniversalOverlay, type UniversalCheckoutElement } from "./overlay";

const SHOP_ID = "gid://shopify/Shop/private-123";
const SECRET = "buyer@example.test";

function fixture() {
  document.body.className = "universal-page";
  document.body.innerHTML = `
    <input id="shop-draft" value="typing.example.test">
    <section class="runtime-panel">
      <div class="events-header"><h2>Events</h2></div>
      <p id="notice"></p>
      <ul id="event-log"></ul>
    </section>
  `;
  return {
    header: document.querySelector<HTMLElement>(".events-header")!,
    notice: document.querySelector<HTMLElement>("#notice")!,
    log: document.querySelector<HTMLElement>("#event-log")!,
    draft: document.querySelector<HTMLInputElement>("#shop-draft")!,
  };
}

function fakeElement() {
  const element = document.createElement("shopify-universal-checkout") as UniversalCheckoutElement;
  let checkout: unknown;
  let error: unknown;
  Object.assign(element, {
    src: "",
    target: "auto",
    appearance: "storefront",
    logLevel: "warn",
  });
  Object.defineProperties(element, {
    checkout: { get: () => checkout },
    error: { get: () => error },
  });
  const open = vi.fn();
  const focus = vi.fn();
  const close = vi.fn(() => element.dispatchEvent(new Event("close")));
  element.open = open;
  element.focus = focus;
  element.close = close;
  return {
    element,
    open,
    focus,
    close,
    setCheckout(value: unknown) {
      checkout = value;
    },
    setError(value: unknown) {
      error = value;
    },
  };
}

function startEntry(status = "incomplete") {
  return {
    context: { sessionId: "private-session", revision: 1, shopId: SHOP_ID },
    checkout: {
      id: "private-checkout",
      status,
      currency: "EUR",
      lineItems: [{ id: "private-line", buyer: SECRET }],
      buyer: { email: SECRET },
      messages: [{ content: '<script>alert("private")</script>' }],
      continueUrl: "https://shop.app/checkout?token=private-token",
    },
  };
}

function aggregate(status = "incomplete") {
  return {
    sessionId: "private-session",
    revision: 1,
    resources: [{ shopId: SHOP_ID, checkout: startEntry(status).checkout }],
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  document.body.className = "";
});

describe("Universal sample overlay", () => {
  it("opens synchronously and renders safe received events inside the slotted panel", () => {
    const refs = fixture();
    const fake = fakeElement();
    const overlay = mountUniversalOverlay({
      parent: document.body,
      hostLog: refs.log,
      hostHeader: refs.header,
      hostNotice: refs.notice,
      element: fake.element,
    });
    const sequence: string[] = [];
    fake.open.mockImplementation(() => sequence.push("open"));
    expect(
      overlay.configure({
        src: "https://shop.app/checkout?token=private-token",
        target: "popup",
        appearance: "app:light",
        logLevel: "warn",
      }),
    ).toBe(true);
    const button = document.createElement("button");
    button.addEventListener("click", () => {
      overlay.attemptOpen();
      sequence.push("after");
    });
    button.click();
    expect(sequence).toEqual(["open", "after"]);
    expect(fake.element.target).toBe("popup");
    expect(fake.element.querySelector('[slot="overlay"]')).not.toBeNull();
    expect(fake.element.querySelectorAll(".uc-overlay-controls button")).toHaveLength(2);

    fake.setCheckout(aggregate());
    fake.element.dispatchEvent(new CustomEvent("start", { detail: [startEntry()] }));
    const slottedLog = fake.element.querySelector<HTMLOListElement>(".uc-overlay-event-log")!;
    expect(slottedLog.children).toHaveLength(1);
    expect(refs.log.children).toHaveLength(1);
    expect(slottedLog.textContent).toContain("Shop 1");
    expect(fake.element.querySelector(".uc-overlay-resources")?.textContent).toContain(
      "incomplete",
    );
    for (const secret of [SHOP_ID, SECRET, "private-token", "<script>", "private-session"]) {
      expect(slottedLog.textContent).not.toContain(secret);
      expect(refs.log.textContent).not.toContain(secret);
    }
    expect(slottedLog.querySelector("script")).toBeNull();
    overlay.dispose();
  });

  it("preserves an expanded event and shop-draft focus while later events arrive", () => {
    const refs = fixture();
    const fake = fakeElement();
    const overlay = mountUniversalOverlay({
      parent: document.body,
      hostLog: refs.log,
      hostHeader: refs.header,
      hostNotice: refs.notice,
      element: fake.element,
    });
    overlay.configure({
      src: "https://shop.app/checkout",
      target: "auto",
      appearance: "",
      logLevel: "warn",
    });
    overlay.attemptOpen();
    fake.setCheckout(aggregate());
    fake.element.dispatchEvent(new CustomEvent("start", { detail: [startEntry()] }));
    const first = refs.log.firstElementChild!;
    const details = first.querySelector("details")!;
    details.open = true;
    refs.draft.focus();
    fake.setCheckout(aggregate("ready_for_complete"));
    fake.element.dispatchEvent(
      new CustomEvent("update", { detail: [startEntry("ready_for_complete")] }),
    );
    expect(refs.log.firstElementChild).toBe(first);
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(refs.draft);
    expect(refs.draft.value).toBe("typing.example.test");
    overlay.dispose();
  });

  it("keeps state on Clear, provides focus/close controls and resets only on reopening", () => {
    const refs = fixture();
    const fake = fakeElement();
    const overlay = mountUniversalOverlay({
      parent: document.body,
      hostLog: refs.log,
      hostHeader: refs.header,
      hostNotice: refs.notice,
      element: fake.element,
    });
    overlay.configure({
      src: "https://shop.app/checkout",
      target: "popup",
      appearance: "",
      logLevel: "warn",
    });
    overlay.attemptOpen();
    fake.setCheckout(aggregate());
    fake.element.dispatchEvent(new CustomEvent("start", { detail: [startEntry()] }));
    overlay.element.querySelector<HTMLButtonElement>(".uc-overlay-controls button")!.click();
    expect(fake.focus).toHaveBeenCalledOnce();
    refs.header.querySelector<HTMLButtonElement>("button")!.click();
    expect(refs.log.children).toHaveLength(0);
    expect(overlay.snapshot.resources).toHaveLength(1);
    expect(fake.element.querySelector(".uc-overlay-resources")?.textContent).toContain("Shop 1");

    overlay.element.querySelectorAll<HTMLButtonElement>(".uc-overlay-controls button")[1]!.click();
    expect(overlay.snapshot.entries.at(-1)?.name).toBe("close");
    expect(overlay.snapshot.phase).toBe("closed");
    fake.element.dispatchEvent(new CustomEvent("update", { detail: [startEntry()] }));
    expect(overlay.snapshot.entries).toHaveLength(1);
    overlay.attemptOpen();
    expect(overlay.snapshot.presentation).toBe(2);
    expect(overlay.snapshot.entries).toHaveLength(0);
    fake.element.dispatchEvent(new CustomEvent("start", { detail: [startEntry()] }));
    expect(overlay.snapshot.entries).toHaveLength(1);
    overlay.dispose();
    fake.element.dispatchEvent(new CustomEvent("start", { detail: [startEntry()] }));
    expect(overlay.snapshot.entries).toHaveLength(1);
    expect(refs.header.querySelector("button")).toBeNull();
  });

  it("rejects unsafe sources before opening", () => {
    const refs = fixture();
    const fake = fakeElement();
    const overlay = mountUniversalOverlay({
      parent: document.body,
      hostLog: refs.log,
      hostHeader: refs.header,
      hostNotice: refs.notice,
      element: fake.element,
      validateSource: (value) => (value === "https://shop.app/checkout" ? value : undefined),
    });
    expect(
      overlay.configure({
        src: "https://shop.app.evil.test/checkout",
        target: "popup",
        appearance: "",
        logLevel: "warn",
      }),
    ).toBe(false);
    expect(overlay.attemptOpen()).toBe(false);
    expect(fake.open).not.toHaveBeenCalled();
    overlay.dispose();
  });
});
