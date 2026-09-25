import {Platform} from 'react-native';
import {isSdkLifecycleEventType} from './dispatch-events';
import {parseCheckoutError} from './errors';
import type {CheckoutNativeError} from './errors';
import {decodeCheckout} from './checkout';
import type {PresentCallbacks} from './index.d';

export class LifecycleEventParseError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LifecycleEventParseError';
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, LifecycleEventParseError);
  }
}

interface CreatePresentDispatcherOptions {
  callbacks?: PresentCallbacks;
  requestId?: string;
  handleDefaultGeolocationRequests?: boolean;
  handleDefaultGeolocationRequest?: () => void | Promise<void>;
  respondToGeolocationRequest?: (allow: boolean) => void;
  /** Release the subscription before invoking consumer code, which may present again. */
  onTerminal?: () => void;
}

export function createPresentDispatcher(
  options: CreatePresentDispatcherOptions,
) {
  return {dispatcher: (json: string): void => dispatchEnvelope(json, options)};
}

function dispatchEnvelope(
  json: string,
  options: CreatePresentDispatcherOptions,
): void {
  let envelope: unknown;
  try {
    envelope = JSON.parse(json);
  } catch {
    logParseError('envelope is not valid JSON');
    return;
  }
  if (!isPlainObject(envelope) || typeof envelope.type !== 'string') {
    logParseError('envelope is missing a string `type` discriminator');
    return;
  }
  if (
    options.requestId !== undefined &&
    envelope.requestId !== options.requestId
  )
    return;
  const {type, payload} = envelope;
  if (!isSdkLifecycleEventType(type)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ShopifyCheckoutKit] Ignoring dispatch envelope with unknown type "${type}".`,
    );
    return;
  }
  const {callbacks} = options;
  switch (type) {
    case 'start':
    case 'update':
    case 'complete': {
      let checkout;
      try {
        checkout = decodeCheckout(
          isPlainObject(payload) ? payload.checkout : undefined,
        );
      } catch {
        logParseError(`\`${type}\` envelope checkout is malformed`);
        return;
      }
      const handler = {
        start: callbacks?.onStart,
        update: callbacks?.onUpdate,
        complete: callbacks?.onComplete,
      }[type];
      handler?.({checkout});
      return;
    }
    case 'dismiss':
      options.onTerminal?.();
      callbacks?.onDismiss?.();
      return;
    case 'fail': {
      options.onTerminal?.();
      const error = isPlainObject(payload) ? payload.error : undefined;
      if (
        !isPlainObject(error) ||
        typeof error.message !== 'string' ||
        typeof error.code !== 'string' ||
        ('statusCode' in error && typeof error.statusCode !== 'number')
      ) {
        logParseError('`fail` envelope payload is malformed');
        return;
      }
      callbacks?.onFail?.({
        error: parseCheckoutError(error as unknown as CheckoutNativeError),
      });
      return;
    }
    case 'linkClick':
      if (!isPlainObject(payload) || typeof payload.url !== 'string') {
        logParseError('`linkClick` envelope payload is malformed');
        return;
      }
      callbacks?.onLinkClick?.({url: payload.url});
      return;
    case 'geolocationRequest':
      if (!isPlainObject(payload) || typeof payload.origin !== 'string') {
        logParseError('`geolocationRequest` envelope payload is malformed');
        return;
      }
      if (callbacks?.onGeolocationRequest) {
        callbacks.onGeolocationRequest({
          origin: payload.origin,
          respond: allow => options.respondToGeolocationRequest?.(allow),
        });
      } else if (
        Platform.OS === 'android' &&
        options.handleDefaultGeolocationRequests
      ) {
        options.handleDefaultGeolocationRequest?.();
      }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function logParseError(detail: string): void {
  // Do not log checkout payloads: they can contain buyer information.
  // eslint-disable-next-line no-console
  console.error(
    new LifecycleEventParseError(
      `Failed to handle checkout dispatcher envelope: ${detail}`,
    ),
  );
}
