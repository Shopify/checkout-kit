import {defineConfig} from 'vitest/config';

// Verifies dist/ and dist-cdn/. Kept out of the default vitest config
// so `pnpm test` does not depend on a prior build; `pnpm verify` runs it.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/*package.test.ts'],
    testTimeout: 60_000,
  },
});
