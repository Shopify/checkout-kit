/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Canonical list of SDK lifecycle event types delivered through the
 * per-`present()` dispatcher.
 *
 * The set must be kept in sync with the native equivalents:
 *   - android: `DispatchEventTypes.ALL` (Java)
 *   - ios:     `DispatchEventType.allCases` (Swift)
 *
 * Drift is detected at runtime by `verifyDispatchEventParity`, which is
 * invoked from the `ShopifyCheckout` constructor against the
 * `dispatchEventTypes` array reported by `RNShopifyCheckoutKit.getConstants()`.
 */
export const SDK_LIFECYCLE_EVENT_TYPES = [
  'close',
  'fail',
  'geolocationRequest',
] as const;

export type SdkLifecycleEventType = (typeof SDK_LIFECYCLE_EVENT_TYPES)[number];

const sdkLifecycleEventSet: ReadonlySet<string> = new Set(
  SDK_LIFECYCLE_EVENT_TYPES,
);

export function isSdkLifecycleEventType(
  value: string,
): value is SdkLifecycleEventType {
  return sdkLifecycleEventSet.has(value);
}

/**
 * Thrown when the SDK lifecycle event list reported by the native
 * module does not match the list this JS package was built against.
 *
 * This almost always means the bundled native module is older or newer
 * than the JS package — the host app needs a clean native rebuild.
 */
export class DispatchEventParityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DispatchEventParityError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DispatchEventParityError);
    }
  }
}

let parityVerified = false;

/**
 * Compares the JS-side SDK lifecycle event list against the list the
 * native module reports through `getConstants()`. Throws a
 * `DispatchEventParityError` describing the diff on mismatch — the
 * dispatch contract is unsafe to use otherwise.
 *
 * Set-equality, order-independent. Memoised: runs at most once per JS
 * process. Use `__resetDispatchEventParityForTests` to reset in tests.
 */
export function verifyDispatchEventParity(
  nativeTypes: readonly string[] | undefined | null,
): void {
  if (parityVerified) return;

  if (!Array.isArray(nativeTypes)) {
    throw new DispatchEventParityError(
      buildMessage(
        'native module did not report a `dispatchEventTypes` array in getConstants(). ' +
          'The bundled native module is likely older than this JS package.',
      ),
    );
  }

  const jsSet = new Set<string>(SDK_LIFECYCLE_EVENT_TYPES);
  const nativeSet = new Set<string>(nativeTypes);

  const missingFromJs = [...nativeSet].filter(t => !jsSet.has(t)).sort();
  const missingFromNative = [...jsSet].filter(t => !nativeSet.has(t)).sort();

  if (missingFromJs.length === 0 && missingFromNative.length === 0) {
    parityVerified = true;
    return;
  }

  const lines = [
    `js     = [${[...jsSet].sort().join(', ')}]`,
    `native = [${[...nativeSet].sort().join(', ')}]`,
  ];
  if (missingFromJs.length > 0) {
    lines.push(`events missing from js:     ${missingFromJs.join(', ')}`);
  }
  if (missingFromNative.length > 0) {
    lines.push(`events missing from native: ${missingFromNative.join(', ')}`);
  }

  throw new DispatchEventParityError(buildMessage(lines.join('\n  ')));
}

function buildMessage(detail: string): string {
  return (
    '[ShopifyCheckoutKit] SDK lifecycle event list out of sync between JS ' +
    "and native. Rebuild your host app so the bundled native module matches " +
    "this version of '@shopify/checkout-kit-react-native'.\n  " +
    detail
  );
}

/**
 * Test-only — resets the cached verification flag so unit tests can
 * exercise both success and failure paths in isolation. Not part of
 * the public API.
 */
export function __resetDispatchEventParityForTests(): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.warn('[ShopifyCheckoutKit] Test-only function called in production');
    return;
  }
  parityVerified = false;
}
