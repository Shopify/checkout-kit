const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const root = path.resolve(__dirname);
const sample = path.resolve(root, 'sample');
const protocol = path.resolve(root, '../../protocol/languages/typescript');
const config = getDefaultConfig(sample);

config.watchFolders = [root, protocol];
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(sample, 'node_modules', 'react'),
  'react-native': path.resolve(sample, 'node_modules', 'react-native'),
  '@shopify/checkout-kit-react-native': path.resolve(
    root,
    'modules',
    '@shopify/checkout-kit-react-native',
  ),
  '@shopify/checkout-kit-protocol': protocol,
  '@babel/runtime': path.resolve(root, 'node_modules', '@babel/runtime'),
};
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
