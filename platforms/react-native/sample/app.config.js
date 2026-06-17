const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (!match) {
        return env;
      }
      const value = (match[2] ?? '').replace(/^['"]|['"]$/g, '');
      env[match[1]] = value;
      return env;
    }, {});
}

const env = {
  ...parseEnvFile(path.join(__dirname, '..', '..', '.env')),
  ...parseEnvFile(path.join(__dirname, '.env')),
  ...process.env,
};

const customerAccountScheme = env.CUSTOMER_ACCOUNT_API_SHOP_ID
  ? `shop.${env.CUSTOMER_ACCOUNT_API_SHOP_ID}.app`
  : undefined;
const storefrontHost = env.STOREFRONT_DOMAIN
  ? env.STOREFRONT_DOMAIN.replace(/^https?:\/\//, '')
  : undefined;
const associatedDomains = [
  storefrontHost ? `applinks:${storefrontHost}` : undefined,
  customerAccountScheme ? `applinks:${customerAccountScheme}` : undefined,
].filter(Boolean);

module.exports = {
  name: 'Checkout Kit React Native Demo',
  slug: 'checkout-kit-react-native-demo',
  version: '0.6.0',
  scheme: ['rn', customerAccountScheme].filter(Boolean),
  orientation: 'portrait',
  icon: './assets/icon.jpg',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  jsEngine: 'hermes',
  ios: {
    bundleIdentifier: 'com.shopify.checkoutkit.reactnativedemo',
    deploymentTarget: '16.6',
    supportsTablet: false,
    associatedDomains,
    infoPlist: {
      CFBundleDisplayName: 'Checkout Kit React Native Demo',
    },
    entitlements: {
      ...(env.STOREFRONT_MERCHANT_IDENTIFIER
        ? {'com.apple.developer.in-app-payments': [env.STOREFRONT_MERCHANT_IDENTIFIER]}
        : {}),
      ...(associatedDomains.length
        ? {'com.apple.developer.associated-domains': associatedDomains}
        : {}),
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [],
    },
  },
  android: {
    package: 'com.shopify.checkoutkit.reactnativedemo',
    minSdkVersion: 24,
    targetSdkVersion: 35,
    adaptiveIcon: {
      foregroundImage: './assets/icon.jpg',
      backgroundColor: '#000000',
    },
    intentFilters: [
      ...(storefrontHost
        ? [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{scheme: 'https', host: storefrontHost}],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ]
        : []),
      ...(customerAccountScheme
        ? [
            {
              action: 'VIEW',
              data: [{scheme: customerAccountScheme, host: 'callback'}],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ]
        : []),
    ],
  },
  extra: {
    API_VERSION: env.API_VERSION,
    STOREFRONT_VERSION: env.STOREFRONT_VERSION ?? env.API_VERSION,
    STOREFRONT_DOMAIN: env.STOREFRONT_DOMAIN,
    STOREFRONT_ACCESS_TOKEN: env.STOREFRONT_ACCESS_TOKEN,
    STOREFRONT_MERCHANT_IDENTIFIER: env.STOREFRONT_MERCHANT_IDENTIFIER,
    CUSTOMER_ACCOUNT_API_SHOP_ID: env.CUSTOMER_ACCOUNT_API_SHOP_ID,
    CUSTOMER_ACCOUNT_API_CLIENT_ID: env.CUSTOMER_ACCOUNT_API_CLIENT_ID,
    CUSTOMER_ACCOUNT_API_VERSION: env.CUSTOMER_ACCOUNT_API_VERSION,
    CUSTOMER_ACCOUNT_API_REDIRECT_URI: env.CUSTOMER_ACCOUNT_API_REDIRECT_URI,
    CUSTOMER_ACCOUNT_API_GRAPHQL_BASE_URL: env.CUSTOMER_ACCOUNT_API_GRAPHQL_BASE_URL,
    EMAIL: env.EMAIL,
    PHONE: env.PHONE,
    ADDRESS1: env.ADDRESS1,
    ADDRESS2: env.ADDRESS2,
    CITY: env.CITY,
    PROVINCE: env.PROVINCE,
    COUNTRY: env.COUNTRY,
    ZIP: env.ZIP,
  },
  plugins: [
    'expo-secure-store',
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        ios: {deploymentTarget: '16.6'},
        android: {minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 35},
      },
    ],
    './plugins/withCheckoutKitSampleNativeConfig',
  ],
};
