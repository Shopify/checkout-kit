const { test } = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./bundle-size-budgets.cjs");
const publisher = require("./publish-bundle-size.cjs");

function fixture() {
  const pr = {
    number: 1,
    state: "open",
    head: { sha: "a".repeat(40), ref: "feature", repo: { id: 123 } },
    base: { sha: "b".repeat(40) },
  };
  const run = {
    id: 10,
    run_attempt: 1,
    event: "pull_request",
    path: ".github/workflows/package-size.yml",
    head_sha: pr.head.sha,
    head_branch: "feature",
    head_repository: { id: 123 },
    pull_requests: [pr],
    status: "completed",
    conclusion: "success",
    html_url: "https://github.com/example/repo/actions/runs/10",
  };
  const report = {
    version: 1,
    pr: 1,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
    budgets: { web: { javascript: { softKiB: 35, hardKiB: 50 } } },
    base: { "Web\tJavaScript": 34000 },
    head: { "Web\tJavaScript": 40000 },
    measuredPlatforms: ["web"],
  };
  const comments = [];
  const checks = [];
  const errors = [];
  const permission = { writer: "write", reader: "read" };
  let pullReads = 0;
  const rest = {
    pulls: {
      get: async () => {
        pullReads++;
        return { data: pr };
      },
    },
    actions: { listWorkflowRuns: "runs" },
    repos: {
      listPullRequestsAssociatedWithCommit: "prs",
      getCollaboratorPermissionLevel: async ({ username }) => ({
        data: { permission: permission[username] ?? "none" },
      }),
    },
    issues: {
      listComments: "comments",
      createComment: async ({ body }) => {
        const item = {
          id: 100,
          body,
          user: { login: "github-actions[bot]", type: "Bot" },
          html_url: "https://github.com/example/repo/pull/1#issuecomment-100",
        };
        comments.push(item);
        return { data: item };
      },
      updateComment: async ({ comment_id, body }) => {
        const item = comments.find((c) => c.id === comment_id);
        item.body = body;
        return { data: item };
      },
    },
    checks: {
      listForRef: "checks",
      create: async (params) => {
        checks.push({ ...params, id: 200 + checks.length, app: { slug: "github-actions" } });
      },
      update: async (params) => {
        Object.assign(
          checks.find((c) => c.id === params.check_run_id),
          params,
        );
      },
    },
  };
  const github = {
    rest,
    paginate: async (route, params) =>
      route === "checks"
        ? checks.filter((check) => check.head_sha === params.ref)
        : { runs: [run], prs: [pr], comments }[route],
  };
  const context = {
    repo: { owner: "example", repo: "repo" },
    eventName: "workflow_run",
    payload: { workflow_run: run },
  };
  const args = {
    github,
    context,
    core: { setFailed: (message) => errors.push(message) },
    prNumber: 1,
    loadArtifact: async () => ({
      report,
      packageComment: policy.marker + "\nPackage measurements",
    }),
  };
  const command = (body, actor = "writer", overrides = {}) => {
    const date = new Date(Date.now() + 2000).toISOString();
    const item = {
      id: comments.length + 101,
      body,
      user: { login: actor, type: "User" },
      created_at: date,
      updated_at: date,
      html_url: "https://github.com/example/repo/pull/1#issuecomment-101",
      ...overrides,
    };
    comments.push(item);
    context.eventName = "issue_comment";
    context.payload = { issue: { number: 1, pull_request: {} }, comment: item };
    return item;
  };
  return {
    pr,
    run,
    report,
    comments,
    checks,
    errors,
    permission,
    github,
    context,
    args,
    command,
    reads: () => pullReads,
  };
}

test("publishes a failing gate, accepts a writer reason, then reopens it after further growth", async () => {
  const f = fixture();
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "failure");
  f.command("/accept-size web New checkout capability");
  await publisher.publish(f.args);
  assert.equal(f.checks.length, 1);
  assert.equal(f.checks.at(-1).conclusion, "success");
  assert.match(f.comments[0].body, /Accepted by @writer: New checkout capability/);
  f.pr.head.sha = f.report.headSha = f.run.head_sha = "c".repeat(40);
  f.run.id++;
  f.context.eventName = "workflow_run";
  f.context.payload = { workflow_run: f.run };
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "success");
  f.report.head["Web\tJavaScript"]++;
  f.run.id++;
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "failure");
  assert.deepEqual(f.errors, []);
});

test("readers, malformed commands and edited comments cannot accept an increase", async () => {
  for (const [body, actor, overrides, expected] of [
    ["/accept-size web Please accept", "reader", {}, /write access/],
    ["/accept-size web", "writer", {}, /reason/],
    [
      "/accept-size web Changed reason",
      "writer",
      { updated_at: "2099-01-01T00:00:00Z" },
      /edited comments/,
    ],
  ]) {
    const f = fixture();
    await publisher.publish(f.args);
    f.command(body, actor, overrides);
    await publisher.publish(f.args);
    assert.equal(f.checks.at(-1).conclusion, "failure");
    assert.match(f.comments[0].body, expected);
    assert.deepEqual(policy.readState(f.comments[0].body).acceptances, {});
  }
});

test("commands cannot pre-approve unreported sizes or new measurements", async () => {
  const f = fixture();
  f.command("/accept-size web Accept whatever it becomes");
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "failure");
  f.command("/accept-size web Report was for an older commit");
  f.pr.head.sha = f.report.headSha = f.run.head_sha = "c".repeat(40);
  f.run.id++;
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "failure");
  assert.deepEqual(policy.readState(f.comments.find(publisher.isReport).body).acceptances, {});
});

test("coalesced comment events still process every pending platform command", async () => {
  const f = fixture();
  f.report.budgets.android = { aar: { softKiB: 100, hardKiB: 200 } };
  f.report.head["Android\trelease AAR"] = 150 * 1024;
  f.report.measuredPlatforms.push("android");
  await publisher.publish(f.args);
  f.command("/accept-size web New checkout capability");
  f.command("/accept-size android Native support");
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "success");
  assert.equal(Object.keys(policy.readState(f.comments[0].body).acceptances).length, 2);
});

test("a forged report from a human cannot supply approvals", async () => {
  const f = fixture();
  f.comments.push({
    id: 2,
    user: { login: "writer", type: "User" },
    body: policy.render(
      [],
      {
        version: 1,
        acceptances: { "web.javascript": { bytes: 999999 } },
        processedComments: [],
      },
      "",
    ),
  });
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "failure");
  assert.equal(f.comments.length, 2);
});

test("hard budgets, missing data, failed builds and expired artifacts fail closed", async () => {
  for (const scenario of ["hard", "missing", "failure", "artifact"]) {
    const f = fixture();
    if (scenario === "hard") f.report.head["Web\tJavaScript"] = 60000;
    if (scenario === "missing") delete f.report.head["Web\tJavaScript"];
    if (scenario === "failure") f.run.conclusion = "failure";
    if (scenario === "artifact")
      f.args.loadArtifact = async () => {
        throw new Error("Artifact expired");
      };
    await publisher.publish(f.args);
    f.command("/accept-size web Please override");
    await publisher.publish(f.args);
    assert.equal(f.checks.at(-1).conclusion, "failure", scenario);
  }
});

test("stale head/base or wrong PR artifacts are rejected", async () => {
  for (const field of ["headSha", "baseSha", "pr"]) {
    const f = fixture();
    f.report[field] = "wrong";
    await publisher.publish(f.args);
    assert.equal(f.comments.length, 0);
    assert.equal(f.checks.at(-1).conclusion, "failure");
    assert.match(f.errors[0], /current PR head and base/);
  }
});

test("pending builds cannot be accepted; stale workflow completions are ignored", async () => {
  const f = fixture();
  f.run.status = "in_progress";
  f.command("/accept-size web Please accept");
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).status, "in_progress");
  assert.equal(f.comments.length, 1);
  f.context.eventName = "workflow_run";
  f.context.payload = { workflow_run: { ...f.run, id: 9 } };
  const reads = f.reads();
  await publisher.publish(f.args);
  assert.equal(f.reads(), reads + 1);
});

test("fork PR resolution works when workflow_run has no pull_requests", async () => {
  const f = fixture();
  f.run.pull_requests = [];
  assert.equal(await publisher.resolvePR(f.args), 1);
  f.run.event = "push";
  assert.equal(await publisher.resolvePR(f.args), null);
});

test("a non-collaborator lookup cannot turn a passing budget check into a failure", async () => {
  const f = fixture();
  f.report.head["Web\tJavaScript"] = 34000;
  await publisher.publish(f.args);
  f.github.rest.repos.getCollaboratorPermissionLevel = async () => {
    throw Object.assign(new Error("Not found"), { status: 404 });
  };
  f.command("/accept-size web Please accept", "outsider");
  await publisher.publish(f.args);
  assert.equal(f.checks.at(-1).conclusion, "success");
  assert.match(f.comments[0].body, /write access is required/);
  assert.deepEqual(f.errors, []);
});
