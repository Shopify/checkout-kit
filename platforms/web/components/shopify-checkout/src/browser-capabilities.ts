export type UnsupportedBrowserCapability =
  | "shadow_dom"
  | "native_dialog"
  | "abortable_event_listeners";

/** Returns capabilities Checkout Kit requires but the current browser does not provide. */
export function getUnsupportedBrowserCapabilities(): UnsupportedBrowserCapability[] {
  const unsupported: UnsupportedBrowserCapability[] = [];

  if (!supportsShadowDOM()) unsupported.push("shadow_dom");
  if (!supportsNativeDialog()) unsupported.push("native_dialog");
  if (!supportsAbortableEventListeners()) unsupported.push("abortable_event_listeners");

  return unsupported;
}

/** Whether custom elements can attach a shadow root. */
export function supportsShadowDOM(): boolean {
  return typeof HTMLElement.prototype.attachShadow === "function";
}

function supportsNativeDialog(): boolean {
  return (
    typeof HTMLDialogElement !== "undefined" &&
    typeof HTMLDialogElement.prototype.showModal === "function"
  );
}

function supportsAbortableEventListeners(): boolean {
  if (typeof AbortController === "undefined") return false;

  const controller = new AbortController();
  const target = document.createElement("div");
  let listenerCalled = false;

  try {
    target.addEventListener(
      "checkout-kit-capability-test",
      () => {
        listenerCalled = true;
      },
      { signal: controller.signal },
    );
    controller.abort();
    target.dispatchEvent(new Event("checkout-kit-capability-test"));
    return !listenerCalled;
  } catch {
    return false;
  }
}
