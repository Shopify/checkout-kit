import {gql, useLazyQuery, useMutation} from '@apollo/client';
import type {Edges, ShopifyProduct, ShopifyCart} from '../../@types';
import {getLocale} from '../utils';

const moneyFragment = gql`
  fragment Price on MoneyV2 {
    currencyCode
    amount
  }
`;

const productFragment = gql`
  fragment Product on ProductVariant {
    id
    price {
      ...Price
    }
    product {
      title
    }
    image {
      id
      width
      height
      url
      thumbnailUrl: url(transform: {maxWidth: 80, maxHeight: 80})
    }
  }

  ${moneyFragment}
`;

const cartCostFragment = gql`
  fragment Cost on CartCost {
    subtotalAmount {
      ...Price
    }
    totalAmount {
      ...Price
    }
    totalTaxAmount {
      ...Price
    }
  }
`;

const PRODUCTS_QUERY = gql`
  query FetchProducts($country: CountryCode = CA)
  @inContext(country: $country) {
    products(first: 10) {
      edges {
        node {
          id
          title
          description
          variants(first: 1) {
            edges {
              node {
                id
                unitPrice {
                  ...Price
                }
                price {
                  ...Price
                }
              }
            }
          }
          images(first: 1) {
            edges {
              node {
                id
                width
                height
                url
                thumbnailUrl: url(transform: {maxWidth: 150, maxHeight: 150})
              }
            }
          }
        }
      }
    }
  }

  ${moneyFragment}
`;

const CART_QUERY = gql`
  query FetchCart($cartId: ID!, $country: CountryCode = CA)
  @inContext(country: $country) {
    cart(id: $cartId) {
      id
      totalQuantity
      cost {
        ...Cost
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ...Product
            }
            cost {
              totalAmount {
                ...Price
              }
            }
          }
        }
      }
    }
  }

  ${productFragment}
  ${moneyFragment}
  ${cartCostFragment}
`;

const CREATE_CART_MUTATION = gql`
  mutation CreateCart($input: CartInput, $country: CountryCode = CA)
  @inContext(country: $country) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const ADD_TO_CART_MUTATION = gql`
  mutation AddToCart(
    $cartId: ID!
    $lines: [CartLineInput!]!
    $country: CountryCode = CA
  ) @inContext(country: $country) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
      }
    }
  }
`;

const REMOVE_FROM_CART_MUTATION = gql`
  mutation RemoveFromCart(
    $cartId: ID!
    $lineIds: [ID!]!
    $country: CountryCode = CA
  ) @inContext(country: $country) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        checkoutUrl
        totalQuantity
      }
    }
  }
`;

function useShopify() {
  const [, country] = getLocale().split('-');
  const includeCountry = {
    variables: {
      country,
    },
  };
  const products = useLazyQuery<{products: Edges<ShopifyProduct>}>(
    PRODUCTS_QUERY,
    {
      ...includeCountry,
    },
  );
  const cart = useLazyQuery<{cart: ShopifyCart}>(CART_QUERY, {
    fetchPolicy: 'network-only',
    ...includeCountry,
  });
  const cartCreate = useMutation(CREATE_CART_MUTATION, includeCountry);
  const cartLinesAdd = useMutation(ADD_TO_CART_MUTATION, includeCountry);
  const cartLinesRemove = useMutation(
    REMOVE_FROM_CART_MUTATION,
    includeCountry,
  );

  return {
    queries: {
      cart,
      products,
    },
    mutations: {
      cartCreate,
      cartLinesAdd,
      cartLinesRemove,
    },
  };
}

export default useShopify;
