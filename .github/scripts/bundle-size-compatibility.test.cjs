const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");

const KiB = 1024;
const fixture = () => ({
  budgets: {
    web: {
      javascript: { name: "Web (NPM)", measurement: "bundle", softKiB: 72, hardKiB: 85 },
      cdn: { name: "Web (CDN)", measurement: "cdn", softKiB: 132, hardKiB: 150 },
    },
  },
  base: {},
  head: { "Web\tJavaScript": 70 * KiB, "Web\tCDN JavaScript": 130 * KiB },
  measuredPlatforms: ["web"],
});

test("named npm and CDN budgets retain independent size enforcement", () => {
  const report = fixture();
  assert.equal(policy.conclusion(policy.evaluate(report)), "success");
  for (const [bytes, expected] of [
    [132 * KiB, "within"],
    [132 * KiB + 1, "soft"],
    [150 * KiB, "soft"],
    [150 * KiB + 1, "hard"],
    [undefined, "missing"],
  ]) {
    report.head["Web\tCDN JavaScript"] = bytes;
    assert.deepEqual(policy.evaluate(report).map(({ status }) => status), ["within", expected]);
  }
});

test("renaming a CDN budget preserves acceptance but changing its scope does not", () => {
  const report = fixture();
  report.head["Web\tCDN JavaScript"] = 140 * KiB;
  const accepted = policy.accept(
    policy.evaluate(report),
    [{ platform: "web", reason: "Additional component" }],
    "reviewer",
    { id: 1, html_url: "https://github.com/example/repo/pull/1#issuecomment-1" },
  ).accepted;
  report.budgets.web.cdn.name = "CDN runtime";
  assert.equal(policy.evaluate(report, accepted)[1].status, "accepted");
  report.head["Web\tCDN JavaScript"]++;
  assert.equal(policy.evaluate(report, accepted)[1].status, "soft");
  report.budgets.web.cdn.file = "checkout-kit.js";
  report.head["Web\tCDN JavaScript\tcheckout-kit.js"] = 140 * KiB;
  assert.equal(policy.evaluate(report, accepted)[1].status, "soft");
  report.head["Web\tCDN JavaScript\tcheckout-kit.js"] = 151 * KiB;
  assert.equal(policy.evaluate(report, accepted)[1].status, "hard");
});

test("rejects malformed display names, CDN paths, and unsupported measurements", () => {
  for (const name of ["", " ", "a\nb", "a\tb", "x".repeat(101), 42, null]) {
    const report = fixture();
    report.budgets.web.cdn.name = name;
    assert.throws(() => policy.validateBudgets(report.budgets));
  }
  for (const file of ["../secret", "/absolute.js", "assets/*.js", "a\\b.js"]) {
    const report = fixture();
    report.budgets.web.cdn.file = file;
    assert.throws(() => policy.validateBudgets(report.budgets));
  }
  const report = fixture();
  report.budgets.web.cdn.measurement = "unknown";
  assert.throws(() => policy.validateBudgets(report.budgets));
});
