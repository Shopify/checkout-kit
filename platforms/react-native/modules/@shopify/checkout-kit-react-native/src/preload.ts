import RNShopifyCheckoutKit from './specs/NativeShopifyCheckoutKit';
import type {
  CheckoutPreloadSubscription,
  PreloadFailureReason,
  PreloadOptions,
  PreloadState,
} from './index.d';

type NativePreloadStateEvent = {
  requestId: string;
  type: PreloadState['type'];
  reason?: PreloadFailureReason;
  statusCode?: number;
};

const failureReasons = new Set<PreloadFailureReason>([
  'httpError',
  'navigationFailed',
  'keepAliveLost',
  'webContentProcessTerminated',
  'protocolError',
  'unknown',
]);

let activeSubscription: PreloadSubscription | undefined;
let nativeSubscription: {remove: () => void} | undefined;
let requestSequence = 0;

class PreloadSubscription implements CheckoutPreloadSubscription {
  private currentState: PreloadState = {type: 'idle'};
  private onStateChange?: (state: PreloadState) => void;
  private observing = true;

  constructor(
    readonly requestId: string,
    options?: PreloadOptions,
  ) {
    this.onStateChange = options?.onStateChange;
  }

  get state(): PreloadState {
    return this.currentState;
  }

  receive(state: PreloadState): void {
    if (!this.observing) {
      return;
    }

    this.currentState = state;
    this.onStateChange?.(state);

    if (
      state.type === 'idle' ||
      state.type === 'expired' ||
      state.type === 'failed'
    ) {
      this.remove();
    }
  }

  remove(): void {
    if (!this.observing) {
      return;
    }

    this.observing = false;
    this.onStateChange = undefined;

    if (activeSubscription === this) {
      activeSubscription = undefined;
    }
  }
}

function parsePreloadStateEvent(
  json: string,
): NativePreloadStateEvent | undefined {
  try {
    const event: unknown = JSON.parse(json);
    if (!event || typeof event !== 'object') {
      return undefined;
    }

    const {requestId, type, reason, statusCode} = event as Record<
      string,
      unknown
    >;
    if (typeof requestId !== 'string' || typeof type !== 'string') {
      return undefined;
    }

    if (
      type !== 'idle' &&
      type !== 'loading' &&
      type !== 'ready' &&
      type !== 'expired' &&
      type !== 'failed'
    ) {
      return undefined;
    }

    if (type === 'failed') {
      if (
        typeof reason !== 'string' ||
        !failureReasons.has(reason as PreloadFailureReason)
      ) {
        return undefined;
      }

      if (statusCode !== undefined && typeof statusCode !== 'number') {
        return undefined;
      }
    }

    return {
      requestId,
      type,
      reason: reason as PreloadFailureReason | undefined,
      statusCode: statusCode as number | undefined,
    };
  } catch {
    return undefined;
  }
}

function stateFromNativeEvent(event: NativePreloadStateEvent): PreloadState {
  if (event.type === 'failed') {
    return {
      type: 'failed',
      reason: event.reason ?? 'unknown',
      ...(event.statusCode === undefined ? {} : {statusCode: event.statusCode}),
    };
  }

  return {type: event.type};
}

function ensureNativeSubscription(): void {
  if (nativeSubscription) {
    return;
  }

  nativeSubscription = RNShopifyCheckoutKit.onPreloadStateChange(json => {
    const event = parsePreloadStateEvent(json);
    if (!event || event.requestId !== activeSubscription?.requestId) {
      return;
    }

    activeSubscription.receive(stateFromNativeEvent(event));
  });
}

export function preload(
  checkoutUrl: string,
  options?: PreloadOptions,
): CheckoutPreloadSubscription {
  activeSubscription?.remove();
  ensureNativeSubscription();

  requestSequence += 1;
  const requestId = `${Date.now()}-${requestSequence}`;
  const subscription = new PreloadSubscription(requestId, options);
  activeSubscription = subscription;

  RNShopifyCheckoutKit.preload(checkoutUrl, requestId);
  return subscription;
}

/** @internal Test-only reset for module-scoped subscription state. */
export function __resetPreloadForTests(): void {
  activeSubscription?.remove();
  activeSubscription = undefined;
  nativeSubscription?.remove();
  nativeSubscription = undefined;
  requestSequence = 0;
}
