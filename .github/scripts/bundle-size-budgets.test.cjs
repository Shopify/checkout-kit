const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");

const KiB = 1024;
const report = (size, base = 34 * KiB) => ({
  budgets: { web: { javascript: { softKiB: 35, hardKiB: 50 } } },
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
  input.budgets.web.javascriptGzip = { softKiB: 10, hardKiB: 15 };
  input.head["Web\tJavaScript (gzip)"] = 11 * KiB;
  input.budgets.android = { aar: { softKiB: 100, hardKiB: 200 } };
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
  input.budgets.web.npmTarball = { softKiB: 100, hardKiB: 200 };
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
  assert.equal(policy.evaluate(input, { "web.javascript": { bytes: 60 * KiB } })[0].status, "hard");
});

test("rejects unknown configuration keys and invalid limits", () => {
  for (const budgets of [
    { ios: {} },
    { web: { typo: { softKiB: 1, hardKiB: 2 } } },
    { web: { javascript: { soft: 35, hard: 50 } } },
    { web: { javascript: { softKiB: "35", hardKiB: 50 } } },
    { web: { javascript: { softKiB: 51, hardKiB: 50 } } },
    { web: { javascript: { softKiB: 0, hardKiB: 50 } } },
  ])
    assert.throws(() => policy.validateBudgets(budgets));
});

test("measurement parsing excludes file details and rejects duplicate or invalid sizes", () => {
  assert.deepEqual(
    policy.measurements("Web\tJavaScript\t34073\nWeb\tnpm tarball\t42000\tdist/index.js\n"),
    { "Web\tJavaScript": 34073 },
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
