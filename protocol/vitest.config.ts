import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['languages/typescript/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        'languages/typescript/src/generated/**',
      ],
    },
  },
});
