import type { LogLevel } from "@shopify/checkout-kit";

export type SourceMode = "build" | "manual";

export type PersistedSettings = {
  sourceMode: SourceMode;
  storefrontDomain: string;
  target: string;
  appearance: string;
  logLevel: LogLevel;
  settingsCollapsed: boolean;
  eventsCollapsed: boolean;
};

export const STORAGE_KEYS = {
  sourceMode: "checkout-kit:web-demo:source-mode",
  storefrontDomain: "checkout-kit:web-demo:storefront-domain",
  target: "checkout-kit:web-demo:target",
  appearance: "checkout-kit:web-demo:appearance",
  logLevel: "checkout-kit:web-demo:log-level",
  settingsCollapsed: "checkout-kit:web-demo:settings-collapsed",
  eventsCollapsed: "checkout-kit:web-demo:events-collapsed",
  columnLeft: "checkout-kit:web-demo:col-left",
  columnRight: "checkout-kit:web-demo:col-right",
} as const;

export const DEFAULT_LOG_LEVEL: LogLevel = "warn";

const LOG_LEVELS: readonly LogLevel[] = ["debug", "warn", "error", "none"];

export function coerceLogLevel(value: string): LogLevel {
  return LOG_LEVELS.includes(value as LogLevel) ? (value as LogLevel) : DEFAULT_LOG_LEVEL;
}

export function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

export function loadPersistedSettings(): PersistedSettings {
  return {
    sourceMode: readStorage(STORAGE_KEYS.sourceMode) === "manual" ? "manual" : "build",
    storefrontDomain: readStorage(STORAGE_KEYS.storefrontDomain),
    target: readStorage(STORAGE_KEYS.target),
    appearance: readStorage(STORAGE_KEYS.appearance),
    logLevel: coerceLogLevel(readStorage(STORAGE_KEYS.logLevel)),
    settingsCollapsed: readStorage(STORAGE_KEYS.settingsCollapsed) === "1",
    eventsCollapsed: readStorage(STORAGE_KEYS.eventsCollapsed) === "1",
  };
}

export function persistSettings(settings: Partial<PersistedSettings>): void {
  if (settings.sourceMode !== undefined) {
    writeStorage(STORAGE_KEYS.sourceMode, settings.sourceMode);
  }
  if (settings.storefrontDomain !== undefined) {
    writeStorage(STORAGE_KEYS.storefrontDomain, settings.storefrontDomain);
  }
  if (settings.target !== undefined) {
    writeStorage(STORAGE_KEYS.target, settings.target);
  }
  if (settings.appearance !== undefined) {
    writeStorage(STORAGE_KEYS.appearance, settings.appearance);
  }
  if (settings.logLevel !== undefined) {
    writeStorage(STORAGE_KEYS.logLevel, settings.logLevel);
  }
  if (settings.settingsCollapsed !== undefined) {
    writeStorage(STORAGE_KEYS.settingsCollapsed, settings.settingsCollapsed ? "1" : "");
  }
  if (settings.eventsCollapsed !== undefined) {
    writeStorage(STORAGE_KEYS.eventsCollapsed, settings.eventsCollapsed ? "1" : "");
  }
}
