// Builds the CDN output for one channel: each component that ships on it, then the loader.
// `node scripts/build-cdn.mjs --list` prints those components as JSON instead.
import { spawnSync } from "node:child_process";

import { cdnComponentsFor, resolveCdnChannel } from "./cdn-components.mjs";

const channel = resolveCdnChannel();
const components = cdnComponentsFor(channel);

if (process.argv.includes("--list")) {
  process.stdout.write(
    `${JSON.stringify({ channel, components: components.map(({ name }) => name) })}\n`,
  );
  process.exit(0);
}

function vite(...args) {
  const result = spawnSync("vite", ["build", "--config", "vite.cdn.config.ts", ...args], {
    stdio: "inherit",
    env: { ...process.env, CHECKOUT_KIT_CDN_CHANNEL: channel },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

process.stdout.write(
  `Building the CDN output for the ${channel} channel: ${components.map(({ name }) => name).join(", ")}
`,
);
// Each component first, so the loader can import their hashed paths. The first one cleans
// dist-cdn/ (see vite.cdn.config.ts).
for (const { name } of components) vite("--mode", name);
vite();
