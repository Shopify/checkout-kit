/**
 * Protocol inspector for session samples.
 *
 * Records Kit events and protocol messages for any element that exposes:
 * - src, target, logLevel attributes
 * - open(), close(), focus() methods
 * - start, update, complete, error, close events
 * - An overlay slot for the inspector surface
 */

import type { ShopifyUniversalCheckoutEventMap } from "@shopify/checkout-kit";

import {
  UniversalEventHistory,
  type EventHistorySnapshot,
  type KitEventName,
} from "./event-history";
import { createInspectorView } from "./inspector-view";
import { MAX_PROTOCOL_SOURCE_LABELS, UniversalProtocolHistory } from "./protocol-history";
import { UniversalSessionState } from "./session-state";
import "./overlay.css";

type ErrorDetail = ShopifyUniversalCheckoutEventMap["error"]["detail"];
type ResourceDetail = ShopifyUniversalCheckoutEventMap["update"]["detail"];

export interface SessionElement extends HTMLElement {
  src: string;
  target: string;
  logLevel: string;
  open(): void;
  close(): void;
  focus(): void;
}

export interface SessionInspectorOptions {
  readonly element: SessionElement;
  readonly productName: string;
  /** Host-page section that keeps the protocol messages after the checkout closes. */
  readonly hostProtocolSection: HTMLElement;
  readonly now?: () => Date;
  readonly onChange?: (snapshot: EventHistorySnapshot) => void;
}

export interface SessionInspector {
  readonly snapshot: EventHistorySnapshot;
  /** Begin recording. Call this before open() to capture all protocol messages. */
  begin(src: string): void;
  clearHistory(): void;
  dispose(): void;
}

export function createSessionInspector(options: SessionInspectorOptions): SessionInspector {
  const { element, productName } = options;
  const history = new UniversalEventHistory(options.now);
  const session = new UniversalSessionState();
  const protocol = new UniversalProtocolHistory((value) => history.labelFor(value), options.now);

  const view = createInspectorView({
    productName,
    hostProtocolSection: options.hostProtocolSection,
    onFocus: () => element.focus(),
    onClose: () => element.close(),
    onClear: () => {
      history.clear();
      protocol.clear();
      render();
    },
  });

  const listeners = new AbortController();
  let disposed = false;
  let observingProtocol = false;
  let protocolOrigin = "";
  let protocolSources = new WeakMap<MessageEventSource, number>();
  let nextProtocolSource = 1;

  // The inspector surface fills the element's overlay slot. The element shows that slot
  // only while checkout is open, including before `start` (for example during sign-in).
  view.surface.slot = "overlay";
  element.append(view.surface);

  const names: readonly KitEventName[] = ["start", "update", "complete", "error", "close"];
  for (const name of names) {
    element.addEventListener(
      name,
      (event: Event) => {
        if (name === "close") observingProtocol = false;
        const detail = "detail" in event ? event.detail : undefined;
        // The element reports each change once; the host keeps the session's state.
        if (name === "error") session.fail(detail as ErrorDetail);
        else if (name !== "close") session.update(name, detail as ResourceDetail);
        history.receive(name, detail, session.checkout, session.error);
        render();
      },
      { signal: listeners.signal },
    );
  }

  // Origin-filtered diagnostics are separate from Kit's active-window validation.
  window.addEventListener(
    "message",
    (event: MessageEvent<unknown>) => {
      if (
        !observingProtocol ||
        event.origin !== protocolOrigin ||
        !event.source ||
        event.source === window
      ) {
        return;
      }
      const knownSource = protocolSources.get(event.source);
      const sourceIndex =
        knownSource ?? (nextProtocolSource <= MAX_PROTOCOL_SOURCE_LABELS ? nextProtocolSource : 0);
      if (protocol.receive(event.data, sourceIndex)) {
        if (knownSource === undefined && sourceIndex !== 0) {
          protocolSources.set(event.source, sourceIndex);
          nextProtocolSource += 1;
        }
        render();
      }
    },
    { capture: true, signal: listeners.signal },
  );

  function render(): void {
    const snapshot = history.snapshot;
    view.render(snapshot, protocol.entries);
    options.onChange?.(snapshot);
  }

  render();

  return {
    get snapshot() {
      return history.snapshot;
    },
    begin(src) {
      if (disposed) return;
      // A close notification for an old presentation belongs to its old history.
      element.close();
      history.beginPresentation();
      session.reset();
      protocol.clear();
      try {
        protocolOrigin = new URL(src).origin;
      } catch {
        protocolOrigin = "";
      }
      protocolSources = new WeakMap();
      nextProtocolSource = 1;
      observingProtocol = true;
      render();
    },
    clearHistory() {
      if (disposed) return;
      history.clear();
      protocol.clear();
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observingProtocol = false;
      listeners.abort();
      view.dispose();
      element.close();
    },
  };
}
