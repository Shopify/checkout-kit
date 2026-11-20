const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const policy = require("./bundle-size-budgets.cjs");

const collector = path.join(__dirname, "measure-package-size");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-size-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const write = (name, content) => {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  const web = "platforms/web";
  write(`${web}/npm/package/dist/index.js`, "export default 'npm';\n");
  write(`${web}/npm/package/dist/index.js.map`, "ignored map".repeat(100));
  write(`${web}/npm/package/dist/index.d.ts`, "ignored declarations");
  write(`${web}/cdn/checkout-kit.js`, "export default 'cdn';\n");
  write(`${web}/cdn/assets/shopify-checkout/checkout-hash.js`, "export const checkout = true;\n");
  write(`${web}/cdn/dist/index.js`, "export const nested = true;\n");
  write(`${web}/cdn/assets/shopify-checkout/checkout-hash.js.map`, "ignored CDN map".repeat(100));
  const pnpm = write(
    "bin/pnpm",
    `#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  pack) tar -czf "$3/package.tgz" -C npm package ;;
  build:cdn)
    [[ "\${FAIL_CDN:-false}" != true ]] || exit 1
    rm -rf dist-cdn
    mkdir dist-cdn
    [[ "\${EMPTY_CDN:-false}" == true ]] || cp -R cdn/. dist-cdn/
    ;;
  *) exit 1 ;;
esac
`,
  );
  fs.chmodSync(pnpm, 0o755);
  const env = {
    ...process.env,
    PATH: `${path.dirname(pnpm)}:${process.env.PATH}`,
    PACKAGE_SIZE_REPO_ROOT: directory,
    MEASURE_WEB: "true",
    MEASURE_REACT_NATIVE: "false",
    MEASURE_ANDROID: "false",
  };
  return { directory, write, env };
}

test("collects separate npm and CDN builds, excluding maps and summing per-file gzip", (t) => {
  const { directory, env } = fixture(t);
  const output = path.join(directory, "sizes.tsv");
  execFileSync(collector, ["collect", output], { env });
  const sizes = policy.measurements(fs.readFileSync(output, "utf8"));
  const files = ["checkout-kit.js", "assets/shopify-checkout/checkout-hash.js", "dist/index.js"];
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const fullPath = path.join(directory, "platforms/web/dist-cdn", file);
    const bytes = fs.statSync(fullPath).size;
    raw += bytes;
    const compressed = execFileSync("gzip", ["-n", "-9", "-c", fullPath]).length;
    gzip += compressed;
    assert.equal(sizes[`Web\tCDN JavaScript\t${file}`], bytes);
    assert.equal(sizes[`Web\tCDN JavaScript (gzip)\t${file}`], compressed);
  }
  assert.equal(sizes["Web\tCDN JavaScript"], raw);
  assert.equal(sizes["Web\tCDN JavaScript (gzip)"], gzip);
  assert.equal(sizes["Web\tJavaScript"], Buffer.byteLength("export default 'npm';\n"));
  assert.equal(sizes["Web\tnpm tarball\tdist/index.js"], sizes["Web\tJavaScript"]);
  assert.ok(!Object.keys(sizes).some((key) => key.startsWith("Web\tCDN") && key.endsWith(".map")));
});

test("a failed or empty CDN build fails collection even with stale output", (t) => {
  const { directory, write, env } = fixture(t);
  write("platforms/web/dist-cdn/stale.js", "stale");
  for (const flag of ["FAIL_CDN", "EMPTY_CDN"]) {
    const output = path.join(directory, `${flag}.tsv`);
    const result = spawnSync(collector, ["collect", output], { env: { ...env, [flag]: "true" } });
    assert.notEqual(result.status, 0);
    const sizes = policy.measurements(fs.readFileSync(output, "utf8"));
    assert.ok(sizes["Web\tJavaScript"] > 0);
    assert.equal(sizes["Web\tCDN JavaScript"], undefined);
  }
});

test("npm-only collection explicitly skips the CDN build and stale CDN output", (t) => {
  const { directory, write, env } = fixture(t);
  write("platforms/web/dist-cdn/stale.js", "stale");
  const output = path.join(directory, "npm-only.tsv");
  execFileSync(collector, ["collect", output], {
    env: { ...env, MEASURE_WEB_CDN: "false", FAIL_CDN: "true" },
  });
  const sizes = policy.measurements(fs.readFileSync(output, "utf8"));
  assert.equal(sizes["Web\tJavaScript"], Buffer.byteLength("export default 'npm';\n"));
  assert.ok(sizes["Web\tnpm tarball"] > 0);
  assert.ok(!Object.keys(sizes).some((key) => key.startsWith("Web\tCDN")));
});

test("renders one summary and one disclosure with configured names", (t) => {
  const { directory, write } = fixture(t);
  const base = write(
    "base.tsv",
    "Web\tnpm tarball\t30\tdist/chunks/checkout.js\nWeb\tCDN JavaScript\t50\tdist/chunks/checkout.js\n",
  );
  const head = write(
    "head.tsv",
    "Web\tnpm tarball\t40\tdist/chunks/checkout.js\nWeb\tCDN JavaScript\t60\tdist/chunks/checkout.js\nWeb\tCDN JavaScript\t60\nWeb\tCDN JavaScript (gzip)\t45\n",
  );
  const budgets = write(
    "budgets.json",
    JSON.stringify({
      web: {
        runtime: {
          name: "Checkout | runtime",
          measurement: "package",
          file: "dist/chunks/checkout.js",
          softKiB: 1,
          hardKiB: 2,
        },
        cdnRuntime: {
          name: "CDN runtime",
          measurement: "cdn",
          file: "dist/chunks/checkout.js",
          softKiB: 1,
          hardKiB: 2,
        },
      },
    }),
  );
  const output = path.join(directory, "comment.md");
  execFileSync(collector, ["render", base, head, output, budgets]);
  const body = fs.readFileSync(output, "utf8");
  assert.match(body, /Web package files/);
  assert.match(body, /Web CDN files/);
  assert.match(body, /\| Checkout &#124; runtime \| 0.03 KiB \| 0.04 KiB \| \+10 B \|/);
  assert.match(body, /\| CDN runtime \| 0.05 KiB \| 0.06 KiB \| \+10 B \|/);
  assert.doesNotMatch(body, /dist\/chunks\//);
  assert.match(
    body.replace(/\*\*/g, ""),
    /\| Web \(CDN\) \| 0.06 KiB \(Δ unavailable\) \| 0.04 KiB \(Δ unavailable\) \| — \|/,
  );
  assert.equal((body.match(/<details>/g) ?? []).length, 1);
  assert.equal((body.split("<details>")[0].match(/\| Bundle \/ artifact \|/g) ?? []).length, 1);
});

const componentSummary = (base, head, budgets = {}) =>
  policy
    .render({
      base,
      head,
      budgets,
      measuredPlatforms: ["web"],
    })
    .split("<details>")[0];

test("compares CDN components across changed hashes, including additions and removals", () => {
  const sizes = (rows) =>
    policy.measurements(
      rows
        .map(
          ([file, raw, gzip]) =>
            `Web\tCDN JavaScript\t${raw}\t${file}\nWeb\tCDN JavaScript (gzip)\t${gzip}\t${file}`,
        )
        .join("\n"),
    );
  const base = sizes([
    ["checkout-kit.js", 1024, 512],
    ["assets/shopify-checkout/old-hash.js", 4096, 2048],
    ["assets/removed/old.js", 2048, 1024],
  ]);
  const head = sizes([
    ["checkout-kit.js", 1024, 512],
    ["assets/shopify-checkout/new-hash.js", 4096, 2048],
    ["assets/shopify-checkout/dependency.js", 1024, 512],
    ["assets/shop-pay/new.js", 1024, 512],
    ["other.js", 1024, 512],
  ]);
  const body = componentSummary(base, head);
  assert.match(body, /\| &nbsp;&nbsp;↳ Loader \| 1.00 KiB \| 0.50 KiB \| — \|/);
  assert.match(
    body,
    /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 5.00 KiB \(\+1.00 KiB\) \| 2.50 KiB \(\+0.50 KiB\) \| — \|/,
  );
  assert.match(body, /\| &nbsp;&nbsp;↳ &lt;shop-pay&gt; \| 1.00 KiB \(\+1.00 KiB\) \|/);
  assert.match(body, /\| &nbsp;&nbsp;↳ &lt;removed&gt; \| 0.00 KiB \(-2.00 KiB\) \|/);
  assert.match(body, /\| &nbsp;&nbsp;↳ other.js \| 1.00 KiB \(\+1.00 KiB\) \|/);
  assert.equal(
    body.split("\n").filter((line) => line.startsWith("| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; |")).length,
    1,
  );
  assert.ok(body.indexOf("| &nbsp;&nbsp;↳ Loader |") < body.indexOf("| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; |"));
  assert.doesNotMatch(body, /old-hash|new-hash|dependency.js/);
});

test("missing CDN measurements remain unavailable, including older reports without per-file gzip", () => {
  const head = policy.measurements(
    "Web\tCDN JavaScript\t2048\tassets/shopify-checkout/new.js\nWeb\tCDN JavaScript (gzip)\t1024\tassets/shopify-checkout/new.js",
  );
  assert.match(
    componentSummary({}, head),
    /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 2.00 KiB \(Δ unavailable\) \| 1.00 KiB \(Δ unavailable\) \| — \|/,
  );
  const base = policy.measurements(
    "Web\tCDN JavaScript\t1024\tassets/shopify-checkout/old.js\nWeb\tCDN JavaScript (gzip)\t512",
  );
  assert.match(
    componentSummary(base, head),
    /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 2.00 KiB \(\+1.00 KiB\) \| 1.00 KiB \(Δ unavailable\) \| — \|/,
  );
  assert.match(componentSummary({}, {}), /No configured budgets affected/);
});

test("component table escapes labels and reuses configured CDN file names", () => {
  const head = policy.measurements("Web\tCDN JavaScript\t1024\tassets/<component>|name/hash.js");
  assert.match(componentSummary({}, head), /&lt;component&gt;&#124;name/);
  const budgets = {
    web: {
      component: {
        name: "Friendly | component",
        measurement: "cdn",
        file: "assets/<component>|name/hash.js",
        softKiB: 1,
        hardKiB: 2,
      },
    },
  };
  assert.match(componentSummary({}, head, budgets), /\| &nbsp;&nbsp;↳ &lt;Friendly &#124; component&gt; \|/);
});
