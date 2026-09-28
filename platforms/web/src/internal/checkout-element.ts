/* eslint ssr-friendly/no-dom-globals-in-module-scope: off */

import {
  windowOpenRejected,
  windowOpenSuccess,
  type WindowOpenRequest,
  type WindowOpenResult,
} from "@shopify/checkout-kit-protocol";

import stylesText from "../checkout.css?inline";
import type { CheckoutTarget, MessageRejectedDetail } from "../checkout.types";
import type { Logger } from "../logger";
import { createTemplate, html, safe } from "../utils";

export const DEFAULT_POPUP_WIDTH = 600;
export const DEFAULT_POPUP_HEIGHT = 600;
export const SHOP_APP_ORIGIN = "https://shop.app";
export const WINDOW_OPEN_INVALID_URL_WARNING =
  "ec.window.open_request received without a valid url";

const SHOP_APP_ORIGIN_PATTERNS = [SHOP_APP_ORIGIN, "https://*.shop.app"];
const WILDCARD_ORIGIN_PATTERN = /^(https?):\/\/\*\.([^/:]+)(?::(\d+))?\/?$/i;

const SHADOW_TEMPLATE = createTemplate(html`
  <div id="shopify-element-wrapper">
    <style>
      ${safe(stylesText)}
    </style>

    <div class="Shopify-target">
      <dialog class="overlay" id="overlay">
        <div class="overlay-background" part="overlay" id="overlay-background">
          <slot name="overlay">
            <div class="overlay-content-wrapper">
              <div class="overlay-content">
                Continue your purchase in the <br />
                <button class="overlay-focus-button" id="overlay-link" type="button">
                  checkout window
                </button>
              </div>
              <button class="overlay-close-button" id="overlay-close-button">
                Close
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path
                    d="M15.1 2.3L13.7.9 8 6.6 2.3.9.9 2.3 6.6 8 .9 13.7l1.4 1.4L8 9.4l5.7 5.7 1.4-1.4L9.4 8"
                  />
                </svg>
              </button>
            </div>
          </slot>
        </div>
      </dialog>
    </div>
  </div>
`);

export interface CheckoutPresentation {
  readonly checkoutWindow: WindowProxy | null;
  /** True only while this particular presentation is still open. */
  isActive(): boolean;
  close(): void;
  focus(): void;
}

interface OpenCheckoutPresentationOptions {
  readonly element: HTMLElement;
  readonly src: string;
  readonly target: CheckoutTarget | string;
  readonly onUnsafeTarget: (target: string) => void;
  readonly onClose: () => void;
}

export function attachCheckoutShadow(element: HTMLElement): void {
  element.attachShadow({ mode: "open" }).appendChild(SHADOW_TEMPLATE.content.cloneNode(true));
}

export function checkoutSourceURL(source: string): URL | undefined {
  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function setCheckoutAttribute(
  element: HTMLElement,
  name: string,
  value: string | boolean | undefined,
): void {
  if (value === true) {
    element.setAttribute(name, "");
  } else if (value != null && value !== false) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
}

export function checkoutAllowedOrigins(element: HTMLElement): string[] {
  const attribute = element.getAttribute("allowed-origins");
  return attribute ? attribute.split(/[\s,]+/).filter(Boolean) : [];
}

export function openCheckoutPresentation({
  element,
  src,
  target,
  onUnsafeTarget,
  onClose,
}: OpenCheckoutPresentationOptions): CheckoutPresentation {
  let checkoutWindow: WindowProxy | null;

  switch (target) {
    case "popup":
      checkoutWindow = window.open(src, "", getPopupFeatures(element));
      break;
    case "auto":
    case "_blank":
    default:
      if (target === "_self" || target === "_parent" || target === "_top") {
        onUnsafeTarget(target);
        checkoutWindow = window.open(src, "auto");
      } else {
        checkoutWindow = window.open(src, target);
      }
      break;
  }

  const abortController = new AbortController();
  const dialog = element.shadowRoot?.querySelector<HTMLDialogElement>("#overlay");
  const dialogBackground = element.shadowRoot?.querySelector<HTMLDivElement>("#overlay-background");
  const dialogCloseButton =
    element.shadowRoot?.querySelector<HTMLButtonElement>("#overlay-close-button");
  const dialogButton = element.shadowRoot?.querySelector<HTMLButtonElement>("#overlay-link");

  if (dialog && dialogBackground) {
    const isElementHidden = window.getComputedStyle(element).getPropertyValue("display") === "none";
    const isOverlayHidden =
      window.getComputedStyle(dialogBackground).getPropertyValue("display") === "none";

    if (!isElementHidden && !isOverlayHidden) {
      dialog.showModal();

      dialogCloseButton?.addEventListener("click", () => dialog.close(), {
        signal: abortController.signal,
      });
      dialog.addEventListener(
        "close",
        () => {
          // close events are queued; a previous presentation can close this
          // dialog and then reopen it before its close event is dispatched.
          if (!dialog.open) abortController.abort();
        },
        { signal: abortController.signal },
      );
      dialogButton?.addEventListener(
        "click",
        (event: MouseEvent) => {
          event.preventDefault();
          checkoutWindow?.focus();
        },
        { signal: abortController.signal },
      );
      abortController.signal.addEventListener("abort", () => dialog.close());
    }
  }

  abortController.signal.addEventListener("abort", () => {
    checkoutWindow?.close();
    onClose();
  });

  window.addEventListener(
    "focus",
    () => {
      const timer = setTimeout(() => {
        if (checkoutWindow?.closed) {
          abortController.abort();
        }
      }, 50);
      abortController.signal.addEventListener("abort", () => clearTimeout(timer));
    },
    { signal: abortController.signal },
  );

  return {
    checkoutWindow,
    isActive: () => !abortController.signal.aborted,
    close: () => abortController.abort(),
    focus: () => checkoutWindow?.focus(),
  };
}

export function applyCheckoutTargetClass(element: HTMLElement, target: string): void {
  if (!target || /\s/.test(target)) return;
  element.shadowRoot
    ?.querySelector<HTMLDivElement>(".Shopify-target")
    ?.classList.add(`Shopify-target--${target}`);
}

export function removeCheckoutTargetClass(element: HTMLElement, target: string | null): void {
  if (!target || /\s/.test(target)) return;
  element.shadowRoot
    ?.querySelector<HTMLDivElement>(".Shopify-target")
    ?.classList.remove(`Shopify-target--${target}`);
}

/** A blocked popup has no sender and must never authenticate a null source. */
export function isCheckoutMessageFromPresentation(
  event: MessageEvent,
  presentation: CheckoutPresentation | undefined,
): presentation is CheckoutPresentation {
  return (
    presentation !== undefined &&
    presentation.isActive() &&
    presentation.checkoutWindow !== null &&
    event.source === presentation.checkoutWindow
  );
}

export function validateCheckoutMessageOrigin(
  event: MessageEvent,
  src: URL | undefined,
  configuredOrigins: readonly string[],
  warn: (message: string) => void,
): void {
  if (!src) {
    throw new Error("Dropped message because src is invalid or unset");
  }

  let origin: URL;
  try {
    origin = new URL(event.origin);
  } catch {
    throw new Error(`Dropped message from non-HTTPS origin "${event.origin}"`);
  }

  if (origin.protocol !== "https:") {
    throw new Error(`Dropped message from non-HTTPS origin "${event.origin}"`);
  }

  const configured = configuredOrigins.includes("*") ? null : configuredOrigins;
  if (configured === null) return;

  const patterns = [src.origin, ...SHOP_APP_ORIGIN_PATTERNS];
  for (const entry of configured) {
    if (isValidOriginPattern(entry)) {
      patterns.push(entry);
    } else {
      warn(`Ignoring invalid allowed origin "${entry}"`);
    }
  }

  if (!patterns.some((pattern) => originMatchesPattern(pattern, origin))) {
    throw new Error(`Dropped message from origin "${origin.origin}" not in allowlist`);
  }
}

export function rejectCheckoutMessage(
  element: { onMessageRejected?: (detail: MessageRejectedDetail) => void },
  event: MessageEvent,
  error: unknown,
  logger: Logger,
): void {
  const reason = error instanceof Error ? error.message : String(error);
  if (element.onMessageRejected) {
    try {
      element.onMessageRejected({ origin: event.origin, data: event.data, reason });
    } catch (callbackError) {
      logger.error(
        "onMessageRejected callback threw",
        callbackError instanceof Error ? callbackError.message : String(callbackError),
      );
    }
    return;
  }
  logger.warn(reason);
}

/**
 * Handles an `ec.window.open_request` delegation: opens a validated `https:`
 * URL in a new tab and returns a UCP result for the negotiated `version`.
 * Invalid or non-`https:` URLs are rejected (and warned about) rather than opened.
 */
export function handleWindowOpenRequest(
  request: WindowOpenRequest,
  version: string,
  logger: Logger,
): WindowOpenResult {
  let targetUrl: URL;
  try {
    targetUrl = new URL(request.url);
  } catch {
    logger.warn(WINDOW_OPEN_INVALID_URL_WARNING);
    return windowOpenRejected("url is not a valid URL", version);
  }

  if (targetUrl.protocol !== "https:") {
    logger.warn(WINDOW_OPEN_INVALID_URL_WARNING);
    return windowOpenRejected("url must use https scheme", version);
  }

  window.open(targetUrl.href, "_blank", "noopener");
  return windowOpenSuccess(version);
}

function getPopupFeatures(element: HTMLElement): string {
  const computedStyle = window.getComputedStyle(element);
  const widthFromCustomProperty = computedStyle.getPropertyValue("--shopify-checkout-dialog-width");
  const desiredWidth = widthFromCustomProperty
    ? Number.parseInt(widthFromCustomProperty, 10)
    : DEFAULT_POPUP_WIDTH;
  const screenLeft = window.screenLeft ?? window.screenX;
  const windowWidth = window.outerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const width = Math.min(desiredWidth, Math.floor(windowWidth * 0.9));

  const heightFromCustomProperty = computedStyle.getPropertyValue(
    "--shopify-checkout-dialog-height",
  );
  const desiredHeight = heightFromCustomProperty
    ? Number.parseInt(heightFromCustomProperty, 10)
    : DEFAULT_POPUP_HEIGHT;
  const screenTop = window.screenTop ?? window.screenY;
  const windowHeight = window.outerHeight ?? document.documentElement.clientHeight ?? screen.height;
  const height = Math.min(desiredHeight, Math.floor(windowHeight * 0.9));
  const left = Math.floor((windowWidth - width) / 2) + screenLeft;
  const top = Math.floor((windowHeight - height) / 2) + screenTop;

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "status=no",
    "toolbar=no",
    "resizable=yes",
  ].join(",");
}

function isValidOriginPattern(pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.includes("*")) return WILDCARD_ORIGIN_PATTERN.test(pattern);
  try {
    const url = new URL(pattern);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

function originMatchesPattern(pattern: string, origin: URL): boolean {
  if (pattern === "*") return true;

  if (!pattern.includes("*")) {
    try {
      return isValidOriginPattern(pattern) && new URL(pattern).origin === origin.origin;
    } catch {
      return false;
    }
  }

  const match = WILDCARD_ORIGIN_PATTERN.exec(pattern);
  if (!match) return false;
  const [, scheme, suffix, port] = match;
  if (scheme === undefined || suffix === undefined) return false;

  if (`${scheme.toLowerCase()}:` !== origin.protocol) return false;
  if (normalizedOriginPort(scheme.toLowerCase(), port) !== origin.port) return false;

  const host = origin.hostname.toLowerCase();
  const suffixHost = suffix.toLowerCase();
  return host !== suffixHost && host.endsWith(`.${suffixHost}`);
}

function normalizedOriginPort(protocol: string, port: string | undefined): string {
  if (port === undefined) return "";
  if ((protocol === "http" && port === "80") || (protocol === "https" && port === "443")) {
    return "";
  }
  return port;
}
