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
      web: { javascript: { measurement: "bundle", softKiB: 35, hardKiB: 50 } },
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
    measurement: "bundle",
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

test("a skipped title-edit run republishes the latest measurement", async () => {
  const report = { ...fixture().report, head: { "Web\tJavaScript": 34000 } };
  const pr = {
    number: 1,
    state: "open",
    head: { sha: "head", ref: "feature", repo: { id: 7 } },
    base: { sha: "base" },
  };
  const runs = [
    { id: 10, status: "completed", conclusion: "success", run_attempt: 1, head_sha: "head" },
    { id: 11, status: "completed", conclusion: "skipped", run_attempt: 1, head_sha: "head" },
  ].map((run) => ({ ...run, head_branch: "feature", head_repository: { id: 7 } }));
  const listWorkflowRuns = Symbol("runs");
  const listComments = Symbol("comments");
  const listForRef = Symbol("checks");
  const checks = [];
  const loaded = [];
  const github = {
    paginate: async (method) =>
      ({ [listWorkflowRuns]: runs, [listComments]: [], [listForRef]: [] })[method],
    rest: {
      pulls: { get: async () => ({ data: pr }) },
      actions: { listWorkflowRuns },
      issues: {
        listComments,
        createComment: async () => ({ data: { html_url: "https://example.com/c" } }),
      },
      checks: { listForRef, create: async (params) => checks.push(params) },
      reactions: {},
    },
  };
  await publisher.publish({
    github,
    context: { eventName: "workflow_run", repo: {}, payload: { workflow_run: runs[1] } },
    core: { setFailed: (message) => assert.fail(message) },
    prNumber: 1,
    loadArtifact: async (_github, _repo, runId) => {
      loaded.push(runId);
      return { report, packageComment: "" };
    },
  });
  assert.deepEqual(loaded, [10]);
  assert.deepEqual(
    checks.map((check) => check.conclusion),
    ["success"],
  );
});
