import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['languages/typescript/test/**/*.ts'],
  languageOptions: {
    parser: tseslint.parser,
  },
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ChainExpression',
        message:
          'Use a non-null assertion (!.) instead of optional chaining (?.) in tests so a missing value fails the test loudly.',
      },
    ],
  },
});
