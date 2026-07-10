export type SourceMode = "build" | "manual";

export type PersistedSettings = {
  sourceMode: SourceMode;
  storefrontDomain: string;
  target: string;
  appearance: string;
  debug: boolean;
  settingsCollapsed: boolean;
};

export const STORAGE_KEYS = {
  sourceMode: "checkout-kit:web-demo:source-mode",
  storefrontDomain: "checkout-kit:web-demo:storefront-domain",
  target: "checkout-kit:web-demo:target",
  appearance: "checkout-kit:web-demo:appearance",
  debug: "checkout-kit:web-demo:debug",
  settingsCollapsed: "checkout-kit:web-demo:settings-collapsed",
  columnLeft: "checkout-kit:web-demo:col-left",
  columnRight: "checkout-kit:web-demo:col-right",
} as const;

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
    debug: readStorage(STORAGE_KEYS.debug) === "1",
    settingsCollapsed: readStorage(STORAGE_KEYS.settingsCollapsed) === "1",
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
  if (settings.debug !== undefined) {
    writeStorage(STORAGE_KEYS.debug, settings.debug ? "1" : "");
  }
  if (settings.settingsCollapsed !== undefined) {
    writeStorage(STORAGE_KEYS.settingsCollapsed, settings.settingsCollapsed ? "1" : "");
  }
}
