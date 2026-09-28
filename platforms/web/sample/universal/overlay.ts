import {
  UniversalEventHistory,
  type EventHistorySnapshot,
  type KitEventName,
} from "./event-history";
import { createOverlayView } from "./overlay-view";
import "./overlay.css";

/**
 * This narrow structural boundary lets the sample use the public custom
 * element without importing any private Kit parser, reducer or presentation.
 */
export interface UniversalCheckoutElement extends HTMLElement {
  src: string;
  target: string;
  appearance: string;
  logLevel: string;
  readonly checkout?: unknown;
  readonly error?: unknown;
  open(): void;
  close(): void;
  focus(): void;
}

export interface OverlayConfiguration {
  readonly src: string;
  readonly target: string;
  readonly appearance: string;
  readonly logLevel: string;
}

export interface UniversalOverlay {
  readonly element: UniversalCheckoutElement;
  readonly snapshot: EventHistorySnapshot;
  configure(configuration: OverlayConfiguration): boolean;
  /** Synchronous browser-gesture attempt. Its return value is not an outcome. */
  attemptOpen(): boolean;
  clearHistory(): void;
  dispose(): void;
}

export interface MountUniversalOverlayOptions {
  readonly parent: HTMLElement;
  readonly hostLog: HTMLElement;
  readonly hostHeader: HTMLElement;
  readonly hostNotice: HTMLElement;
  readonly element?: UniversalCheckoutElement;
  readonly now?: () => Date;
  /** Use the sample's session destination validator for both generated and pasted URLs. */
  readonly validateSource?: (value: string) => string | undefined;
  readonly onChange?: (snapshot: EventHistorySnapshot) => void;
}

/** Basic transport guard; the caller supplies the stricter configured host policy. */
export function validateHttpsCheckoutSource(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function mountUniversalOverlay(options: MountUniversalOverlayOptions): UniversalOverlay {
  const element =
    options.element ??
    (document.createElement("shopify-universal-checkout") as UniversalCheckoutElement);
  const history = new UniversalEventHistory(options.now);
  const view = createOverlayView({
    hostLog: options.hostLog,
    hostHeader: options.hostHeader,
    hostNotice: options.hostNotice,
    onFocus: () => element.focus(),
    onClose: () => element.close(),
    onClear: () => {
      history.clear();
      render();
    },
  });
  const listeners = new AbortController();
  let configuredSource = "";
  let disposed = false;

  element.classList.add("uc-checkout-host");
  element.append(view.surface);
  options.parent.append(element);

  const names: readonly KitEventName[] = ["start", "update", "complete", "error", "close"];
  for (const name of names) {
    element.addEventListener(
      name,
      (event: Event) => {
        const detail = "detail" in event ? event.detail : undefined;
        history.receive(name, detail, element.checkout, element.error);
        render();
      },
      { signal: listeners.signal },
    );
  }

  function render(): void {
    const snapshot = history.snapshot;
    view.render(snapshot);
    options.onChange?.(snapshot);
  }

  render();

  return {
    element,
    get snapshot() {
      return history.snapshot;
    },
    configure(configuration) {
      if (disposed) return false;
      const source = (options.validateSource ?? validateHttpsCheckoutSource)(configuration.src);
      if (!source) {
        configuredSource = "";
        if (element.src) element.src = "";
        return false;
      }
      if (element.src !== source) element.src = source;
      if (element.target !== configuration.target) element.target = configuration.target;
      if (element.appearance !== configuration.appearance) {
        element.appearance = configuration.appearance;
      }
      if (element.logLevel !== configuration.logLevel) element.logLevel = configuration.logLevel;
      configuredSource = source;
      return true;
    },
    attemptOpen() {
      if (disposed || !configuredSource || element.src !== configuredSource) return false;
      // A close notification for an old presentation belongs to its old history.
      element.close();
      history.beginPresentation();
      render();
      // The call stays in the click stack; no network work or promise precedes it.
      element.open();
      return true;
    },
    clearHistory() {
      if (disposed) return;
      history.clear();
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.abort();
      view.dispose();
      element.close();
      element.remove();
    },
  };
}
