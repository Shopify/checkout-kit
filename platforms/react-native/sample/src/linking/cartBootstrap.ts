import {BuyerIdentityMode} from '../auth/types';

export const CART_BOOTSTRAP_SCHEME = 'com.shopify.checkoutkit.reactnativedemo:';
const CART_BOOTSTRAP_HOST = 'cart';
export const CART_BOOTSTRAP_ROUTE = `${CART_BOOTSTRAP_SCHEME}//cart`;
const CART_BOOTSTRAP_PARSE_ORIGIN = `https://${CART_BOOTSTRAP_HOST}`;
const CART_BOOTSTRAP_ROOT_PATH = '/';

export type CartBootstrapLink = {
  variantId?: string;
  productIndex?: number;
  quantity: number;
  buyerIdentityMode?: BuyerIdentityMode;
};

function isBuyerIdentityMode(value: string): value is BuyerIdentityMode {
  return Object.values(BuyerIdentityMode).includes(value as BuyerIdentityMode);
}

export function parseCartBootstrapLink(url: string): CartBootstrapLink | null {
  if (!url.startsWith(CART_BOOTSTRAP_SCHEME)) {
    return null;
  }

  if (!url.startsWith(CART_BOOTSTRAP_ROUTE)) {
    throw new Error('Unsupported cart bootstrap path');
  }

  const routeSuffix = url.slice(CART_BOOTSTRAP_ROUTE.length);

  if (
    routeSuffix &&
    !routeSuffix.startsWith('?') &&
    !routeSuffix.startsWith('/')
  ) {
    throw new Error('Unsupported cart bootstrap path');
  }

  let parsedUrl: URL;
  try {
    // React Native's URL host/path parsing only works for http(s) URLs.
    parsedUrl = new URL(`${CART_BOOTSTRAP_PARSE_ORIGIN}${routeSuffix}`);
  } catch {
    throw new Error('Unsupported cart bootstrap path');
  }

  if (
    parsedUrl.hostname !== CART_BOOTSTRAP_HOST ||
    parsedUrl.pathname !== CART_BOOTSTRAP_ROOT_PATH
  ) {
    throw new Error('Unsupported cart bootstrap path');
  }

  if (!parsedUrl.search) {
    throw new Error('Missing variantId or productIndex');
  }

  const searchParams = parsedUrl.searchParams;
  const variantId = searchParams.get('variantId')?.trim();
  const productIndexParam = searchParams.get('productIndex')?.trim();
  const buyerIdentityModeParam = searchParams.get('buyerIdentityMode')?.trim();
  let buyerIdentityMode: BuyerIdentityMode | undefined;

  const quantityParam = searchParams.get('quantity') ?? '1';
  const quantity = Number(quantityParam);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be a positive integer');
  }

  if (searchParams.has('buyerIdentityMode')) {
    if (
      !buyerIdentityModeParam ||
      !isBuyerIdentityMode(buyerIdentityModeParam)
    ) {
      throw new Error(
        'buyerIdentityMode must be guest, hardcoded, or customerAccount',
      );
    }

    buyerIdentityMode = buyerIdentityModeParam;
  }

  if (variantId && productIndexParam) {
    throw new Error('Use variantId or productIndex, not both');
  }

  if (variantId) {
    return {variantId, quantity, buyerIdentityMode};
  }

  if (!productIndexParam) {
    throw new Error('Missing variantId or productIndex');
  }

  const productIndex = Number(productIndexParam);

  if (!Number.isInteger(productIndex) || productIndex < 0) {
    throw new Error('productIndex must be a non-negative integer');
  }

  return {productIndex, quantity, buyerIdentityMode};
}
