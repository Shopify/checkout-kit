// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./cdn-release-policy.mjs", import.meta.url));

interface RoutingCase {
  name: string;
  version: string;
  tag: string;
  channel: "stable" | "unstable";
  prefix: string;
}

const routingCases: ReadonlyArray<RoutingCase> = [
  {
    name: "stable release",
    version: "4.1.0",
    tag: "latest",
    channel: "stable",
    prefix: "v4",
  },
  {
    name: "alpha",
    version: "4.0.0-alpha.4",
    tag: "next",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "unflagged beta",
    version: "4.1.0-beta.1",
    tag: "next",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "beta with latest override",
    version: "4.1.0-beta.1",
    tag: "latest",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "stable version on next",
    version: "4.1.0",
    tag: "next",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "stable version on beta",
    version: "4.1.0",
    tag: "beta",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "stable version on experimental",
    version: "4.1.0",
    tag: "experimental",
    channel: "unstable",
    prefix: "v4/unstable",
  },
  {
    name: "stable build metadata",
    version: "4.1.0+build-1",
    tag: "latest",
    channel: "stable",
    prefix: "v4",
  },
  {
    name: "next major prerelease",
    version: "5.0.0-rc.1",
    tag: "next",
    channel: "unstable",
    prefix: "v5/unstable",
  },
  {
    name: "next major stable release",
    version: "5.0.0",
    tag: "latest",
    channel: "stable",
    prefix: "v5",
  },
];

describe("CDN release policy", () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function runPolicy(version: string, tag: string): Promise<string> {
    const fixture = await mkdtemp(join(tmpdir(), "checkout-kit-release-"));
    fixtures.push(fixture);
    await writeFile(join(fixture, "package.json"), JSON.stringify({ version }));
    const output = join(fixture, "github-output");

    execFileSync(process.execPath, [script], {
      cwd: fixture,
      env: { ...process.env, GITHUB_OUTPUT: output, DIST_TAG: tag },
      stdio: "pipe",
    });

    return readFile(output, "utf8");
  }

  it.each(routingCases)(
    "routes $name ($version, tag=$tag) to $prefix",
    async ({ version, tag, channel, prefix }) => {
      await expect(runPolicy(version, tag)).resolves.toBe(`channel=${channel}\nprefix=${prefix}\n`);
    },
  );

  it("rejects versions without a numeric SemVer major", async () => {
    await expect(runPolicy("invalid.0.0", "latest")).rejects.toThrow(/is not valid SemVer/);
  });
});
