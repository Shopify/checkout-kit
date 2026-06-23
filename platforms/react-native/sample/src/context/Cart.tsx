import type {PropsWithChildren} from 'react';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import {Alert} from 'react-native';
import {atom, useAtom} from 'jotai';
import {useShopifyCheckout} from '@shopify/checkout-kit-react-native';
import useShopify from '../hooks/useShopify';
import {useConfig} from './Config';
import {useAuth} from './Auth';
import {BuyerIdentityMode} from '../auth/types';
import {createBuyerIdentityCartInput} from '../utils';

interface Context {
  cartId: string | undefined;
  checkoutURL: string | undefined;
  totalQuantity: number;
  addingToCart: Set<string>;
  clearCart: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  seedCart: (variantId: string, quantity?: number) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
}

const defaultCartId = undefined;
const defaultCheckoutURL = undefined;
const defaultTotalQuantity = 0;

const CartContext = createContext<Context>({
  cartId: defaultCartId,
  checkoutURL: undefined,
  totalQuantity: 0,
  addingToCart: new Set(),
  addToCart: async () => {},
  seedCart: async () => {},
  removeFromCart: async () => {},
  clearCart: () => {},
});

type AddingToCartAction =
  | {type: 'add'; variantId: string}
  | {type: 'remove'; variantId: string};

const checkoutURLState = atom<Context['checkoutURL']>(defaultCheckoutURL);
const cartIdState = atom<Context['cartId']>(defaultCartId);
const totalQuantityState = atom<Context['totalQuantity']>(defaultTotalQuantity);

export const CartProvider: React.FC<PropsWithChildren> = ({children}) => {
  // Reuse the same cart ID for the lifetime of the app
  const [checkoutURL, setCheckoutURL] = useAtom(checkoutURLState);
  // Reuse the same cart ID for the lifetime of the app
  const [cartId, setCartId] = useAtom(cartIdState);
  // Keep track of the number of items in the cart
  const [totalQuantity, setTotalQuantity] = useAtom(totalQuantityState);
  // Maintain a loading state for items being added to the cart
  const addingToCartReducer = (
    state: Set<string>,
    action: AddingToCartAction,
  ): Set<string> => {
    switch (action.type) {
      case 'add':
        return new Set([...state, action.variantId]);
      case 'remove':
        return new Set([...state].filter(id => id !== action.variantId));
      default:
        throw new Error();
    }
  };
  // Maintain a loading state for items being added to the cart
  const defaultSet: Set<string> = new Set();
  const [addingToCart, dispatch] = useReducer(addingToCartReducer, defaultSet);
  const {appConfig} = useConfig();
  const {getValidAccessToken, isAuthenticated} = useAuth();

  const {mutations, queries} = useShopify();
  const [createCart] = mutations.cartCreate;
  const [addLineItems] = mutations.cartLinesAdd;
  const [removeLineItems] = mutations.cartLinesRemove;
  const [fetchCart] = queries.cart;
  const {invalidate} = useShopifyCheckout();

  const clearCart = useCallback(() => {
    invalidate();
    setCartId(defaultCartId);
    setCheckoutURL(undefined);
    setTotalQuantity(0);
  }, [invalidate, setCartId, setCheckoutURL, setTotalQuantity]);

  useEffect(() => {
    clearCart();
  }, [appConfig.buyerIdentityMode, clearCart]);

  useEffect(() => {
    async function getCart() {
      try {
        const {data} = await fetchCart({
          variables: {
            cartId,
          },
        });
        if (data?.cart.totalQuantity) {
          setTotalQuantity(data?.cart.totalQuantity);
        }
      } catch {}
    }

    if (cartId) {
      getCart();
    }
  }, [cartId, fetchCart, setTotalQuantity]);

  const addToCart = useCallback(
    async (variantId: string, quantity = 1, forceNewCart = false) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Cart quantity must be a positive integer');
      }

      let id = forceNewCart ? undefined : cartId;

      dispatch({type: 'add', variantId});

      try {
        if (
          !id &&
          appConfig.buyerIdentityMode === BuyerIdentityMode.CustomerAccount &&
          !isAuthenticated
        ) {
          const signInRequiredMessage =
            'Sign in on the Account tab or change the Buyer Identity setting to add items to your cart.';

          if (forceNewCart) {
            throw new Error(signInRequiredMessage);
          }

          Alert.alert('Sign in required', signInRequiredMessage);
          return;
        }

        invalidate();

        if (!id) {
          let customerAccessToken: string | undefined;
          if (
            appConfig.buyerIdentityMode === BuyerIdentityMode.CustomerAccount
          ) {
            customerAccessToken =
              (await getValidAccessToken()) ?? undefined;
          }
          const cartInput = createBuyerIdentityCartInput(
            appConfig,
            customerAccessToken,
          );
          const cart = await createCart({variables: {input: cartInput}});
          id = cart.data.cartCreate.cart?.id;

          if (!id) {
            throw new Error('Cart creation did not return a cart ID');
          }
        }

        const {data} = await addLineItems({
          variables: {
            cartId: id,
            lines: [{quantity, merchandiseId: variantId}],
          },
        });

        setCartId(id);
        setCheckoutURL(data.cartLinesAdd.cart.checkoutUrl);
        setTotalQuantity(data.cartLinesAdd.cart.totalQuantity);

        fetchCart({
          variables: {
            cartId: id,
          },
        });
      } finally {
        dispatch({type: 'remove', variantId});
      }
    },
    [
      cartId,
      createCart,
      addLineItems,
      invalidate,
      setCartId,
      setCheckoutURL,
      setTotalQuantity,
      appConfig,
      fetchCart,
      getValidAccessToken,
      isAuthenticated,
    ],
  );

  const seedCart = useCallback(
    async (variantId: string, quantity = 1) => {
      await addToCart(variantId, quantity, true);
    },
    [addToCart],
  );

  const removeFromCart = useCallback(
    async (variantId: string) => {
      if (!cartId) {
        return;
      }

      dispatch({type: 'add', variantId});
      invalidate();

      const {data} = await removeLineItems({
        variables: {
          cartId,
          lineIds: [variantId],
        },
      });

      setCheckoutURL(data.cartLinesRemove.cart.checkoutUrl);
      setTotalQuantity(data.cartLinesRemove.cart.totalQuantity);

      if (cartId) {
        await fetchCart({
          variables: {
            cartId,
          },
        });
      }

      dispatch({type: 'remove', variantId});
    },
    [
      cartId,
      removeLineItems,
      invalidate,
      setCheckoutURL,
      setTotalQuantity,
      fetchCart,
    ],
  );

  const value = useMemo(
    () => ({
      cartId,
      checkoutURL,
      addToCart,
      seedCart,
      removeFromCart,
      totalQuantity,
      addingToCart,
      clearCart,
    }),
    [
      cartId,
      checkoutURL,
      addToCart,
      seedCart,
      removeFromCart,
      totalQuantity,
      addingToCart,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => React.useContext(CartContext);
