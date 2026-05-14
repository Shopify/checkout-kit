import {defineConfig, devices} from "@playwright/test";

const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Only `*.spec.ts` so vitest unit tests under `src/` are never picked up.
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  // Fail CI if a `.only` is left in.
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: process.env["CI"]
    ? [["github"], ["html", {open: "never"}]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    // Start with chromium only. Add `firefox` and `webkit` here when
    // cross-browser coverage becomes a real concern.
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
    },
  ],
  webServer: {
    // Use the vite dev server on a dedicated port so it can run alongside
    // a regular `pnpm sample` session on :5173 without conflict. `--no-open`
    // suppresses the auto-open behavior set in sample/vite.config.ts.
    command: `vite --config sample/vite.config.ts --port ${PORT} --strictPort --no-open`,
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
