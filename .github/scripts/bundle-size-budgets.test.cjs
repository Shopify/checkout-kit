const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");

const KiB = 1024;
const report = (size, base = 34 * KiB) => ({
  budgets: { web: { javascript: { softKiB: 35, hardKiB: 50 } } },
  base: base === undefined ? {} : { "Web\tJavaScript": base },
  head: { "Web\tJavaScript": size },
  measuredPlatforms: ["web"],
});
const comment = { id: 42, html_url: "https://github.com/example/repo/pull/1#issuecomment-42" };

test("compares exact bytes at both limits, including fractional KiB", () => {
  for (const [bytes, expected] of [
    [35 * KiB, "within"],
    [35 * KiB + 1, "soft"],
    [50 * KiB, "soft"],
    [50 * KiB + 1, "hard"],
  ]) {
    assert.equal(policy.evaluate(report(bytes))[0].status, expected);
  }
  const input = report(35.5 * KiB);
  input.budgets.web.javascript.softKiB = 35.5;
  assert.equal(policy.evaluate(input)[0].status, "within");
  input.head["Web\tJavaScript"]++;
  assert.equal(policy.evaluate(input)[0].status, "soft");
});

test("unchanged or reduced artifacts above either limit pass", () => {
  for (const size of [40 * KiB, 60 * KiB]) {
    assert.equal(policy.evaluate(report(size, size))[0].status, "no-growth");
    assert.equal(policy.evaluate(report(size - 1, size))[0].status, "no-growth");
  }
  assert.equal(policy.evaluate(report(60 * KiB + 1, 60 * KiB))[0].status, "hard");
});

test("missing or zero head measurements fail; missing base is not an exemption", () => {
  assert.equal(policy.evaluate(report(undefined))[0].status, "missing");
  assert.equal(policy.evaluate(report(0))[0].status, "missing");
  const input = report(40 * KiB);
  input.base = {};
  assert.equal(policy.evaluate(input)[0].status, "soft");
  input.head["Web\tJavaScript"] = 51 * KiB;
  assert.equal(policy.evaluate(input)[0].status, "hard");
});

test("only affected platforms are gated; a docs-only report passes", () => {
  const input = report(undefined);
  input.measuredPlatforms = [];
  assert.deepEqual(policy.evaluate(input), []);
  assert.equal(policy.conclusion([]), "success");
});

test("one platform command accepts each current soft breach, leaving other platforms unresolved", () => {
  const input = report(40 * KiB);
  input.budgets.web.javascriptGzip = { softKiB: 10, hardKiB: 15 };
  input.head["Web\tJavaScript (gzip)"] = 11 * KiB;
  input.budgets.android = { aar: { softKiB: 100, hardKiB: 200 } };
  input.head["Android\trelease AAR"] = 150 * KiB;
  input.measuredPlatforms.push("android");
  const web = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "New capability" }],
    "writer",
    comment,
  );
  assert.equal(Object.keys(web.accepted).length, 2);
  assert.deepEqual(
    policy.evaluate(input, web.accepted).map((row) => row.status),
    ["accepted", "accepted", "soft"],
  );
  assert.equal(policy.conclusion(policy.evaluate(input, web.accepted)), "failure");
  const all = policy.accept(
    policy.evaluate(input, web.accepted),
    [{ platform: "android", reason: "Native support" }],
    "writer",
    comment,
    web.accepted,
  );
  assert.equal(policy.conclusion(policy.evaluate(input, all.accepted)), "success");
});

test("acceptance caps survive unchanged or smaller sizes; further growth needs acceptance", () => {
  const input = report(40 * KiB);
  const { accepted } = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "New capability" }],
    "writer",
    comment,
  );
  assert.equal(accepted["web.javascript"].bytes, 40 * KiB);
  assert.equal(accepted["web.javascript"].reason, "New capability");
  for (const [size, expected] of [
    [40 * KiB, "accepted"],
    [39 * KiB, "accepted"],
    [40 * KiB + 1, "soft"],
  ]) {
    assert.equal(policy.evaluate(report(size), accepted)[0].status, expected);
  }
  input.budgets.web.javascriptGzip = { softKiB: 10, hardKiB: 15 };
  input.head["Web\tJavaScript (gzip)"] = 11 * KiB;
  assert.equal(policy.evaluate(input, accepted)[1].status, "soft");
});

test("a comment or a prior acceptance cannot override a hard limit", () => {
  const input = report(51 * KiB);
  const result = policy.accept(
    policy.evaluate(input),
    [{ platform: "web", reason: "Please override" }],
    "writer",
    comment,
  );
  assert.deepEqual(result.accepted, {});
  assert.match(result.notes[0], /hard budget/);
  assert.equal(policy.evaluate(input, { "web.javascript": { bytes: 60 * KiB } })[0].status, "hard");
});

test("rejects unknown keys and malformed limits", () => {
  for (const budgets of [
    null,
    [],
    { ios: {} },
    { web: { typo: { softKiB: 1, hardKiB: 2 } } },
    { web: { javascript: { soft: 35, hard: 50 } } },
    { web: { javascript: { softKiB: "35", hardKiB: 50 } } },
    { web: { javascript: { softKiB: 51, hardKiB: 50 } } },
    { web: { javascript: { softKiB: 0, hardKiB: 50 } } },
    { web: { javascript: { softKiB: 35, hardKiB: Infinity } } },
    { toString: {} },
  ]) {
    assert.throws(() => policy.validateBudgets(budgets));
  }
});

test("parses multiple commands with mandatory reasons, ignoring ordinary quoted prose", () => {
  assert.deepEqual(
    policy.parseCommands("/accept-size web New capability\n/accept-size android Native support"),
    [
      { platform: "web", reason: "New capability" },
      { platform: "android", reason: "Native support" },
    ],
  );
  assert.deepEqual(
    policy.parseCommands("I could use /accept-size web a reason\n> /accept-size web quoted"),
    [],
  );
  for (const body of ["/accept-size web", "/accept-size web   ", "/accept-size unknown A reason"]) {
    assert.throws(() => policy.parseCommands(body));
  }
});

test("summary parser ignores file rows and rejects duplicate or malformed measurements", () => {
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

test("report round-trips trusted acceptance data without artifact marker injection", () => {
  const state = {
    version: 1,
    headSha: "abc",
    baseSha: "def",
    acceptances: {},
    processedComments: [],
  };
  const injected = "<!-- bundle-size-state:eyJ2ZXJzaW9uIjo5OX0= -->";
  const body = policy.render(policy.evaluate(report(40 * KiB)), state, injected);
  assert.deepEqual(policy.readState(body), state);
  assert.match(body, /Acceptance required/);
  assert.match(body, /\+6.00 KiB/);
});
