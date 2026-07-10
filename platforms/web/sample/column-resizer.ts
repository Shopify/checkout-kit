import {
  clampColumnWidth,
  COLUMN_BOUNDS,
  formatColumnWidth,
  nextColumnWidth,
  parseColumnWidth,
  type ColumnSide,
} from "./columns";
import { STORAGE_KEYS, readStorage, writeStorage } from "./storage";

const SIDES: readonly ColumnSide[] = ["left", "right"];
const KEYBOARD_STEP = 16;
const DEFAULT_GAP = 16;

const CSS_VAR: Record<ColumnSide, string> = {
  left: "--col-left",
  right: "--col-right",
};

const STORAGE_KEY: Record<ColumnSide, string> = {
  left: STORAGE_KEYS.columnLeft,
  right: STORAGE_KEYS.columnRight,
};

type ColumnResizerDeps = {
  layout: HTMLElement;
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  leftHandle: HTMLElement;
  rightHandle: HTMLElement;
  readWidth?: (side: ColumnSide) => number;
  readPersisted?: (side: ColumnSide) => number | null;
  persist?: (side: ColumnSide, px: number | null) => void;
};

export type ColumnResizer = {
  applyWidths(): void;
  reposition(): void;
};

export function createColumnResizer(deps: ColumnResizerDeps): ColumnResizer {
  const { layout, leftPanel, rightPanel, leftHandle, rightHandle } = deps;
  const panel: Record<ColumnSide, HTMLElement> = { left: leftPanel, right: rightPanel };
  const handle: Record<ColumnSide, HTMLElement> = { left: leftHandle, right: rightHandle };

  const readWidth = deps.readWidth ?? ((side) => panel[side].getBoundingClientRect().width);
  const readPersisted =
    deps.readPersisted ?? ((side) => parseColumnWidth(readStorage(STORAGE_KEY[side])));
  const persist =
    deps.persist ?? ((side, px) => writeStorage(STORAGE_KEY[side], px === null ? "" : String(px)));

  function currentWidth(side: ColumnSide): number {
    const fromVar = parseColumnWidth(layout.style.getPropertyValue(CSS_VAR[side]));
    if (fromVar !== null) return fromVar;
    const persisted = readPersisted(side);
    if (persisted !== null) return clampColumnWidth(side, persisted);
    return readWidth(side);
  }

  function setWidth(side: ColumnSide, px: number): void {
    layout.style.setProperty(CSS_VAR[side], formatColumnWidth(px));
    handle[side].setAttribute("aria-valuenow", String(px));
  }

  function clearWidth(side: ColumnSide): void {
    layout.style.removeProperty(CSS_VAR[side]);
  }

  function gapPx(): number {
    const styles = getComputedStyle(layout);
    const parsed = Number.parseFloat(styles.columnGap || styles.gap || "");
    return Number.isFinite(parsed) ? parsed : DEFAULT_GAP;
  }

  const gap = gapPx();

  function reposition(): void {
    const layoutLeft = layout.getBoundingClientRect().left;
    const leftEdge = leftPanel.getBoundingClientRect().right - layoutLeft + gap / 2;
    const rightEdge = rightPanel.getBoundingClientRect().left - layoutLeft - gap / 2;
    leftHandle.style.left = `${leftEdge - leftHandle.offsetWidth / 2}px`;
    rightHandle.style.left = `${rightEdge - rightHandle.offsetWidth / 2}px`;
  }

  let repositionFrame = 0;

  function scheduleReposition(): void {
    if (repositionFrame) return;
    if (typeof requestAnimationFrame !== "function") {
      reposition();
      return;
    }
    repositionFrame = requestAnimationFrame(() => {
      repositionFrame = 0;
      reposition();
    });
  }

  function beginDrag(side: ColumnSide) {
    return (event: PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = currentWidth(side);
      let width = startWidth;
      let moved = false;
      const target = handle[side];

      if (typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      layout.classList.add("resizing");
      target.classList.add("dragging");

      const onMove = (moveEvent: PointerEvent) => {
        moved = true;
        width = nextColumnWidth(side, startWidth, moveEvent.clientX - startX);
        setWidth(side, width);
        reposition();
      };
      const onEnd = () => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onEnd);
        target.removeEventListener("lostpointercapture", onEnd);
        layout.classList.remove("resizing");
        target.classList.remove("dragging");
        if (moved) persist(side, width);
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onEnd);
      target.addEventListener("lostpointercapture", onEnd);
    };
  }

  function nudge(side: ColumnSide) {
    return (event: KeyboardEvent) => {
      const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (direction === 0) return;
      event.preventDefault();
      const width = nextColumnWidth(side, currentWidth(side), direction * KEYBOARD_STEP);
      setWidth(side, width);
      persist(side, width);
      reposition();
    };
  }

  function reset(side: ColumnSide) {
    return (event: Event) => {
      event.preventDefault();
      clearWidth(side);
      persist(side, null);
      handle[side].setAttribute(
        "aria-valuenow",
        String(clampColumnWidth(side, currentWidth(side))),
      );
      reposition();
    };
  }

  for (const side of SIDES) {
    handle[side].setAttribute("aria-valuemin", String(COLUMN_BOUNDS[side].min));
    handle[side].setAttribute("aria-valuemax", String(COLUMN_BOUNDS[side].max));
    handle[side].setAttribute("aria-valuenow", String(clampColumnWidth(side, currentWidth(side))));
    handle[side].addEventListener("pointerdown", beginDrag(side));
    handle[side].addEventListener("keydown", nudge(side));
    handle[side].addEventListener("dblclick", reset(side));
  }

  function applyWidths(): void {
    for (const side of SIDES) {
      const stored = readPersisted(side);
      if (stored !== null) setWidth(side, clampColumnWidth(side, stored));
    }
    reposition();
  }

  return { applyWidths, reposition: scheduleReposition };
}
