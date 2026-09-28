import { parseColumnWidth, type ColumnSide } from "../columns";
import { coerceLogLevel, readStorage, writeStorage } from "../storage";
import { DEFAULT_DISPLAY, type DisplayState } from "./state";

export const UNIVERSAL_STORAGE_KEYS = {
  target: "checkout-kit:universal-demo:target",
  appearance: "checkout-kit:universal-demo:appearance",
  logLevel: "checkout-kit:universal-demo:log-level",
  settingsCollapsed: "checkout-kit:universal-demo:settings-collapsed",
  eventsCollapsed: "checkout-kit:universal-demo:events-collapsed",
  columnLeft: "checkout-kit:universal-demo:col-left",
  columnRight: "checkout-kit:universal-demo:col-right",
} as const;

const APPEARANCES = new Set(["", "app:light", "app:dark", "app:automatic", "storefront"]);

export function loadUniversalDisplay(): DisplayState {
  const appearance = readStorage(UNIVERSAL_STORAGE_KEYS.appearance);
  return {
    ...DEFAULT_DISPLAY,
    target: readStorage(UNIVERSAL_STORAGE_KEYS.target) === "auto" ? "auto" : "popup",
    appearance: APPEARANCES.has(appearance) ? appearance : "",
    logLevel: coerceLogLevel(readStorage(UNIVERSAL_STORAGE_KEYS.logLevel)),
    settingsCollapsed: readStorage(UNIVERSAL_STORAGE_KEYS.settingsCollapsed) === "1",
    eventsCollapsed: readStorage(UNIVERSAL_STORAGE_KEYS.eventsCollapsed) === "1",
  };
}

export function persistUniversalDisplay(display: DisplayState): void {
  writeStorage(UNIVERSAL_STORAGE_KEYS.target, display.target);
  writeStorage(UNIVERSAL_STORAGE_KEYS.appearance, display.appearance);
  writeStorage(UNIVERSAL_STORAGE_KEYS.logLevel, display.logLevel);
  writeStorage(UNIVERSAL_STORAGE_KEYS.settingsCollapsed, display.settingsCollapsed ? "1" : "");
  writeStorage(UNIVERSAL_STORAGE_KEYS.eventsCollapsed, display.eventsCollapsed ? "1" : "");
}

const WIDTH_KEYS: Record<ColumnSide, string> = {
  left: UNIVERSAL_STORAGE_KEYS.columnLeft,
  right: UNIVERSAL_STORAGE_KEYS.columnRight,
};

export function readUniversalWidth(side: ColumnSide): number | null {
  return parseColumnWidth(readStorage(WIDTH_KEYS[side]));
}

export function persistUniversalWidth(side: ColumnSide, width: number | null): void {
  writeStorage(WIDTH_KEYS[side], width === null ? "" : String(width));
}
