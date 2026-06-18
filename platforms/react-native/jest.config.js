module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['modules/@shopify/checkout-kit-react-native/lib'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/sample/node_modules'],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  globals: {
    'ts-jest': {
      tsConfig: {
        importHelpers: true,
      },
    },
  },
};
