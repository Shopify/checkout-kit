module.exports = {
  root: true,
  extends: '@react-native',
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/require-await': 'error',
    'no-console': 'error',
  },
};
