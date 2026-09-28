import {embeddedCheckoutMethods} from '@shopify/checkout-kit-protocol';

import type {TelemetryProtocolMethod} from './types';

// Universal Checkout's full-snapshot update is not in the generated
// single-checkout protocol catalog yet. Keep the additional label bounded.
const universalCheckoutMethods: ReadonlySet<string> = new Set<TelemetryProtocolMethod>(['ec.update']);

export function toProtocolMethod(method: string): TelemetryProtocolMethod {
  return embeddedCheckoutMethods.has(method) || universalCheckoutMethods.has(method)
    ? (method as TelemetryProtocolMethod)
    : 'unknown';
}
