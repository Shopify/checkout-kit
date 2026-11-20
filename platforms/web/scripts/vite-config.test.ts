// @vitest-environment node
import { fileURLToPath } from "node:url";

import { resolveConfig } from "vite";
import { afterEach, expect, it, vi } from "vitest";

import packageJson from "../package.json" with { type: "json" };

const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const TELEMETRY = "import.meta.env.VITE_CK_TELEMETRY";

afterEach(() => {
  vi.unstubAllEnvs();
});

// The script must not set VITE_CK_TELEMETRY itself, or it would overwrite the caller's opt-in.
it("runs pnpm dev as a watch-mode build that leaves VITE_CK_TELEMETRY to the caller", () => {
  expect(packageJson.scripts.dev).toMatch(/--mode watch\b/);
  expect(packageJson.scripts.dev).not.toContain("VITE_CK_TELEMETRY");
});

// `pnpm dev` is an internal build: it logs, unless the person who starts it opts in.
it.each([
  [undefined, "console"],
  ["console", "console"],
  ["staging", "console"],
  ["production", "production"],
])("builds pnpm dev with telemetry mode %s as %s", async (mode, expected) => {
  vi.stubEnv("VITE_CK_TELEMETRY", mode);

  const config = await resolveConfig({ configFile, mode: "watch", logLevel: "silent" }, "build");

  expect(config.define?.[TELEMETRY]).toBe(JSON.stringify(expected));
});

// A release build defines no destination, so the shared rule makes it report.
it("defines no telemetry destination for the release build", async () => {
  vi.stubEnv("VITE_CK_TELEMETRY", "production");

  const config = await resolveConfig({ configFile, logLevel: "silent" }, "build");

  expect(config.define).not.toHaveProperty([TELEMETRY]);
});
