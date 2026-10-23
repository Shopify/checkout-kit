import React, {useCallback, useMemo, useState} from 'react';
import {Platform} from 'react-native';
import type {AcceleratedCheckoutWallet} from '@shopify/checkout-kit-react-native-core/enums';
import type {CheckoutEventHandlers} from '@shopify/checkout-kit-react-native-core/checkout';
import {createPresentDispatcher} from '@shopify/checkout-kit-react-native-core/present-dispatcher';
import RCTAcceleratedCheckoutButtons from '@shopify/checkout-kit-react-native-core/specs/RCTAcceleratedCheckoutButtonsNativeComponent';

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
  | {cartId: string}
  | {variantId: string};

type CartRequestResponse = {
  requestId: string;
  cartId?: string;
  error?: string;
};

export type CartRequest = {
  wallet: AcceleratedCheckoutWallet;
};

interface CommonAcceleratedCheckoutButtonsProps extends CheckoutEventHandlers {
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
   * Called when the render state changes
   * States from SDK: loading, rendered, error
   */
  onRenderStateChange?: (event: RenderStateChangeEvent) => void;

  /**
   * Called when the size of the button changes
   */
  onSizeChange?: (event: {nativeEvent: {height: number}}) => void;
}

interface CartProps {
  /** An existing Storefront cart ID, including its access key. */
  cartId: string;
}

interface BuyNowProps {
  /** The selected Storefront product variant ID. */
  variantId: string;

  /**
   * Creates or resolves the Buy Now cart after the buyer taps a wallet button.
   * Return no ID when the app has already handled the failure; reject to emit
   * an onFail event.
   */
  getCart: (
    request: CartRequest,
  ) => Promise<string | undefined> | string | undefined;
}

export type AcceleratedCheckoutButtonsProps =
  | (CartProps & CommonAcceleratedCheckoutButtonsProps)
  | (BuyNowProps & CommonAcceleratedCheckoutButtonsProps);

/**
 * AcceleratedCheckoutButton provides pre-built payment UI components for Shop Pay and Apple Pay.
 * Checkout starts from an existing Storefront cart or, for Buy Now, asks the app
 * for a cart only after the buyer taps a wallet button.
 *
 * @example
 * <AcceleratedCheckoutButtons cartId="gid://shopify/Cart/123" />
 *
 * @example
 * <AcceleratedCheckoutButtons
 *   variantId="gid://shopify/ProductVariant/456"
 *   getCart={async () => createBuyNowCart()}
 * />
 */

const defaultStyles = {flexGrow: 1};
export const AcceleratedCheckoutButtons: React.FC<
  AcceleratedCheckoutButtonsProps
> = ({
  applePayLabel,
  applePayStyle,
  cornerRadius,
  wallets,
  onFail,
  onDismiss,
  onStart,
  onUpdate,
  onComplete,
  onRenderStateChange,
  onLinkClick,
  linkAction = 'default',
  ...props
}) => {
  const [dynamicHeight, setDynamicHeight] = useState<number | undefined>(
    undefined,
  );
  const [cartRequestResponses, setCartRequestResponses] = useState<
    CartRequestResponse[]
  >([]);

  const handleDismiss = useCallback(() => onDismiss?.(), [onDismiss]);

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

  const {dispatcher} = useMemo(
    () =>
      createPresentDispatcher({
        callbacks: {onStart, onUpdate, onComplete, onFail, onLinkClick},
      }),
    [onStart, onUpdate, onComplete, onFail, onLinkClick],
  );

  const handleDispatch = useCallback(
    (event: {nativeEvent: {value: string}}) => {
      dispatcher(event.nativeEvent.value);
    },
    [dispatcher],
  );

  const handleSizeChange = useCallback(
    (event: {nativeEvent: {height: number}}) => {
      setDynamicHeight(event.nativeEvent.height);
    },
    [],
  );

  const handleCartRequest = useCallback(
    async (event: {nativeEvent: {requestId: string; wallet: string}}) => {
      if (!isBuyNowProps(props)) return;
      const {requestId, wallet} = event.nativeEvent;
      try {
        const cartId = await props.getCart({
          wallet: wallet as AcceleratedCheckoutWallet,
        });
        setCartRequestResponses(responses => [
          ...responses,
          {requestId, cartId},
        ]);
      } catch (error) {
        setCartRequestResponses(responses => [
          ...responses,
          {
            requestId,
            error: error instanceof Error ? error.message : String(error),
          },
        ]);
      }
    },
    [props],
  );

  const checkoutIdentifier: CheckoutIdentifier | undefined = useMemo(() => {
    if (isCartProps(props)) return {cartId: props.cartId};
    if (isBuyNowProps(props)) return {variantId: props.variantId};
    return undefined;
  }, [props]);

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
      'AcceleratedCheckoutButton: `cartId` or `variantId` with `getCart` must be provided',
    );
    if (__DEV__) {
      throw error;
    } else {
      // eslint-disable-next-line no-console
      console.warn(error.message);
      return null;
    }
  }

  return (
    <RCTAcceleratedCheckoutButtons
      testID="accelerated-checkout-buttons"
      applePayLabel={applePayLabel}
      applePayStyle={applePayStyle}
      style={{...defaultStyles, height: dynamicHeight}}
      checkoutIdentifier={checkoutIdentifier}
      cartRequestResponses={cartRequestResponses}
      onCartRequest={handleCartRequest}
      cornerRadius={cornerRadius}
      wallets={wallets}
      onDismiss={handleDismiss}
      linkAction={linkAction}
      onRenderStateChange={handleRenderStateChange}
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
): props is CartProps & CommonAcceleratedCheckoutButtonsProps {
  return 'cartId' in props;
}

function isBuyNowProps(
  props: AcceleratedCheckoutButtonsProps,
): props is BuyNowProps & CommonAcceleratedCheckoutButtonsProps {
  return 'variantId' in props && typeof props.getCart === 'function';
}
