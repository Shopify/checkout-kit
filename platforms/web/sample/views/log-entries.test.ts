import { beforeEach, describe, expect, it } from "vitest";

import type { LogEntry } from "../state";
import { buildLogEntry, renderLogEntries } from "./log-entries";

function entry(type: string, time = "00:00:00.000"): LogEntry {
  return { type, time, snapshot: "{}" };
}

let ul: HTMLUListElement;
beforeEach(() => {
  ul = document.createElement("ul");
});

describe("buildLogEntry", () => {
  it("creates a list item with the event name and time", () => {
    const li = buildLogEntry(entry("ec.start", "12:34:56.789"), false);
    expect(li.querySelector(".event-entry-name")?.textContent).toBe("ec.start");
    expect(li.querySelector(".event-entry-time")?.textContent).toBe("12:34:56.789");
  });

  it("includes the snapshot in a <pre>", () => {
    const li = buildLogEntry(entry("ec.error"), false);
    expect(li.querySelector("pre")?.textContent).toBe("{}");
  });

  it("does not mark the entry as fresh when fresh is false", () => {
    const li = buildLogEntry(entry("ec.start"), false);
    expect(li.hasAttribute("data-fresh")).toBe(false);
  });

  it("marks the entry as fresh when fresh is true", () => {
    const li = buildLogEntry(entry("ec.start"), true);
    expect(li.hasAttribute("data-fresh")).toBe(true);
  });

  it("removes data-fresh on animationend", () => {
    const li = buildLogEntry(entry("ec.start"), true);
    expect(li.hasAttribute("data-fresh")).toBe(true);

    li.dispatchEvent(new Event("animationend"));
    expect(li.hasAttribute("data-fresh")).toBe(false);
  });

  it("only removes data-fresh once", () => {
    const li = buildLogEntry(entry("ec.start"), true);
    li.dispatchEvent(new Event("animationend"));
    // Re-add manually to verify listener was removed
    li.setAttribute("data-fresh", "");
    li.dispatchEvent(new Event("animationend"));
    expect(li.hasAttribute("data-fresh")).toBe(true);
  });
});

describe("renderLogEntries", () => {
  it("populates an empty list and marks all entries as fresh", () => {
    const log = [entry("b"), entry("a")];
    renderLogEntries(ul, log);

    expect(ul.children).toHaveLength(2);
    expect(ul.children[0]!.getAttribute("data-fresh")).toBe("");
    expect(ul.children[1]!.getAttribute("data-fresh")).toBe("");

    const names = [...ul.querySelectorAll(".event-entry-name")].map((el) => el.textContent);
    expect(names).toEqual(["b", "a"]);
  });

  it("does nothing when the log length has not changed", () => {
    const log = [entry("a")];
    renderLogEntries(ul, log);
    const firstChild = ul.firstElementChild;

    renderLogEntries(ul, log);
    expect(ul.children).toHaveLength(1);
    expect(ul.firstElementChild).toBe(firstChild);
  });

  it("prepends only new entries when the log grows", () => {
    const initial = [entry("a")];
    renderLogEntries(ul, initial);
    const originalChild = ul.firstElementChild!;
    originalChild.dispatchEvent(new Event("animationend"));
    expect(originalChild.hasAttribute("data-fresh")).toBe(false);

    const updated = [entry("c"), entry("b"), entry("a")];
    renderLogEntries(ul, updated);

    expect(ul.children).toHaveLength(3);
    // The two new entries are fresh
    expect(ul.children[0]!.hasAttribute("data-fresh")).toBe(true);
    expect(ul.children[1]!.hasAttribute("data-fresh")).toBe(true);
    // The original entry is the same DOM node, still not fresh
    expect(ul.children[2]).toBe(originalChild);
    expect(ul.children[2]!.hasAttribute("data-fresh")).toBe(false);

    const names = [...ul.querySelectorAll(".event-entry-name")].map((el) => el.textContent);
    expect(names).toEqual(["c", "b", "a"]);
  });

  it("rebuilds the list without flash when the log shrinks (clear)", () => {
    renderLogEntries(ul, [entry("b"), entry("a")]);
    expect(ul.children).toHaveLength(2);

    renderLogEntries(ul, []);
    expect(ul.children).toHaveLength(0);
  });

  it("does not flash entries on rebuild after clear", () => {
    renderLogEntries(ul, [entry("a")]);
    renderLogEntries(ul, []);

    renderLogEntries(ul, [entry("b")]);
    // After a clear the list starts from scratch; the new first entry
    // has existingCount=0 → newCount=1, so it is fresh.
    expect(ul.children).toHaveLength(1);
    expect(ul.children[0]!.hasAttribute("data-fresh")).toBe(true);
  });
});
