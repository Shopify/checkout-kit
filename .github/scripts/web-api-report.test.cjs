const assert = require("node:assert/strict");
const { test } = require("node:test");
const { marker, publish, render, validateReport } = require("./web-api-report.cjs");

function fixture() {
  const f = { writes: [], warnings: [], comments: [] };
  f.pr = {
    number: 42,
    state: "open",
    head: { sha: "abc1234", ref: "feature", repo: { id: 7 } },
    base: { sha: "def5678" },
  };
  f.run = {
    id: 100,
    run_attempt: 1,
    head_sha: "abc1234",
    head_branch: "feature",
    head_repository: { id: 7 },
    path: ".github/workflows/ci.yml",
    status: "completed",
    event: "pull_request",
    pull_requests: [f.pr],
  };
  f.runs = [f.run];
  f.jobs = [
    { name: "Detect Changed Areas", conclusion: "success" },
    { name: "Web / Lint, test, build, verify", conclusion: "failure" },
  ];
  f.artifacts = [{ id: 12, name: "web-api-checkout-kit-1", size_in_bytes: 200, expired: false }];
  f.report = {
    version: 1,
    package: "@example/checkout",
    pr: 42,
    headSha: "abc1234",
    baseSha: "def5678",
    runId: 100,
    runAttempt: 1,
    changes: [
      {
        path: "index.d.ts",
        status: "changed",
        diff: "@@ -1,3 +1,4 @@\n export declare class Checkout {\n+  reset(): void;\n }\n",
      },
    ],
  };
  f.context = { repo: { owner: "example", repo: "kit" }, payload: { workflow_run: f.run } };
  f.core = { warning: (message) => f.warnings.push(message) };
  f.github = {
    rest: {
      pulls: { get: async () => ({ data: structuredClone(f.pr) }) },
      repos: { listPullRequestsAssociatedWithCommit: "associated" },
      actions: {
        listWorkflowRuns: "runs",
        listWorkflowRunArtifacts: "artifacts",
        listJobsForWorkflowRunAttempt: "jobs",
      },
      issues: {
        listComments: "comments",
        createComment: async (params) => f.writes.push({ method: "create", ...params }),
        updateComment: async (params) => f.writes.push({ method: "update", ...params }),
      },
    },
    paginate: async (method) =>
      structuredClone(
        {
          associated: [f.pr],
          runs: f.runs,
          artifacts: f.artifacts,
          comments: f.comments,
          jobs: f.jobs,
        }[method],
      ),
  };
  f.read = async () => structuredClone(f.report);
  f.existing = () =>
    f.comments.push({
      id: 9,
      user: { login: "github-actions[bot]", type: "Bot" },
      body: `${marker(f.report.package)}\nPrevious failure`,
    });
  return f;
}

test("a mismatch creates a comment with the proposed diff and full report link", async () => {
  const f = fixture();
  await publish(f);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, "create");
  assert.equal(f.writes[0].issue_number, 42);
  assert.match(f.writes[0].body, /\+  reset\(\): void;/);
  assert.match(f.writes[0].body, /actions\/runs\/100\/artifacts\/12/);
});

test("a rerun updates the existing bot comment rather than adding another", async () => {
  const f = fixture();
  f.existing();
  await publish(f);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, "update");
  assert.equal(f.writes[0].comment_id, 9);
});

test("passing reports stay quiet and resolve an existing failure comment", async () => {
  const f = fixture();
  f.report.changes = [];
  await publish(f);
  assert.equal(f.writes.length, 0);
  f.existing();
  await publish(f);
  assert.equal(f.writes[0].method, "update");
  assert.match(f.writes[0].body, /mismatch is resolved/);
  assert.match(f.writes[0].body, /abc1234/);
});

test("an unchanged comment is not rewritten", async () => {
  const f = fixture();
  f.existing();
  f.comments[0].body = render(
    f.report,
    "https://github.com/example/kit/actions/runs/100",
    "https://github.com/example/kit/actions/runs/100/artifacts/12",
  );
  await publish(f);
  assert.equal(f.writes.length, 0);
});

test("a user cannot impersonate the bot's comment marker", async () => {
  const f = fixture();
  f.existing();
  f.comments[0].user = { login: "contributor", type: "User" };
  await publish(f);
  assert.equal(f.writes[0].method, "create");
});

test("resolves fork PRs through their commit when workflow_run has no PR list", async () => {
  const f = fixture();
  f.run.pull_requests = [];
  await publish(f);
  assert.equal(f.writes.length, 1);
});

test("ignores other producer workflows unless explicitly configured", async () => {
  const f = fixture();
  f.run.path = ".github/workflows/component-checks.yml";
  await publish(f);
  assert.equal(f.writes.length, 0);
  await publish({ ...f, workflowFiles: ["component-checks.yml"] });
  assert.equal(f.writes.length, 1);
});

test("ignores a stale PR head, newer workflow run, or newer rerun attempt", async () => {
  for (const change of [
    (f) => {
      f.pr.head.sha = "new-head";
    },
    (f) => {
      f.runs = [{ ...f.run, id: 101 }];
    },
    (f) => {
      f.runs = [{ ...f.run, run_attempt: 2 }];
    },
  ]) {
    const f = fixture();
    change(f);
    await publish(f);
    assert.equal(f.writes.length, 0);
  }
});

test("a head change during publication prevents the comment write", async () => {
  const f = fixture();
  let calls = 0;
  f.github.rest.pulls.get = async () => ({
    data:
      ++calls === 1 ? structuredClone(f.pr) : { ...f.pr, head: { ...f.pr.head, sha: "new-head" } },
  });
  await publish(f);
  assert.equal(f.writes.length, 0);
});

test("missing and expired reports do not resolve an existing failure", async () => {
  for (const artifacts of [
    [],
    [{ id: 12, name: "web-api-checkout-kit-1", expired: true }],
    [{ id: 12, name: "web-api-checkout-kit-2" }],
  ]) {
    const f = fixture();
    f.existing();
    f.artifacts = artifacts;
    await publish(f);
    assert.equal(f.writes.length, 0);
  }
});

test("rejects reports from another head, base, PR, run, or attempt", () => {
  const f = fixture();
  for (const field of ["headSha", "baseSha", "pr", "runId", "runAttempt"]) {
    assert.throws(
      () => validateReport({ ...f.report, [field]: "wrong" }, f.pr, f.run),
      /does not match/,
    );
  }
});

test("invalid reports cannot publish or resolve comments", async () => {
  const f = fixture();
  f.existing();
  f.report.changes[0].path = "../../unrelated.md";
  await publish(f);
  assert.equal(f.writes.length, 0);
  assert.equal(f.warnings.length, 1);
});

test("renders embedded Markdown as diff text and limits large comments", () => {
  const f = fixture();
  f.report.changes[0].diff = "```\n@someone <details>\n" + "+ added line\n".repeat(5000);
  const body = render(f.report, "https://example.invalid/run", "https://example.invalid/artifact");
  assert.match(body, /````diff\n```/);
  assert.match(body, /diff truncated/);
  assert.ok(body.length < 45000);
});

function skippedFixture() {
  const f = fixture();
  f.artifacts = [];
  f.report.package = "@shopify/checkout-kit";
  f.jobs[1] = { name: "Web", conclusion: "skipped" };
  f.existing();
  return f;
}

test("a path-filter skip replaces the old diff with a current skipped notice", async () => {
  const f = skippedFixture();
  await publish(f);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].method, "update");
  assert.equal(f.writes[0].comment_id, 9);
  assert.match(f.writes[0].body, /previous API report is outdated/);
  assert.match(f.writes[0].body, /skipped the Web check at `abc1234`/);
  assert.match(f.writes[0].body, /no relevant files changed/);
  assert.doesNotMatch(
    f.writes[0].body,
    /built interface matches|artifacts\/undefined|Previous failure/,
  );
});

test("skipped checks stay quiet without an existing bot comment", async () => {
  const f = skippedFixture();
  f.comments = [];
  await publish(f);
  assert.equal(f.writes.length, 0);
  f.existing();
  f.comments[0].user = { login: "contributor", type: "User" };
  await publish(f);
  assert.equal(f.writes.length, 0);
});

test("draft, cancelled, failed, missing and partially run jobs cannot clear the old diff", async () => {
  for (const change of [
    (f) => {
      f.jobs[0].conclusion = "skipped";
    },
    (f) => {
      f.jobs[0].conclusion = "failure";
    },
    (f) => {
      f.jobs = [];
    },
    (f) => {
      f.jobs[1].conclusion = "failure";
    },
    (f) => {
      f.jobs[1] = { name: "Web / Lint, test, build, verify", conclusion: "success" };
    },
    (f) => {
      f.jobs.push({ name: "Web / Lint, test, build, verify", conclusion: "failure" });
    },
    (f) => {
      f.run.conclusion = "cancelled";
    },
  ]) {
    const f = skippedFixture();
    change(f);
    await publish(f);
    assert.equal(f.writes.length, 0);
  }
});

test("skipped detection reads only the matching workflow attempt", async () => {
  const f = skippedFixture();
  f.run.run_attempt = 3;
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) => {
    if (method === "jobs") {
      assert.equal(args.run_id, 100);
      assert.equal(args.attempt_number, 3);
    }
    return paginate(method, args);
  };
  await publish(f);
  assert.equal(f.writes.length, 1);
});

test("new heads, bases, runs and attempts during a skip prevent stale writes", async () => {
  for (const change of [
    (f) => {
      f.pr.head.sha = "new-head";
    },
    (f) => {
      f.pr.base.sha = "new-base";
    },
    (f) => {
      f.runs = [{ ...f.run, id: 101 }];
    },
    (f) => {
      f.runs = [{ ...f.run, run_attempt: 2 }];
    },
  ]) {
    const f = skippedFixture();
    const paginate = f.github.paginate;
    f.github.paginate = async (method, args) => {
      const result = await paginate(method, args);
      if (method === "comments") change(f);
      return result;
    };
    await publish(f);
    assert.equal(f.writes.length, 0);
  }
});

test("an unchanged skipped notice is not rewritten", async () => {
  const f = skippedFixture();
  await publish(f);
  f.comments[0].body = f.writes[0].body;
  f.writes = [];
  await publish(f);
  assert.equal(f.writes.length, 0);
});
