import {embeddedCheckoutMethods} from '@shopify/checkout-kit-protocol';

import type {TelemetryProtocolMethod} from './types';

export function toProtocolMethod(method: string): TelemetryProtocolMethod {
  return embeddedCheckoutMethods.has(method)
    ? (method as TelemetryProtocolMethod)
    : 'unknown';
}
