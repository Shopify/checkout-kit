import React, {useCallback, useMemo, useState} from 'react';
import {Platform, UIManager} from 'react-native';
import type {AcceleratedCheckoutWallet, CheckoutException} from '..';
import {parseCheckoutError, type CheckoutNativeError} from '../errors';
import {
  CheckoutProtocol,
  decodeProtocolPayload,
  type CheckoutProtocolPayloads,
  type ProtocolHandlers,
} from '../protocol';
import RCTAcceleratedCheckoutButtons from '../specs/RCTAcceleratedCheckoutButtonsNativeComponent';

export enum RenderState {
  Loading = 'loading',
  Rendered = 'rendered',
  Error = 'error',
}

export type RenderStateChangeEvent =
  | {state: RenderState.Error; reason?: string}
  | {state: Omit<RenderState, 'Error'>};

export enum ApplePayLabel {
  addMoney = 'addMoney',
  book = 'book',
  buy = 'buy',
  checkout = 'checkout',
  continue = 'continue',
  contribute = 'contribute',
  donate = 'donate',
  inStore = 'inStore',
  order = 'order',
  plain = 'plain',
  reload = 'reload',
  rent = 'rent',
  setUp = 'setUp',
  subscribe = 'subscribe',
  support = 'support',
  tip = 'tip',
  topUp = 'topUp',
}

export enum ApplePayStyle {
  automatic = 'automatic',
  black = 'black',
  white = 'white',
  whiteOutline = 'whiteOutline',
}

type CheckoutIdentifier =
  | {
      cartId: string;
    }
  | {
      variantId: string;
      quantity: number;
    };

interface CommonAcceleratedCheckoutButtonsProps {
  /**
   * Corner radius for the button (defaults to 8)
   */
  cornerRadius?: number;

  /**
   * Wallets to display in the button
   * Defaults to both shopPay and applePay if not specified
   */
  wallets?: AcceleratedCheckoutWallet[];

  /**
   * Label for the Apple Pay button
   */
  applePayLabel?: ApplePayLabel;

  /**
   * Style for the Apple Pay button color
   * Defaults to 'automatic' which adapts to the current appearance (light/dark mode)
   */
  applePayStyle?: ApplePayStyle;

  /**
   * Called when checkout fails
   */
  onFail?: (error: CheckoutException) => void;

  /**
   * Called when checkout is cancelled
   */
  onCancel?: () => void;

  /**
   * Called when the render state changes
   * States from SDK: loading, rendered, error
   */
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;

  /**
   * Checkout Protocol event handlers scoped to this button instance.
   *
   * Supports all public Checkout Protocol notification events.
   */
  events?: ProtocolHandlers;

  /**
   * Called when a link is clicked within the checkout
   */
  onClickLink?: (url: string) => void;

  /**
   * Called when the size of the button changes
   */
  onSizeChange?: (event: {nativeEvent: {height: number}}) => void;
}

interface CartProps {
  /**
   * The cart ID for cart-based checkout
   */
  cartId: string;
}

interface VariantProps {
  /**
   * The variant ID for product-based checkout
   */
  variantId: string;

  /**
   * The quantity for product-based checkout
   */
  quantity: number;
}

export type AcceleratedCheckoutButtonsProps = (CartProps | VariantProps) &
  CommonAcceleratedCheckoutButtonsProps;

/**
 * AcceleratedCheckoutButton provides pre-built payment UI components for Shop Pay and Apple Pay.
 * It enables faster checkout with fewer steps and supports both cart and product page checkout.
 *
 * @example Cart-based checkout
 * <AcceleratedCheckoutButtons
 *   cartId="gid://shopify/Cart/123"
 *   onFail={(error) => console.error('Checkout failed:', error.message)}
 * />
 *
 * @example Product-based checkout
 * <AcceleratedCheckoutButtons
 *   variantId="gid://shopify/ProductVariant/456"
 *   quantity={1}
 * />
 */

const defaultStyles = {flex: 1};
const nativeComponentName = 'RCTAcceleratedCheckoutButtons';
const protocolEventTypesConstant = 'checkoutProtocolEventTypes';
const checkoutProtocolEventTypeValues = Object.values(CheckoutProtocol);
const checkoutProtocolEventTypes: ReadonlySet<string> = new Set(
  checkoutProtocolEventTypeValues,
);
let verifiedProtocolEventParitySignature: string | undefined;

export const AcceleratedCheckoutButtons: React.FC<
  AcceleratedCheckoutButtonsProps
> = ({
  applePayLabel,
  applePayStyle,
  cornerRadius,
  wallets,
  onFail,
  onCancel,
  onRenderStateChange,
  onClickLink,
  events,
  ...props
}) => {
  const isCart = isCartProps(props);
  const isVariant = isVariantProps(props);
  const [dynamicHeight, setDynamicHeight] = useState<number | undefined>(
    undefined,
  );

  const handleFail = useCallback(
    (event: {nativeEvent: unknown}) => {
      onFail?.(parseCheckoutError(event.nativeEvent as CheckoutNativeError));
    },
    [onFail],
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const handleRenderStateChange = useCallback(
    (event: {nativeEvent: unknown}) => {
      const nativeEvent = event.nativeEvent as {
        state: string;
        reason?: string | undefined;
      };
      const state = validRenderState(nativeEvent.state);
      const reason = nativeEvent.reason;

      if (state === RenderState.Error) {
        onRenderStateChange?.({state, reason});
      } else {
        onRenderStateChange?.({state});
      }
    },
    [onRenderStateChange],
  );

  const handleClickLink = useCallback(
    (event: {nativeEvent: unknown}) => {
      const nativeEvent = event.nativeEvent as {url?: string};
      if (nativeEvent?.url) {
        onClickLink?.(nativeEvent.url);
      }
    },
    [onClickLink],
  );

  const handleDispatch = useCallback(
    (event: {nativeEvent: unknown}) => {
      const nativeEvent = event.nativeEvent as {value?: unknown};
      if (typeof nativeEvent?.value !== 'string') {
        logDispatchError('dispatch event is missing a string `value`');
        return;
      }

      routeProtocolDispatchEnvelope(nativeEvent.value, events);
    },
    [events],
  );

  const handleSizeChange = useCallback(
    (event: {nativeEvent: {height: number}}) => {
      setDynamicHeight(event.nativeEvent.height);
    },
    [],
  );

  const checkoutIdentifier: CheckoutIdentifier | undefined = useMemo(() => {
    switch (true) {
      case isCart:
        return {cartId: props.cartId};
      case isVariant:
        return {variantId: props.variantId, quantity: props.quantity};
      default:
        return undefined;
    }
  }, [isCart, isVariant, props]);

  // Only render on iOS for now since ShopifyAcceleratedCheckouts is iOS-only
  if (Platform.OS !== 'ios' || parseInt(Platform.Version, 10) < 16) {
    return null;
  }

  if (!checkoutIdentifier) {
    /**
     * @todo
     *
     * The ShopifyAcceleratedCheckouts module will handle this error by returning an empty view over the bridge
     * to the javascript client.
     *
     * The onRenderStateChange event will be invoked with both an error state and a reason to indicate the error, at
     * which point this error handling can be removed.
     *
     */

    const error = new Error(
      'AcceleratedCheckoutButton: Either `cartId` or `variantId` and `quantity` must be provided',
    );
    if (__DEV__) {
      throw error;
    } else {
      // eslint-disable-next-line no-console
      console.warn(error.message);
      return null;
    }
  }

  verifyProtocolEventParity();

  return (
    <RCTAcceleratedCheckoutButtons
      testID="accelerated-checkout-buttons"
      applePayLabel={applePayLabel}
      applePayStyle={applePayStyle}
      style={{...defaultStyles, height: dynamicHeight}}
      checkoutIdentifier={checkoutIdentifier}
      cornerRadius={cornerRadius}
      wallets={wallets}
      onFail={handleFail}
      onCancel={handleCancel}
      onRenderStateChange={handleRenderStateChange}
      onClickLink={handleClickLink}
      onDispatch={handleDispatch}
      onSizeChange={handleSizeChange}
    />
  );
};

export default AcceleratedCheckoutButtons;

function validRenderState(state: string): RenderState {
  switch (state) {
    case RenderState.Loading:
      return RenderState.Loading;
    case RenderState.Rendered:
      return RenderState.Rendered;
    case RenderState.Error:
      return RenderState.Error;
    default:
      // eslint-disable-next-line no-console
      console.error(
        `[ShopifyAcceleratedCheckouts] Invalid render state: ${state}`,
      );
      return RenderState.Error;
  }
}

function isCartProps(
  props: AcceleratedCheckoutButtonsProps,
): props is CartProps {
  return 'cartId' in props;
}

function isVariantProps(
  props: AcceleratedCheckoutButtonsProps,
): props is VariantProps {
  return 'variantId' in props && 'quantity' in props && props.quantity > 0;
}

function verifyProtocolEventParity(): void {
  const nativeTypes = getNativeProtocolEventTypes();
  const signature = buildProtocolEventParitySignature(nativeTypes);
  if (verifiedProtocolEventParitySignature === signature) return;

  verifiedProtocolEventParitySignature = signature;

  if (!Array.isArray(nativeTypes)) {
    logProtocolEventParityWarning(
      `native view manager did not report a \`${protocolEventTypesConstant}\` array. ` +
        'The bundled native component is likely older than this JS package.',
    );
    return;
  }

  const jsSet = new Set<string>(checkoutProtocolEventTypeValues);
  const nativeSet = new Set<string>(nativeTypes);

  const missingFromJs = [...nativeSet].filter(t => !jsSet.has(t)).sort();
  const missingFromNative = [...jsSet].filter(t => !nativeSet.has(t)).sort();

  if (missingFromJs.length === 0 && missingFromNative.length === 0) {
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

  logProtocolEventParityWarning(lines.join('\n  '));
}

function buildProtocolEventParitySignature(
  nativeTypes: readonly string[] | undefined | null,
): string {
  return JSON.stringify({
    js: [...checkoutProtocolEventTypeValues].sort(),
    native: Array.isArray(nativeTypes) ? [...nativeTypes].sort() : nativeTypes,
  });
}

function getNativeProtocolEventTypes(): readonly string[] | undefined | null {
  const viewManagerConfig = UIManager.getViewManagerConfig?.(
    nativeComponentName,
  ) as
    | {
        Constants?: Record<string, unknown>;
      }
    | undefined;

  return viewManagerConfig?.Constants?.[protocolEventTypesConstant] as
    | readonly string[]
    | undefined
    | null;
}

function routeProtocolDispatchEnvelope(
  envelopeJson: string,
  events: ProtocolHandlers | undefined,
): void {
  let envelope: unknown;
  try {
    envelope = JSON.parse(envelopeJson);
  } catch {
    logDispatchError('dispatch envelope is not valid JSON', envelopeJson);
    return;
  }

  if (!isPlainObject(envelope) || typeof envelope.type !== 'string') {
    logDispatchError(
      'dispatch envelope is missing a string `type` discriminator',
      envelopeJson,
    );
    return;
  }

  if (!checkoutProtocolEventTypes.has(envelope.type)) {
    logUnknownDispatchType(envelope.type);
    return;
  }

  const handler = (
    events as
      | Record<string, ((payload: unknown) => void) | undefined>
      | undefined
  )?.[envelope.type];

  if (handler == null) {
    return;
  }

  if (!isPlainObject(envelope.payload)) {
    logDispatchError(
      `protocol envelope "${envelope.type}" payload is not an object`,
      envelopeJson,
    );
    return;
  }

  let decodedPayload:
    | CheckoutProtocolPayloads[keyof CheckoutProtocolPayloads]
    | undefined;
  try {
    decodedPayload = decodeProtocolPayload(envelope.type, envelope.payload);
  } catch (error) {
    logDispatchError(
      `protocol envelope "${envelope.type}" payload failed schema conversion: ${String(error)}`,
      envelopeJson,
    );
    return;
  }

  if (decodedPayload == null) {
    logDispatchError(
      `protocol envelope "${envelope.type}" has no registered decoder`,
      envelopeJson,
    );
    return;
  }

  handler(decodedPayload);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function logUnknownDispatchType(type: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    `[ShopifyAcceleratedCheckouts] Ignoring protocol dispatch envelope with unknown type "${type}". ` +
      'Native emitted a Checkout Protocol event this JS package does not know how to handle. ' +
      'Confirm native and JS package versions are compatible.',
  );
}

function logProtocolEventParityWarning(detail: string): void {
  // eslint-disable-next-line no-console
  console.warn(
    '[ShopifyAcceleratedCheckouts] Checkout Protocol event list out of sync between JS ' +
      'and native. Rebuild your host app so the bundled native component matches ' +
      `this version of '@shopify/checkout-kit-react-native'.\n  ${detail}`,
  );
}

function logDispatchError(detail: string, raw?: string): void {
  const message = `[ShopifyAcceleratedCheckouts] Failed to handle protocol dispatch: ${detail}`;
  if (raw == null) {
    // eslint-disable-next-line no-console
    console.error(message);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(message, raw);
}
