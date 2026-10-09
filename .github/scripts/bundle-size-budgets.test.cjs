const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");

const KiB = 1024;
const report = (size, base = 34 * KiB) => ({
  budgets: { web: { javascript: { measurement: "bundle", softKiB: 35, hardKiB: 50 } } },
  base: base === null ? {} : { "Web\tJavaScript": base },
  head: { "Web\tJavaScript": size },
  measuredPlatforms: ["web"],
});
const comment = { id: 42, html_url: "https://github.com/example/repo/pull/1#issuecomment-42" };

test("enforces exact limits, exempts no growth, and handles missing measurements", () => {
  for (const [size, base, status] of [
    [35 * KiB, 34 * KiB, "within"],
    [35 * KiB + 1, 34 * KiB, "soft"],
    [50 * KiB, 34 * KiB, "soft"],
    [50 * KiB + 1, 34 * KiB, "hard"],
    [60 * KiB, 60 * KiB, "no-growth"],
    [59 * KiB, 60 * KiB, "no-growth"],
    [40 * KiB, null, "soft"],
    [undefined, 34 * KiB, "missing"],
    [0, 34 * KiB, "missing"],
  ]) {
    assert.equal(policy.evaluate(report(size, base))[0].status, status, `${base} → ${size}`);
  }
  const input = report(35.5 * KiB);
  input.budgets.web.javascript.softKiB = 35.5;
  assert.equal(policy.evaluate(input)[0].status, "within");
  input.head["Web\tJavaScript"]++;
  assert.equal(policy.evaluate(input)[0].status, "soft");
  input.measuredPlatforms = [];
  assert.equal(policy.conclusion(policy.evaluate(input)), "success");
});

test("platform acceptance covers each current breach, with independent caps", () => {
  const input = report(40 * KiB);
  input.budgets.web.javascriptGzip = {
    measurement: "bundleGzip",
    softKiB: 10,
    hardKiB: 15,
  };
  input.head["Web\tJavaScript (gzip)"] = 11 * KiB;
  input.budgets.android = { aar: { measurement: "package", softKiB: 100, hardKiB: 200 } };
  input.head["Android\trelease AAR"] = 150 * KiB;
  input.measuredPlatforms.push("android");
  const { accepted } = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "New capability" }],
    "writer",
    comment,
  );
  assert.deepEqual(
    policy.evaluate(input, accepted).map((row) => row.status),
    ["accepted", "accepted", "soft"],
  );
  assert.equal(policy.conclusion(policy.evaluate(input, accepted)), "failure");
  const all = policy.accept(
    policy.evaluate(input, accepted),
    [{ platform: "android", reason: "Native support" }],
    "writer",
    comment,
    accepted,
  ).accepted;
  assert.equal(policy.conclusion(policy.evaluate(input, all)), "success");
  for (const [size, status] of [
    [39 * KiB, "accepted"],
    [40 * KiB, "accepted"],
    [40 * KiB + 1, "soft"],
  ]) {
    assert.equal(policy.evaluate(report(size), all)[0].status, status);
  }
  input.budgets.web.npmTarball = { measurement: "package", softKiB: 100, hardKiB: 200 };
  input.head["Web\tnpm tarball"] = 120 * KiB;
  assert.equal(
    policy.evaluate(input, all).find((row) => row.metric === "npmTarball").status,
    "soft",
  );
});

test("comments and existing acceptances cannot override a hard budget", () => {
  const input = report(51 * KiB);
  const result = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "Please override" }],
    "writer",
    comment,
  );
  assert.deepEqual(result.accepted, {});
  assert.equal(
    policy.evaluate(input, {
      "web.javascript": { bytes: 60 * KiB, measurement: "bundle" },
    })[0].status,
    "hard",
  );
});

test("selects whole packages or individual files without reusing acceptance for another scope", () => {
  const input = report(40000);
  Object.assign(
    input.head,
    policy.measurements(
      "Web\tnpm tarball\t90000\nWeb\tnpm tarball\t40000\tdist/index.js\nWeb\tnpm tarball\t39999\tdist/other.js\n",
    ),
  );
  const budget = input.budgets.web.javascript;
  budget.measurement = "package";
  assert.equal(policy.evaluate(input)[0].after, 90000);
  budget.file = "dist/index.js";
  assert.equal(policy.evaluate(input)[0].after, 40000);
  const { accepted } = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "New capability" }],
    "writer",
    comment,
  );
  assert.equal(policy.evaluate(input, accepted)[0].status, "accepted");
  budget.file = "dist/other.js";
  assert.equal(policy.evaluate(input, accepted)[0].status, "soft");
  budget.file = "dist/missing.js";
  assert.equal(policy.evaluate(input, accepted)[0].status, "missing");
  input.head["Web\tnpm tarball\tdist/missing.js"] = 0;
  assert.equal(policy.evaluate(input, accepted)[0].status, "within");
  delete budget.file;
  budget.measurement = "bundle";
  assert.equal(policy.evaluate(input, accepted)[0].status, "soft");
});

test("rejects unknown configuration keys and invalid limits", () => {
  for (const budgets of [
    { ios: {} },
    { web: { javascript: { softKiB: 35, hardKiB: 50 } } },
    { web: { typo: { measurement: "unknown", softKiB: 1, hardKiB: 2 } } },
    { web: { javascript: { measurement: "bundle", soft: 35, hard: 50 } } },
    { web: { javascript: { measurement: "bundle", softKiB: "35", hardKiB: 50 } } },
    { web: { javascript: { measurement: "bundle", softKiB: 51, hardKiB: 50 } } },
    { web: { javascript: { measurement: "bundle", softKiB: 0, hardKiB: 50 } } },
    ...["", "/index.js", "../index.js", "dist/*.js", "dist\\index.js", 42].map((file) => ({
      web: { entry: { measurement: "package", file, softKiB: 35, hardKiB: 50 } },
    })),
    {
      web: {
        entry: {
          measurement: "bundle",
          file: "dist/index.js",
          softKiB: 35,
          hardKiB: 50,
        },
      },
    },
  ])
    assert.throws(() => policy.validateBudgets(budgets));
});

test("measurement parsing keeps package and file sizes separate and rejects invalid rows", () => {
  assert.deepEqual(
    policy.measurements("Web\tJavaScript\t34073\nWeb\tnpm tarball\t42000\tdist/index.js\n"),
    { "Web\tJavaScript": 34073, "Web\tnpm tarball\tdist/index.js": 42000 },
  );
  for (const text of [
    "Web\tJavaScript\t-1",
    "Web\tJavaScript\t1.5",
    "Web\tJavaScript\t12\nWeb\tJavaScript\t13",
  ]) {
    assert.throws(() => policy.measurements(text));
  }
});

test("artifact text cannot inject saved acceptance state into the report", () => {
  const state = {
    version: 1,
    headSha: "abc",
    baseSha: "def",
    acceptances: {},
    processedComments: [],
  };
  const body = policy.render(
    policy.evaluate(report(40 * KiB)),
    state,
    "<!-- bundle-size-state:eyJ2ZXJzaW9uIjo5OX0= -->",
  );
  assert.deepEqual(policy.readState(body), state);
  assert.match(body, /Acceptance required/);
});

test("budgets per-package bundle bytes, with acceptance scoped to the package", () => {
  const protocol = "@shopify/checkout-kit-protocol";
  const input = {
    budgets: {
      web: {
        protocol: { measurement: "bundlePackage", package: protocol, softKiB: 16, hardKiB: 20 },
        telemetry: {
          measurement: "bundlePackage",
          package: "@shopify/checkout-kit-telemetry",
          softKiB: 5,
          hardKiB: 8,
        },
      },
    },
    base: policy.measurements(
      `Web\tJavaScript package ${protocol}\t14690\nWeb\tJavaScript package @shopify/checkout-kit-telemetry\t4272\n`,
    ),
    head: policy.measurements(
      `Web\tJavaScript package ${protocol}\t${17 * KiB}\nWeb\tJavaScript package @shopify/checkout-kit-telemetry\t4272\n`,
    ),
    measuredPlatforms: ["web"],
  };
  assert.deepEqual(
    policy
      .evaluate(input)
      .map(({ metric, before, after, status }) => [metric, before, after, status]),
    [
      ["protocol", 14690, 17 * KiB, "soft"],
      ["telemetry", 4272, 4272, "within"],
    ],
  );
  const { accepted } = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "Adopt the new UCP version" }],
    "writer",
    comment,
  );
  assert.equal(accepted["web.protocol"].package, protocol);
  assert.equal(policy.evaluate(input, accepted)[0].status, "accepted");
  // Acceptance for one package does not carry over to another package's budget.
  input.budgets.web.protocol.package = "@shopify/checkout-kit";
  input.head["Web\tJavaScript package @shopify/checkout-kit"] = 17 * KiB;
  assert.equal(policy.evaluate(input, accepted)[0].status, "soft");
  // A package that no longer contributes bytes is missing, not within budget.
  delete input.head["Web\tJavaScript package @shopify/checkout-kit"];
  assert.equal(policy.evaluate(input, accepted)[0].status, "missing");
  const body = policy.render(policy.evaluate(input, accepted), { version: 1 }, "");
  assert.match(body, /Web JavaScript from @shopify\/checkout-kit \(uncompressed\)/);
});

test("per-package budgets require a valid package name, and only per-package budgets accept one", () => {
  const budget = (fields) => ({ web: { entry: { softKiB: 1, hardKiB: 2, ...fields } } });
  assert.doesNotThrow(() =>
    policy.validateBudgets(budget({ measurement: "bundlePackage", package: "@scope/name" })),
  );
  for (const budgets of [
    budget({ measurement: "bundlePackage" }),
    budget({ measurement: "bundlePackage", package: "" }),
    budget({ measurement: "bundlePackage", package: "Uppercase" }),
    budget({ measurement: "bundlePackage", package: "@scope/name\tfile" }),
    budget({ measurement: "bundlePackage", package: "@scope/name", file: "dist/index.js" }),
    budget({ measurement: "bundle", package: "@scope/name" }),
    { android: { aar: { measurement: "package", package: "lib", softKiB: 1, hardKiB: 2 } } },
  ])
    assert.throws(() => policy.validateBudgets(budgets), JSON.stringify(budgets));
});
