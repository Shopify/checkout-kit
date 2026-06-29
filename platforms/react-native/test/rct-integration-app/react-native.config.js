const path = require('path');

const reactNativeRoot = path.resolve(__dirname, '../..');

module.exports = {
  dependencies: {
    '@shopify/checkout-kit-react-native': {
      root: path.resolve(
        reactNativeRoot,
        'modules',
        '@shopify',
        'checkout-kit-react-native',
      ),
    },
  },
};
