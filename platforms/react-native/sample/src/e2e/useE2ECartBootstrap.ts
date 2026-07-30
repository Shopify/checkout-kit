import {useCallback} from 'react';
import {Alert} from 'react-native';
import {useCart} from '../context/Cart';
import useShopify from '../hooks/useShopify';
import {parseControlLink, type E2EControlLink} from './controlLink';

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
      let controlLink: E2EControlLink | null = null;

      try {
        controlLink = parseControlLink(url);
      } catch (error) {
        Alert.alert('Invalid e2e control link', errorMessage(error));
        return true;
      }

      if (!controlLink) {
        return false;
      }

      if (controlLink.command !== 'cart') {
        Alert.alert('Unsupported e2e command', controlLink.command);
        return true;
      }

      const cartCommand = controlLink;

      try {
        let {variantId} = cartCommand;

        if (!variantId) {
          const {data} = await fetchProducts();
          const product =
            data?.products.edges[cartCommand.productIndex ?? 0]?.node;

          variantId = product?.variants.edges[0]?.node.id;
        }

        if (!variantId) {
          throw new Error('Cart bootstrap product variant was not found');
        }

        await seedCart(
          variantId,
          cartCommand.quantity,
          cartCommand.buyerIdentityMode,
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
