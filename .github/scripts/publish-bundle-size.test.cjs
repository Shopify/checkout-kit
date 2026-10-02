const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");
const publisher = require("./publish-bundle-size.cjs");

function fixture(permission = "write") {
  const report = {
    version: 1,
    pr: 1,
    headSha: "head",
    baseSha: "base",
    budgets: {
      web: { javascript: { measurement: "shippedJavaScript", softKiB: 35, hardKiB: 50 } },
    },
    base: { "Web\tJavaScript": 34000 },
    head: { "Web\tJavaScript": 40000 },
    measuredPlatforms: ["web"],
  };
  const comment = {
    id: 42,
    body: "/accept-size web New checkout capability",
    user: { login: "writer", type: "User" },
    created_at: "2026-10-02T12:01:00Z",
    updated_at: "2026-10-02T12:01:00Z",
    html_url: "https://github.com/example/repo/pull/1#issuecomment-42",
  };
  const state = { acceptances: {}, processedComments: [], publishedAt: "2026-10-02T12:00:00Z" };
  const github = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: async () => {
          if (permission === "missing")
            throw Object.assign(new Error("Not found"), { status: 404 });
          return { data: { permission } };
        },
      },
    },
  };
  const process = (overrides = {}) =>
    publisher.processCommands({
      github,
      repo: {},
      comments: [comment],
      state,
      report,
      mayAccept: true,
      ...overrides,
    });
  return { report, comment, state, process };
}

test("writer acceptance records the actor, reason and size, and is processed only once", async () => {
  const f = fixture();
  const result = await f.process();
  assert.deepEqual(result.acceptances["web.javascript"], {
    bytes: 40000,
    measurement: "shippedJavaScript",
    actor: "writer",
    reason: "New checkout capability",
    commentId: 42,
    url: f.comment.html_url,
  });
  assert.equal(policy.conclusion(policy.evaluate(f.report, result.acceptances)), "success");
  Object.assign(f.state, result);
  f.report.head["Web\tJavaScript"]++;
  const replay = await f.process();
  assert.deepEqual(replay.acceptances, result.acceptances);
  assert.equal(policy.conclusion(policy.evaluate(f.report, replay.acceptances)), "failure");
});

test("unauthorized, malformed, edited and premature commands cannot accept sizes", async () => {
  for (const scenario of ["read", "missing", "reason", "edited", "stale", "premature"]) {
    const f = fixture(["read", "missing"].includes(scenario) ? scenario : "write");
    if (scenario === "reason") f.comment.body = "/accept-size web";
    if (scenario === "edited") f.comment.updated_at = "2026-10-02T12:02:00Z";
    if (scenario === "premature") f.state.publishedAt = "2026-10-02T12:02:00Z";
    const result = await f.process({ mayAccept: scenario !== "stale" });
    assert.deepEqual(result.acceptances, {}, scenario);
    assert.deepEqual(result.processedComments, [42], scenario);
    assert.ok(result.notes.length, scenario);
  }
});

test("all pending platform commands are processed when comment events are coalesced", async () => {
  const f = fixture();
  f.report.budgets.android = { aar: { measurement: "package", softKiB: 100, hardKiB: 200 } };
  f.report.head["Android\trelease AAR"] = 150 * 1024;
  f.report.measuredPlatforms.push("android");
  const android = { ...f.comment, id: 43, body: "/accept-size android Native support" };
  const result = await f.process({ comments: [f.comment, android] });
  assert.equal(policy.conclusion(policy.evaluate(f.report, result.acceptances)), "success");
  assert.deepEqual(result.processedComments, [42, 43]);
});

test("rejects stale or mismatched reports and trusts only the Actions bot's saved state", () => {
  const { report } = fixture();
  const pr = { number: 1, head: { sha: "head" }, base: { sha: "base" } };
  const run = { head_sha: "head" };
  assert.doesNotThrow(() => publisher.validateReport(report, pr, run));
  for (const field of ["headSha", "baseSha", "pr"]) {
    assert.throws(() => publisher.validateReport({ ...report, [field]: "wrong" }, pr, run));
  }
  for (const [login, type, trusted] of [
    ["github-actions[bot]", "Bot", true],
    ["writer", "User", false],
  ]) {
    assert.equal(publisher.isReport({ user: { login, type }, body: policy.marker }), trusted);
  }
});
