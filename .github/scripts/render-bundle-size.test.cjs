const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");

function fixture() {
  const head = policy.measurements(
    [
      "Web\tJavaScript\t4096",
      "Web\tJavaScript (gzip)\t2048",
      "Web\tnpm tarball\t8192",
      "Web\tnpm tarball\t1024\tdist/chunks/checkout.js",
      "Web\tCDN JavaScript\t8192",
      "Web\tCDN JavaScript (gzip)\t4096",
      "Web\tCDN JavaScript\t1024\tcheckout-kit.js",
      "Web\tCDN JavaScript (gzip)\t512\tcheckout-kit.js",
      "Web\tCDN JavaScript\t7168\tassets/shopify-checkout/hash.js",
      "Web\tCDN JavaScript (gzip)\t3584\tassets/shopify-checkout/hash.js",
      "React Native\tnpm tarball\t10240",
      "Android\trelease AAR\t12288",
    ].join("\n"),
  );
  return {
    base: { ...head },
    head,
    measuredPlatforms: ["web", "react-native", "android"],
    budgets: {
      web: {
        runtime: { name: "npm JavaScript", measurement: "bundle", softKiB: 5, hardKiB: 6 },
        checkout: {
          name: "Checkout",
          measurement: "package",
          file: "dist/chunks/checkout.js",
          softKiB: 2,
          hardKiB: 3,
        },
        cdn: { name: "CDN total", measurement: "cdn", softKiB: 9, hardKiB: 10 },
      },
      "react-native": { package: { measurement: "package", softKiB: 11, hardKiB: 12 } },
      android: { package: { measurement: "package", softKiB: 13, hardKiB: 14 } },
    },
  };
}

const summary = (body) => body.split("<details>")[0].replace(/\*\*/g, "");

test("combines budgets, compression, and components without duplicate summary tables", () => {
  const body = policy.render(fixture());
  const visible = summary(body);
  const tableRows = body
    .split("<details>")[0]
    .split("\n")
    .filter((line) => line.startsWith("| **"));
  assert.equal(tableRows.length, 5);
  for (const row of tableRows) {
    assert.ok(row.split(" | ").every((cell) => cell.replace(/^\| | \|$/g, "").startsWith("**")));
    assert.ok(row.split(" | ").every((cell) => cell.replace(/^\| | \|$/g, "").endsWith("**")));
  }
  assert.match(body, /\| &nbsp;&nbsp;↳ Loader \| 1.00 KiB \| 0.50 KiB \| — \|/);
  assert.match(visible, /All 5 budgets pass · No size changes/);
  assert.ok(visible.includes("| Bundle / artifact | Raw | Gzip | Budget (soft/hard) |"));
  assert.match(visible, /\| npm JavaScript \| 4.00 KiB \| 2.00 KiB \| 5 KiB \/ 6 KiB \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Checkout \| 1.00 KiB \| — \| 2 KiB \/ 3 KiB \|/);
  assert.match(visible, /\| npm package \| — \| 8.00 KiB \| — \|/);
  assert.match(visible, /\| CDN total \| 8.00 KiB \| 4.00 KiB \| 9 KiB \/ 10 KiB \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Loader \| 1.00 KiB \| 0.50 KiB \| — \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 7.00 KiB \| 3.50 KiB \| — \|/);
  assert.match(visible, /\| React Native package \| — \| 10.00 KiB \| 11 KiB \/ 12 KiB \|/);
  assert.match(visible, /\| Android AAR \| — \| 12.00 KiB \| 13 KiB \/ 14 KiB \|/);
  assert.equal(visible.split("\n").filter((line) => line.startsWith("| ---")).length, 1);
  assert.equal((body.match(/<details>/g) ?? []).length, 1);
  assert.equal((body.match(/<\/details>/g) ?? []).length, 1);
  assert.match(body, /<summary>Measurement details<\/summary>/);
  assert.doesNotMatch(
    visible,
    /Within budget|0 B|dist\/chunks|Base \||Head \||Accept a size increase/,
  );
});

test("nonzero changes and missing comparisons stay visible, including one-byte breaches", () => {
  const report = fixture();
  report.budgets.web.runtime.softKiB = 4;
  report.head["Web\tJavaScript"]++;
  report.head["Web\tJavaScript (gzip)"] -= 512;
  delete report.base["Web\tnpm tarball"];
  delete report.head["Android\trelease AAR"];
  const visible = summary(policy.render(report));
  assert.match(visible, /2 of 5 budgets need attention/);
  assert.match(
    visible,
    /\| ⚠️ npm JavaScript \| 4.00 KiB \(\+1 B\) \| 1.50 KiB \(-0.50 KiB\) \| 4 KiB \/ 6 KiB<br>⚠️ Acceptance required/,
  );
  assert.match(visible, /\| npm package \| — \| 8.00 KiB \(Δ unavailable\)/);
  assert.match(
    visible,
    /\| Android AAR \| — \| unavailable \| 13 KiB \/ 14 KiB<br>⚠️ Measurement missing/,
  );
  assert.match(visible, /\/accept-size web/);
  assert.doesNotMatch(visible, /No size changes/);
});

test("multiple raw and gzip budgets retain independent limits and acceptance history", () => {
  const report = fixture();
  report.budgets.web.runtime.softKiB = 3;
  report.base["Web\tJavaScript"] = 2048;
  report.budgets.web.compressed = {
    name: "Transfer",
    measurement: "bundleGzip",
    softKiB: 1,
    hardKiB: 3,
  };
  report.base["Web\tJavaScript (gzip)"] = 512;
  const { accepted } = policy.accept(
    policy.evaluate(report),
    [{ platform: "web", reason: "Required capability" }],
    "writer",
    {
      id: 42,
      html_url: "https://github.com/example/repo/pull/1#issuecomment-42",
    },
  );
  const state = { version: 1, acceptances: accepted, processedComments: [42] };
  const body = policy.render(report, state);
  const visible = summary(body);
  assert.match(visible, /All 6 budgets pass/);
  assert.equal(
    visible.split("\n").filter((line) => line.startsWith("| ⚠️ npm JavaScript |")).length,
    1,
  );
  assert.match(
    visible,
    /npm JavaScript: 3 KiB \/ 6 KiB<br>✅ Accepted<br>Transfer: gzip 1 KiB \/ 3 KiB<br>✅ Accepted/,
  );
  assert.match(body, /Accepted increases/);
  assert.match(body, /accepted by @writer — Required capability/);
  assert.doesNotMatch(visible, /Accept a size increase/);
  assert.deepEqual(policy.readState(body), state);
});

test("hard breaches and unchanged sizes above limits retain their distinct results", () => {
  const report = fixture();
  report.head["Web\tJavaScript"] = 7 * 1024;
  report.base["Web\tCDN JavaScript"] = report.head["Web\tCDN JavaScript"] = 12 * 1024;
  const visible = summary(policy.render(report));
  assert.match(visible, /1 of 5 budgets need attention/);
  assert.match(visible, /🛑 Budget change required/);
  assert.match(visible, /➖ Above limit; no increase/);
  assert.match(visible, /\| 🛑 npm JavaScript \|/);
  assert.match(visible, /\| 🛑 CDN total \|/);
  assert.match(visible, /Hard limit exceeded/);
  assert.doesNotMatch(visible, /Accept a size increase/);
});

test("an exact CDN file budget folds into a component only when their scopes match", () => {
  const report = fixture();
  const file = "assets/shopify-checkout/hash.js";
  report.budgets.web.component = {
    name: "CDN Checkout",
    measurement: "cdn",
    file,
    softKiB: 8,
    hardKiB: 9,
  };
  let visible = summary(policy.render(report));
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;CDN Checkout&gt; \| 7.00 KiB \| 3.50 KiB \| 8 KiB \/ 9 KiB \|/);
  assert.equal(
    visible.split("\n").filter((line) => line.startsWith("| &nbsp;&nbsp;↳ &lt;CDN Checkout&gt; |")).length,
    1,
  );
  report.head["Web\tCDN JavaScript\tassets/shopify-checkout/new-hash.js"] =
    report.head[`Web\tCDN JavaScript\t${file}`];
  report.head["Web\tCDN JavaScript (gzip)\tassets/shopify-checkout/new-hash.js"] =
    report.head[`Web\tCDN JavaScript (gzip)\t${file}`];
  delete report.head[`Web\tCDN JavaScript\t${file}`];
  delete report.head[`Web\tCDN JavaScript (gzip)\t${file}`];
  visible = summary(policy.render(report));
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 7.00 KiB \| 3.50 KiB \| — \|/);
  assert.match(
    visible,
    /\| &nbsp;&nbsp;↳ CDN Checkout \| unavailable \| — \| 8 KiB \/ 9 KiB<br>⚠️ Measurement missing/,
  );
});

test("unmeasured platforms and empty reports do not invent failing budgets", () => {
  const report = fixture();
  report.measuredPlatforms = [];
  report.base = report.head = {};
  const body = policy.render(report);
  assert.match(body, /No configured budgets affected/);
  assert.doesNotMatch(body, /budgets need attention|No size changes|Measurement missing/);
});

function npmComponentFixture() {
  const report = fixture();
  report.budgets.web.checkout.name = "Universal checkout";
  report.budgets.web.checkout.file = "dist/chunks/shopify-universal-checkout.js";
  const files = {
    "dist/index.js": 216,
    "dist/shopify-checkout.js": 183,
    "dist/chunks/shopify-checkout.js": 7106,
    "dist/shopify-universal-checkout.js": 213,
    "dist/chunks/shopify-universal-checkout.js": 1024,
    "dist/shop-pay.js": 159,
    "dist/chunks/shop-pay.js": 2048,
    "dist/new-component.mjs": 100,
    "dist/chunks/new-component.mjs": 3072,
    "dist/chunks/telemetry.js": 4096,
  };
  for (const snapshot of [report.base, report.head]) {
    delete snapshot["Web\tnpm tarball\tdist/chunks/checkout.js"];
    for (const [file, bytes] of Object.entries(files))
      snapshot[`Web\tnpm tarball\t${file}`] = bytes;
    snapshot["Web\tJavaScript"] = Object.values(files).reduce((sum, bytes) => sum + bytes, 0);
  }
  return report;
}

const npmSummary = (report) => summary(policy.render(report)).split("| npm package |")[0];

test("npm components appear without budgets and preserve custom names without duplicate rows", () => {
  const visible = npmSummary(npmComponentFixture());
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 6.94 KiB \| — \| — \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;Universal checkout&gt; \| 1.00 KiB \| — \| 2 KiB \/ 3 KiB \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shop-pay&gt; \| 2.00 KiB \| — \| — \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;new-component&gt; \| 3.00 KiB \| — \| — \|/);
  const children = visible.split("\n").filter((line) => line.startsWith("| &nbsp;&nbsp;↳"));
  assert.deepEqual(
    children.map((line) => line.split(" | ")[0]),
    [
      "| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt;",
      "| &nbsp;&nbsp;↳ &lt;Universal checkout&gt;",
      "| &nbsp;&nbsp;↳ &lt;shop-pay&gt;",
      "| &nbsp;&nbsp;↳ &lt;new-component&gt;",
      "| &nbsp;&nbsp;↳ Shared runtime",
      "| &nbsp;&nbsp;↳ Entry points",
    ],
  );
  assert.doesNotMatch(visible, /telemetry|dist\//);
});

test("npm components discovered on either revision retain unavailable comparisons", () => {
  const report = npmComponentFixture();
  for (const file of ["dist/shopify-checkout.js", "dist/chunks/shopify-checkout.js"])
    delete report.base[`Web\tnpm tarball\t${file}`];
  for (const file of ["dist/shop-pay.js", "dist/chunks/shop-pay.js"])
    delete report.head[`Web\tnpm tarball\t${file}`];
  const visible = npmSummary(report);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 6.94 KiB \(Δ unavailable\) \| — \| — \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ &lt;shop-pay&gt; \| unavailable \| — \| — \|/);
  report.base = {};
  assert.match(npmSummary(report), /\| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; \| 6.94 KiB \(Δ unavailable\)/);
});

test("a missing budgeted npm component remains one failing row", () => {
  const report = npmComponentFixture();
  delete report.head["Web\tnpm tarball\tdist/chunks/shopify-universal-checkout.js"];
  const visible = npmSummary(report);
  assert.match(visible, /1 of 5 budgets need attention/);
  assert.match(
    visible,
    /\| &nbsp;&nbsp;↳ &lt;Universal checkout&gt; \| unavailable \| — \| 2 KiB \/ 3 KiB<br>⚠️ Measurement missing/,
  );
  assert.equal(
    visible.split("\n").filter((line) => line.startsWith("| &nbsp;&nbsp;↳ &lt;Universal checkout&gt; |"))
      .length,
    1,
  );
});

test("npm supporting rows reconcile with the total and exclude non-runtime files", () => {
  const report = npmComponentFixture();
  for (const snapshot of [report.base, report.head]) {
    snapshot["Web\tnpm tarball\tdist/chunks/telemetry.js.map"] = 100000;
    snapshot["Web\tnpm tarball\tdist/index.d.ts"] = 50000;
    snapshot["Web\tnpm tarball\tscripts/build.js"] = 25000;
  }
  const visible = npmSummary(report);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Shared runtime \| 4.00 KiB \| — \| — \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Entry points \| 0.85 KiB \| — \| — \|/);
  const childKiB = visible
    .split("\n")
    .filter((line) => line.startsWith("| &nbsp;&nbsp;↳"))
    .reduce((sum, line) => sum + Number(line.split(" | ")[1].split(" ")[0]), 0);
  assert.equal(childKiB.toFixed(2), (report.head["Web\tJavaScript"] / 1024).toFixed(2));
});

test("npm supporting groups compare additions and removals without inventing missing data", () => {
  const report = npmComponentFixture();
  report.head["Web\tnpm tarball\tdist/chunks/new-shared.cjs"] = 512;
  report.head["Web\tnpm tarball\tdist/extra-entry.mjs"] = 1024;
  let visible = npmSummary(report);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Shared runtime \| 4.50 KiB \(\+0.50 KiB\)/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Entry points \| 1.85 KiB \(\+1.00 KiB\)/);
  delete report.head["Web\tnpm tarball\tdist/chunks/telemetry.js"];
  delete report.head["Web\tnpm tarball\tdist/chunks/new-shared.cjs"];
  assert.match(npmSummary(report), /\| &nbsp;&nbsp;↳ Shared runtime \| 0.00 KiB \(-4.00 KiB\)/);
  report.head = {};
  visible = npmSummary(report);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Shared runtime \| unavailable \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Entry points \| unavailable \|/);
  report.head = report.base;
  report.base = {};
  assert.match(npmSummary(report), /\| &nbsp;&nbsp;↳ Shared runtime \| 4.00 KiB \(Δ unavailable\)/);
});

test("individually budgeted npm supporting files are counted only in their own rows", () => {
  const report = npmComponentFixture();
  report.budgets.web.shared = {
    name: "Telemetry",
    measurement: "package",
    file: "dist/chunks/telemetry.js",
    softKiB: 4,
    hardKiB: 5,
  };
  report.budgets.web.entry = {
    name: "Package entry",
    measurement: "package",
    file: "dist/index.js",
    softKiB: 1,
    hardKiB: 2,
  };
  const visible = npmSummary(report);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Telemetry \| 4.00 KiB \| — \| 4 KiB \/ 5 KiB \|/);
  assert.doesNotMatch(visible, /Shared runtime/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Package entry \| 0.21 KiB \| — \| 1 KiB \/ 2 KiB \|/);
  assert.match(visible, /\| &nbsp;&nbsp;↳ Entry points \| 0.64 KiB \| — \| — \|/);
});

test("threshold indicators use exact bytes on totals and components", () => {
  for (const [bytes, indicator] of [
    [2048, ""],
    [2049, "⚠️ "],
    [3072, "⚠️ "],
    [3073, "🛑 "],
  ]) {
    const report = fixture();
    report.budgets.web.runtime.softKiB = 2;
    report.budgets.web.runtime.hardKiB = 3;
    report.head["Web\tJavaScript"] = bytes;
    report.head["Web\tnpm tarball\tdist/chunks/checkout.js"] = bytes;
    const body = policy.render(report);
    assert.ok(body.includes(`| **${indicator}npm JavaScript** |`));
    assert.ok(body.includes(`| &nbsp;&nbsp;↳ ${indicator}Checkout |`));
    assert.ok(body.includes("| &nbsp;&nbsp;↳ &lt;shopify-checkout&gt; |")); // Unbudgeted CDN component.
  }
});

test("the strongest threshold indicator wins across raw and gzip budgets", () => {
  const report = fixture();
  report.budgets.web.runtime.softKiB = 3;
  report.budgets.web.compressed = {
    measurement: "bundleGzip",
    softKiB: 1,
    hardKiB: 1.5,
  };
  const visible = summary(policy.render(report));
  assert.match(visible, /\| 🛑 npm JavaScript \|/);
  assert.doesNotMatch(visible, /\| ⚠️ npm JavaScript \|/);
  // Existing, unchanged sizes still pass the policy despite the threshold indicator.
  assert.match(visible, /All 6 budgets pass/);
});
