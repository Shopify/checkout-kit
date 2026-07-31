import {BuyerIdentityMode} from '../auth/types';

const CONTROL_LINK_HOST = 'e2e';
const SCHEME_SEPARATOR = '://';
const PARSE_ORIGIN_SCHEME = 'https://';

export type E2EResetCommand = {
  command: 'reset';
};

export type E2ECartCommand = {
  command: 'cart';
  variantId?: string;
  productIndex?: number;
  quantity: number;
  buyerIdentityMode?: BuyerIdentityMode;
};

export type E2ESignInCommand = {
  command: 'signIn';
};

export type E2EControlLink =
  | E2EResetCommand
  | E2ECartCommand
  | E2ESignInCommand;

type Parameters = Map<string, string>;

function isBuyerIdentityMode(value: string): value is BuyerIdentityMode {
  return Object.values(BuyerIdentityMode).includes(value as BuyerIdentityMode);
}

function parameterMap(searchParams: URLSearchParams): Parameters {
  const parameters: Parameters = new Map();

  searchParams.forEach((value, name) => {
    parameters.set(name, value.trim());
  });

  return parameters;
}

function parseQuantity(parameters: Parameters): number {
  const parameter = parameters.get('quantity');

  if (parameter === undefined) {
    return 1;
  }

  const quantity = Number(parameter);

  if (parameter === '' || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be a positive integer');
  }

  return quantity;
}

function parseBuyerIdentityMode(
  parameters: Parameters,
): BuyerIdentityMode | undefined {
  const parameter = parameters.get('buyerIdentityMode');

  if (parameter === undefined) {
    return undefined;
  }

  if (!isBuyerIdentityMode(parameter)) {
    throw new Error(
      'buyerIdentityMode must be guest, hardcoded, or customerAccount',
    );
  }

  return parameter;
}

function parseCart(parameters: Parameters): E2ECartCommand {
  if (parameters.size === 0) {
    throw new Error('Missing variantId or productIndex');
  }

  const quantity = parseQuantity(parameters);
  const buyerIdentityMode = parseBuyerIdentityMode(parameters);
  const variantId = parameters.get('variantId');
  const productIndexParameter = parameters.get('productIndex');

  if (variantId !== undefined && productIndexParameter !== undefined) {
    throw new Error('Use variantId or productIndex, not both');
  }

  if (variantId !== undefined) {
    if (variantId === '') {
      throw new Error('variantId must not be blank');
    }

    return {command: 'cart', variantId, quantity, buyerIdentityMode};
  }

  if (productIndexParameter === undefined) {
    throw new Error('Missing variantId or productIndex');
  }

  const productIndex = Number(productIndexParameter);

  if (
    productIndexParameter === '' ||
    !Number.isInteger(productIndex) ||
    productIndex < 0
  ) {
    throw new Error('productIndex must be a non-negative integer');
  }

  return {command: 'cart', productIndex, quantity, buyerIdentityMode};
}

function parseSignIn(parameters: Parameters): E2ESignInCommand {
  if (parameters.size > 0) {
    throw new Error('signIn takes no parameters');
  }

  return {command: 'signIn'};
}

export function parseControlLink(url: string): E2EControlLink | null {
  const separatorIndex = url.indexOf(SCHEME_SEPARATOR);

  if (separatorIndex < 0) {
    return null;
  }

  const authorityAndPath = url.slice(separatorIndex + SCHEME_SEPARATOR.length);
  let parsedUrl: URL;

  try {
    // React Native's URL host and path parsing only works for http(s) URLs.
    parsedUrl = new URL(`${PARSE_ORIGIN_SCHEME}${authorityAndPath}`);
  } catch {
    return null;
  }

  if (parsedUrl.hostname !== CONTROL_LINK_HOST) {
    return null;
  }

  const parameters = parameterMap(parsedUrl.searchParams);

  switch (parsedUrl.pathname.replace(/^\/+|\/+$/g, '')) {
    case 'reset':
      if (parameters.size > 0) {
        throw new Error('reset takes no parameters');
      }

      return {command: 'reset'};
    case 'cart':
      return parseCart(parameters);
    case 'signIn':
      return parseSignIn(parameters);
    default:
      throw new Error('Unsupported e2e command');
  }
}
