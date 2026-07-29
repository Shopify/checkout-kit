import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useCart} from '../context/Cart';
import useShopify from '../hooks/useShopify';
import {parseCartBootstrapLink, type CartBootstrapLink} from './cartBootstrap';

type UseE2ECartBootstrapOptions = {
  onCartReady: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useE2ECartBootstrap({onCartReady}: UseE2ECartBootstrapOptions) {
  const {seedCart} = useCart();
  const {queries} = useShopify();
  const [fetchProducts] = queries.products;

  return useCallback(
    async (url: string) => {
      let cartBootstrapLink: CartBootstrapLink | null = null;

      try {
        cartBootstrapLink = parseCartBootstrapLink(url);
      } catch (error) {
        Alert.alert('Invalid cart bootstrap link', errorMessage(error));
        return true;
      }

      if (!cartBootstrapLink) {
        return false;
      }

      try {
        let {variantId} = cartBootstrapLink;

        if (!variantId) {
          const {data} = await fetchProducts();
          const product =
            data?.products.edges[cartBootstrapLink.productIndex ?? 0]?.node;

          variantId = product?.variants.edges[0]?.node.id;
        }

        if (!variantId) {
          throw new Error('Cart bootstrap product variant was not found');
        }

        await seedCart(
          variantId,
          cartBootstrapLink.quantity,
          cartBootstrapLink.buyerIdentityMode,
        );
        onCartReady();
      } catch (error) {
        Alert.alert('Cart bootstrap failed', errorMessage(error));
      }

      return true;
    },
    [fetchProducts, onCartReady, seedCart],
  );
}
