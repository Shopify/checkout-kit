module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['modules/@shopify/checkout-kit-react-native/lib'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/sample/node_modules'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@noble/hashes)/)',
  ],
};
