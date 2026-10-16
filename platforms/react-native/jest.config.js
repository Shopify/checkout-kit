module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['<rootDir>/lib/'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/sample/node_modules'],
  moduleNameMapper: {
    '^@shopify/checkout-kit-react-native$': '<rootDir>/src',
    '^@shopify/checkout-kit-react-native-checkout$':
      '<rootDir>/components/shopify-checkout/src/index.ts',
    '^@shopify/checkout-kit-react-native-checkout/context$':
      '<rootDir>/components/shopify-checkout/src/context.tsx',
    '^@shopify/checkout-kit-react-native-accelerated$':
      '<rootDir>/components/shopify-accelerated-checkouts/src/index.tsx',
    '^@shopify/checkout-kit-react-native-core/(.*)$':
      '<rootDir>/internal/core/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'components/**/src/**/*.{ts,tsx}',
    'internal/**/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85,
    },
  },
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
};
