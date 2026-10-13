const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const root = path.resolve(__dirname);
const resolvePackage = name =>
  path.dirname(require.resolve(`${name}/package.json`));
const sample = path.resolve(root, 'sample');
const protocol = path.resolve(
  root,
  '../../protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript',
);

/**
 * Metro configuration
 *  https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = mergeConfig(getDefaultConfig(__dirname), {
  projectRoot: sample,

  watchFolders: [root, protocol],

  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === '@shopify/checkout-kit-react-native' ||
        moduleName.startsWith('@shopify/checkout-kit-react-native/')
      ) {
        const sub = moduleName.replace(
          '@shopify/checkout-kit-react-native',
          '',
        );
        const target = path.resolve(
          root,
          'src',
          sub ? sub.replace(/^\//, '') : 'index.ts',
        );
        return {type: 'sourceFile', filePath: target};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    extraNodeModules: {
      react: resolvePackage('react'),
      'react-native': resolvePackage('react-native'),
      'react-native-gesture-handler': resolvePackage(
        'react-native-gesture-handler',
      ),
      '@shopify/checkout-kit-react-native': root,
      '@shopify/checkout-kit-protocol': protocol,
      '@babel/runtime': resolvePackage('@babel/runtime'),
    },
  },

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
});

module.exports = config;
