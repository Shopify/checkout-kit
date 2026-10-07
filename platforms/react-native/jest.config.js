module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['modules/@shopify/checkout-kit-react-native/lib'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/sample/node_modules'],
  // Resolve workspace imports without requiring generated lib files.
  moduleNameMapper: {
    '^@shopify/checkout-kit-react-native$':
      '<rootDir>/modules/@shopify/checkout-kit-react-native/src',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'modules/@shopify/checkout-kit-react-native/src/**/*.{ts,tsx}',
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
  globals: {
    'ts-jest': {
      tsConfig: {
        importHelpers: true,
      },
    },
  },
};
