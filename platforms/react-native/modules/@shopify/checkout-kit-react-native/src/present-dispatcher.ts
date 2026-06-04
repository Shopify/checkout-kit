import {Platform} from 'react-native';
import {
  isSdkLifecycleEventType,
  type SdkLifecycleEventType,
} from './dispatch-events';
import {parseCheckoutError} from './errors';
import type {CheckoutNativeError} from './errors';
import {formatLogPrefix} from './logging';
import {decodeProtocolPayload} from './protocol';
import type {CheckoutProtocolPayloads, ProtocolHandlers} from './protocol';
import type {GeolocationRequestEvent, PresentCallbacks} from './index.d';

export class LifecycleEventParseError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LifecycleEventParseError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LifecycleEventParseError);
    }
  }
}

export interface PresentDispatchResult {
  terminal: boolean;
}

type PresentDispatcher = (envelopeJson: string) => PresentDispatchResult;

interface CreatePresentDispatcherOptions {
  callbacks?: PresentCallbacks;
  protocol?: ProtocolHandlers;
  handleDefaultGeolocationRequests: boolean;
  handleDefaultGeolocationRequest: () => void | Promise<void>;
  respondToGeolocationRequest: (allow: boolean) => void;
}

interface PresentDispatcherHandle {
  dispatcher: PresentDispatcher | null;
  subscribedMethods: string[];
}

type GeolocationRequestPayload = Pick<GeolocationRequestEvent, 'origin'>;

export function createPresentDispatcher({
  callbacks,
  protocol,
  handleDefaultGeolocationRequests,
  handleDefaultGeolocationRequest,
  respondToGeolocationRequest,
}: CreatePresentDispatcherOptions): PresentDispatcherHandle {
  const subscribedMethods = getSubscribedProtocolMethods(protocol);
  const needsDefaultGeolocation =
    Platform.OS === 'android' && handleDefaultGeolocationRequests;

  if (!callbacks && !needsDefaultGeolocation && subscribedMethods.length === 0) {
    return {dispatcher: null, subscribedMethods};
  }

  return {
    subscribedMethods,
    dispatcher: envelopeJson =>
      dispatchEnvelope(envelopeJson, {
        callbacks,
        protocol,
        needsDefaultGeolocation,
        handleDefaultGeolocationRequest,
        respondToGeolocationRequest,
      }),
  };
}

function getSubscribedProtocolMethods(protocol?: ProtocolHandlers): string[] {
  return Object.entries(protocol ?? {})
    .filter(([, handler]) => typeof handler === 'function')
    .map(([method]) => method);
}

function dispatchEnvelope(
  envelopeJson: string,
  options: Omit<
    CreatePresentDispatcherOptions,
    'handleDefaultGeolocationRequests'
  > & {needsDefaultGeolocation: boolean},
): PresentDispatchResult {
  let envelope: unknown;
  try {
    envelope = JSON.parse(envelopeJson);
  } catch {
    logParseError('envelope is not valid JSON', envelopeJson);
    return {terminal: false};
  }

  if (!isPlainObject(envelope) || typeof envelope.type !== 'string') {
    logParseError(
      'envelope is missing a string `type` discriminator',
      envelopeJson,
    );
    return {terminal: false};
  }

  const {type, payload} = envelope;

  if (isSdkLifecycleEventType(type)) {
    return routeSdkLifecycleEvent(type, payload, envelopeJson, options);
  }

  // Protocol method names (e.g. `ec.start`) live one layer down — owned
  // by `@shopify/checkout-kit-protocol`. Accept any string that has
  // a registered handler, but validate the payload shape minimally
  // before forwarding.
  const protocolHandler =
    options.protocol == null
      ? undefined
      : (
          options.protocol as Record<
            string,
            ((payload: unknown) => void) | undefined
          >
        )[type];

  if (protocolHandler) {
    if (!isPlainObject(payload)) {
      logParseError(
        `protocol envelope "${type}" payload is not an object`,
        envelopeJson,
      );
      return {terminal: false};
    }

    let decodedPayload:
      | CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads]
      | undefined;
    try {
      decodedPayload = decodeProtocolPayload(type, payload);
    } catch (error) {
      logParseError(
        `protocol envelope "${type}" payload failed schema conversion: ${String(error)}`,
        envelopeJson,
      );
      return {terminal: false};
    }

    if (decodedPayload == null) {
      logParseError(
        `protocol envelope "${type}" has no registered decoder`,
        envelopeJson,
      );
      return {terminal: false};
    }

    protocolHandler(decodedPayload);
    return {terminal: false};
  }

  // Loud default. The parity check at construction time should have
  // already caught an SDK-lifecycle mismatch — hitting this branch
  // means either the native module emitted an event the JS layer
  // does not know how to handle, or no protocol handler was
  // registered for it.
  // eslint-disable-next-line no-console
  console.warn(
    `${formatLogPrefix('checkout_kit')} Ignoring dispatch envelope with unknown type "${type}". ` +
      'Either the native module emitted an event the JS layer does not know how ' +
      'to handle, or no protocol handler was registered for it. Confirm both sides ' +
      'are on compatible versions.',
  );

  return {terminal: false};
}

/**
 * Routes a validated SDK lifecycle envelope to the matching user
 * callback (or the default Android geolocation handler). Payload
 * shapes are validated per case before invoking consumer code so a
 * native-side regression surfaces as a `LifecycleEventParseError`
 * with the offending raw envelope attached.
 */
function routeSdkLifecycleEvent(
  type: SdkLifecycleEventType,
  payload: unknown,
  envelopeJson: string,
  {
    callbacks,
    needsDefaultGeolocation,
    handleDefaultGeolocationRequest,
    respondToGeolocationRequest,
  }: Omit<CreatePresentDispatcherOptions, 'handleDefaultGeolocationRequests'> & {
    needsDefaultGeolocation: boolean;
  },
): PresentDispatchResult {
  switch (type) {
    case 'close':
      callbacks?.onClose?.();
      return {terminal: true};
    case 'fail': {
      const failPayload = validateFailPayload(payload);
      if (failPayload == null) {
        logParseError('`fail` envelope payload is malformed', envelopeJson);
        return {terminal: true};
      }
      callbacks?.onFail?.(parseCheckoutError(failPayload));
      return {terminal: true};
    }
    case 'geolocationRequest': {
      const geoPayload = validateGeolocationRequestPayload(payload);
      if (geoPayload == null) {
        logParseError(
          '`geolocationRequest` envelope payload is malformed',
          envelopeJson,
        );
        return {terminal: false};
      }
      if (callbacks?.onGeolocationRequest) {
        callbacks.onGeolocationRequest({
          ...geoPayload,
          respond: allow => respondToGeolocationRequest(allow),
        });
      } else if (needsDefaultGeolocation) {
        handleDefaultGeolocationRequest();
      }
      return {terminal: false};
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow validator for `fail` envelope payloads. Only confirms the
 * shape the JS dispatcher relies on — full coercion happens later in
 * `parseCheckoutError`. Returns `null` on shape mismatch so the caller
 * can log a `LifecycleEventParseError` instead of crashing user code.
 */
function validateFailPayload(payload: unknown): CheckoutNativeError | null {
  if (!isPlainObject(payload)) return null;
  if (typeof payload.__typename !== 'string') return null;
  if (typeof payload.message !== 'string') return null;
  if (typeof payload.code !== 'string') return null;
  if ('statusCode' in payload && typeof payload.statusCode !== 'number') {
    return null;
  }
  return payload as unknown as CheckoutNativeError;
}

function validateGeolocationRequestPayload(
  payload: unknown,
): GeolocationRequestPayload | null {
  if (!isPlainObject(payload)) return null;
  if (typeof payload.origin !== 'string') return null;
  return {origin: payload.origin};
}

function logParseError(detail: string, raw: string): void {
  const err = new LifecycleEventParseError(
    `${formatLogPrefix('checkout_kit')} Failed to handle present() dispatcher envelope: ${detail}`,
    {cause: detail},
  );
  // eslint-disable-next-line no-console
  console.error(err, raw);
}
