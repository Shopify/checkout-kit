// @vitest-environment node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./build-cdn.mjs", import.meta.url));
const manifest = JSON.parse(
  readFileSync(new URL("../cdn-components.json", import.meta.url), "utf8"),
) as Array<{ name: string; channels: string[] }>;

function list(channel?: string) {
  const env = { ...process.env };
  delete env.CHECKOUT_KIT_CDN_CHANNEL;
  if (channel !== undefined) env.CHECKOUT_KIT_CDN_CHANNEL = channel;
  return spawnSync(process.execPath, [script, "--list"], { encoding: "utf8", env });
}

describe("CDN channels", () => {
  it("builds for stable unless the deploy asks for unstable", () => {
    expect(JSON.parse(list().stdout).channel).toBe("stable");
    expect(JSON.parse(list("").stdout).channel).toBe("stable");
    expect(JSON.parse(list("unstable").stdout).channel).toBe("unstable");
  });

  it("refuses an unknown channel", () => {
    const result = list("beta");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      'CHECKOUT_KIT_CDN_CHANNEL must be one of stable, unstable; got "beta"',
    );
  });

  it("builds each channel's components from cdn-components.json, in order", () => {
    for (const channel of ["stable", "unstable"]) {
      expect(JSON.parse(list(channel).stdout).components).toEqual(
        manifest.filter(({ channels }) => channels.includes(channel)).map(({ name }) => name),
      );
    }
  });

  it("puts every stable component on unstable too, so unstable is never behind", () => {
    const stableOnly = manifest
      .filter(({ channels }) => channels.includes("stable") && !channels.includes("unstable"))
      .map(({ name }) => name);
    expect(stableOnly).toEqual([]);
  });

  it("lists the loader's supported components as stable components", () => {
    const loader = readFileSync(new URL("../src/cdn-loader.ts", import.meta.url), "utf8");
    const supported = [
      ...(loader.match(/supportedComponents = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g),
    ].map(([, name]) => name);
    const stable = manifest
      .filter(({ channels }) => channels.includes("stable"))
      .map(({ name }) => name);
    expect(supported).toEqual(stable);
  });
});
