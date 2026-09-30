import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.WEB_E2E_PORT ?? 4321);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node server.mjs",
    url: baseURL,
    // Always start our own server so a stale build or another process cannot
    // accidentally satisfy the readiness check.
    reuseExistingServer: false,
    env: { WEB_E2E_PORT: String(port) },
  },
});
