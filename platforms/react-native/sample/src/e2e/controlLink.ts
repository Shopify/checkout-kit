import {BuyerIdentityMode} from '../auth/types';

export const CONTROL_LINK_HOST = 'e2e';
const SCHEME_SEPARATOR = '://';
const PARSE_ORIGIN_SCHEME = 'https://';
const DECIMAL_DIGITS = /^\d+$/;
const MAX_SIGNED_32_BIT = 2147483647;
const RESET_PARAMETERS: string[] = [];
const CART_PARAMETERS = [
  'variantId',
  'productIndex',
  'quantity',
  'buyerIdentityMode',
];
const SIGN_IN_PARAMETERS: string[] = [];

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

function rejectUnknownParameters(
  command: string,
  parameters: Parameters,
  allowed: string[],
): void {
  const unknown = Array.from(parameters.keys())
    .filter(name => !allowed.includes(name))
    .sort();

  if (unknown.length > 0) {
    throw new Error(`Unknown ${command} parameters: ${unknown.join(', ')}`);
  }
}

function parseNonNegativeInteger(value: string): number | undefined {
  if (!DECIMAL_DIGITS.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  return parsed <= MAX_SIGNED_32_BIT ? parsed : undefined;
}

function parseQuantity(parameters: Parameters): number {
  const parameter = parameters.get('quantity');

  if (parameter === undefined) {
    return 1;
  }

  const quantity = parseNonNegativeInteger(parameter);

  if (quantity === undefined || quantity < 1) {
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

  const productIndex = parseNonNegativeInteger(productIndexParameter);

  if (productIndex === undefined) {
    throw new Error('productIndex must be a non-negative integer');
  }

  return {command: 'cart', productIndex, quantity, buyerIdentityMode};
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
      rejectUnknownParameters('reset', parameters, RESET_PARAMETERS);

      return {command: 'reset'};
    case 'cart':
      rejectUnknownParameters('cart', parameters, CART_PARAMETERS);

      return parseCart(parameters);
    case 'signIn':
      rejectUnknownParameters('signIn', parameters, SIGN_IN_PARAMETERS);

      return {command: 'signIn'};
    default:
      throw new Error('Unsupported e2e command');
  }
}
