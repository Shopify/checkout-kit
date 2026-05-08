const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const root = path.resolve(__dirname);
const sample = path.resolve(root, 'sample');

/**
 * Metro configuration
 *  https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = mergeConfig(getDefaultConfig(__dirname), {
  projectRoot: sample,

  watchFolders: [root],

  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === '@shopify/checkout-kit-react-native' ||
        moduleName.startsWith('@shopify/checkout-kit-react-native/')
      ) {
        const sub = moduleName.replace('@shopify/checkout-kit-react-native', '');
        const target = path.resolve(
          root,
          'modules',
          '@shopify/checkout-kit-react-native',
          'src',
          sub ? sub.replace(/^\//, '') : 'index.ts',
        );
        return {type: 'sourceFile', filePath: target};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    extraNodeModules: {
      react: path.resolve(sample, 'node_modules', 'react'),
      'react-native': path.resolve(sample, 'node_modules', 'react-native'),
      'react-native-gesture-handler': path.resolve(
        root,
        'node_modules',
        'react-native-gesture-handler',
      ),
      '@shopify/checkout-kit-react-native': path.resolve(
        root,
        'modules',
        '@shopify/checkout-kit-react-native',
      ),
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
