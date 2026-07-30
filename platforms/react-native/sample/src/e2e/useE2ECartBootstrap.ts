import {useCallback, useMemo, useRef} from 'react';
import {Alert} from 'react-native';
import type {BuyerIdentityMode} from '../auth/types';
import {useCart} from '../context/Cart';
import useShopify from '../hooks/useShopify';
import {E2EController, type E2ECommandTarget} from './controller';

type UseE2ECartBootstrapOptions = {
  onCartReady: () => void;
};

export function useE2ECartBootstrap({onCartReady}: UseE2ECartBootstrapOptions) {
  const {seedCart, clearCart} = useCart();
  const {queries} = useShopify();
  const [fetchProducts] = queries.products;

  const target = useMemo<E2ECommandTarget>(() => {
    let selectedBuyerIdentityMode: BuyerIdentityMode | undefined;

    return {
      async selectBuyerIdentityMode(mode) {
        selectedBuyerIdentityMode = mode;
      },
      async resetCart() {
        clearCart();
      },
      async variantId(productIndex) {
        const {data} = await fetchProducts();
        const product = data?.products.edges[productIndex]?.node;
        const variantId = product?.variants.edges[0]?.node.id;

        if (!variantId) {
          throw new Error(`No product at index ${productIndex}`);
        }

        return variantId;
      },
      async addCartLine(variantId, quantity) {
        await seedCart(variantId, quantity, selectedBuyerIdentityMode);
      },
      async showCart() {
        onCartReady();
      },
      async report(failure) {
        Alert.alert('E2E command failed', failure);
      },
    };
  }, [clearCart, fetchProducts, onCartReady, seedCart]);

  const controllerRef = useRef<E2EController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new E2EController(target);
  }
  controllerRef.current.setTarget(target);

  return useCallback((url: string) => controllerRef.current!.handle(url), []);
}
