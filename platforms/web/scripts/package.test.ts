// Verifies `dist/` and `dist-cdn/` via `pnpm verify` after `pnpm build`.
// See vitest.package.config.ts.
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const distDir = join(packageRoot, "dist");
const cdnDistDir = join(packageRoot, "dist-cdn");

// Native ESM preserves relative imports and uses a fresh registry for each test.
function runWithBrowser(script: string): unknown {
  const happyDomUrl = import.meta.resolve("happy-dom");
  const stdout = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
      import { Window } from ${JSON.stringify(happyDomUrl)};
      const window = new Window();
      globalThis.window = window;
      globalThis.document = window.document;
      globalThis.HTMLElement = window.HTMLElement;
      globalThis.customElements = window.customElements;
      try {
        const result = await (async () => { ${script} })();
        console.log(JSON.stringify(result));
      } finally {
        await window.happyDOM.close();
      }
      `,
    ],
    { stdio: "pipe", encoding: "utf8" },
  );
  return JSON.parse(stdout.trim().split("\n").at(-1) ?? "null");
}

describe("built distributions", () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function createFixture(prefix: string): Promise<string> {
    const fixture = await mkdtemp(join(tmpdir(), prefix));
    fixtures.push(fixture);
    return fixture;
  }

  it.each(["v4", "v4/unstable"])("CDN loader resolves its own chunks from %s", async (prefix) => {
    const fixture = await createFixture("checkout-kit-cdn-");
    await writeFile(join(fixture, "package.json"), JSON.stringify({ type: "module" }));
    const channelDir = join(fixture, prefix);
    await mkdir(channelDir, { recursive: true });
    await cp(join(cdnDistDir, "web-components.js"), join(channelDir, "web-components.js"));
    await cp(join(cdnDistDir, "assets"), join(channelDir, "assets"), { recursive: true });

    // Only this channel's artifacts are present, so imports into the npm
    // output or another CDN channel would fail.
    const loaderUrl = pathToFileURL(join(channelDir, "web-components.js")).href;
    const result = runWithBrowser(`
      const { loadComponents, version } = await import(${JSON.stringify(loaderUrl)});
      const registeredBefore = customElements.get("shopify-checkout") !== undefined;
      await loadComponents(["shopify-checkout"]);
      await loadComponents(["shopify-checkout"]);
      const open = typeof customElements.get("shopify-checkout")?.prototype.open;
      return { version, registeredBefore, open };
    `);
    expect(result).toEqual({
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      registeredBefore: false,
      open: "function",
    });
  });

  async function distributionUrls() {
    const fixture = await createFixture("checkout-kit-distributions-");
    await writeFile(join(fixture, "package.json"), JSON.stringify({ type: "module" }));
    await cp(distDir, join(fixture, "npm"), { recursive: true });
    await cp(cdnDistDir, join(fixture, "cdn"), { recursive: true });
    return {
      npm: (entry: string) => pathToFileURL(join(fixture, "npm", entry)).href,
      cdn: pathToFileURL(join(fixture, "cdn/web-components.js")).href,
    };
  }

  it.each(["npm", "cdn"])(
    "keeps the first registration when the npm component entry and CDN loader both load (%s first)",
    async (first) => {
      const urls = await distributionUrls();
      const result = runWithBrowser(`
        const loads = {
          npm: () => import(${JSON.stringify(urls.npm("shopify-checkout.js"))}),
          cdn: async () => {
            const { loadComponents } = await import(${JSON.stringify(urls.cdn)});
            await loadComponents(["shopify-checkout"]);
          },
        };
        await loads[${JSON.stringify(first)}]();
        const registered = customElements.get("shopify-checkout");
        await loads[${JSON.stringify(first === "npm" ? "cdn" : "npm")}]();
        return {
          sameConstructor: registered !== undefined && registered === customElements.get("shopify-checkout"),
          open: typeof document.createElement("shopify-checkout").open,
        };
      `);

      expect(result).toEqual({ sameConstructor: true, open: "function" });
    },
  );

  it.each(["npm", "cdn"])(
    "leaves registration to the CDN loader when the npm root loads alongside it (%s first)",
    async (first) => {
      const urls = await distributionUrls();
      const result = runWithBrowser(`
        const loads = {
          npm: () => import(${JSON.stringify(urls.npm("index.js"))}),
          cdn: async () => {
            const { loadComponents } = await import(${JSON.stringify(urls.cdn)});
            await loadComponents(["shopify-checkout"]);
          },
        };
        await loads[${JSON.stringify(first)}]();
        const afterFirst = customElements.get("shopify-checkout") !== undefined;
        await loads[${JSON.stringify(first === "npm" ? "cdn" : "npm")}]();
        return {
          afterFirst,
          open: typeof document.createElement("shopify-checkout").open,
        };
      `);

      // The root registers nothing, so only the CDN loader defines the element.
      expect(result).toEqual({ afterFirst: first === "cdn", open: "function" });
    },
  );
});
