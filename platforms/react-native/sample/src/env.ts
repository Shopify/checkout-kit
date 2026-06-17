import Constants from 'expo-constants';

export type Env = {
  API_VERSION?: string;
  STOREFRONT_VERSION?: string;
  STOREFRONT_DOMAIN?: string;
  STOREFRONT_ACCESS_TOKEN?: string;
  STOREFRONT_MERCHANT_IDENTIFIER?: string;
  CUSTOMER_ACCOUNT_API_SHOP_ID?: string;
  CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  CUSTOMER_ACCOUNT_API_VERSION?: string;
  CUSTOMER_ACCOUNT_API_REDIRECT_URI?: string;
  CUSTOMER_ACCOUNT_API_GRAPHQL_BASE_URL?: string;
  EMAIL?: string;
  PHONE?: string;
  ADDRESS1?: string;
  ADDRESS2?: string;
  ADDRESS_1?: string;
  ADDRESS_2?: string;
  COMPANY?: string;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  CITY?: string;
  PROVINCE?: string;
  COUNTRY?: string;
  ZIP?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Env;

export const env: Env = {
  ...extra,
  STOREFRONT_VERSION: extra.STOREFRONT_VERSION ?? extra.API_VERSION,
};

export default env;
