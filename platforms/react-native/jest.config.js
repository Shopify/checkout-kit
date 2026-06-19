module.exports = {
  preset: 'jest-expo',
  modulePathIgnorePatterns: ['modules/@shopify/checkout-kit-react-native/lib'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/sample/node_modules'],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
};
