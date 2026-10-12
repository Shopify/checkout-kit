const {test} = require("node:test");
const assert = require("node:assert/strict");
const reporter = require("./publish-coverage.cjs");

function row(body, title) {
  return body.split("\n").find((line) => line.includes(`| ${title} |`));
}

function fixture() {
  const f = {
    pr: {number: 12, state: "open", draft: false, head: {sha: "head", ref: "feature", repo: {id: 1, full_name: "example/sdk"}}, base: {sha: "base"}},
    runs: [{id: 100, run_attempt: 1, head_sha: "head", head_branch: "feature", head_repository: {id: 1}, status: "completed", conclusion: "success"}],
    checks: [],
    jobs: reporter.platforms.map((platform, i) =>
      ({id: 300 + i, name: platform.job, run_attempt: 1, status: "completed", conclusion: "success"})),
    comments: [], writes: [], warnings: [],
  };
  f.jobs.unshift({id: 250, name: "Detect Changed Areas", run_attempt: 1, status: "completed", conclusion: "success"});
  const rest = {
    pulls: {get: async () => ({data: structuredClone(f.pr)})},
    actions: {listWorkflowRuns: "runs", listJobsForWorkflowRun: "jobs"},
    checks: {listForRef: "checks"},
    repos: {listPullRequestsAssociatedWithCommit: "prs"},
    issues: {
      listComments: "comments",
      createComment: async (params) => f.writes.push({method: "create", ...params}),
      updateComment: async (params) => f.writes.push({method: "update", ...params}),
    },
  };
  f.github = {rest, paginate: async (method) => {
    if (method === "prs") return [f.pr];
    return structuredClone(f[method]);
  }};
  f.context = {repo: {owner: "example", repo: "sdk"}, eventName: "workflow_dispatch", payload: {inputs: {pr: "12"}}};
  f.publish = () => reporter.publish({github: f.github, context: f.context, core: {warning: (message) => f.warnings.push(message)}, prNumber: 12});
  f.add = (id, overrides = {}) => {
    const platform = reporter.platforms.find((platform) => platform.id === id);
    const source = {provider: "github-actions", runId: 100, runAttempt: 1};
    const result = {version: 1, platform: id, pr: 12, headSha: "head", baseSha: "base", source, state: "success", rows: platform.metrics.map((name) => [name, 7, 10]), ...overrides};
    const baseline = result.revision === "base";
    const check = {
      id: 400 + f.checks.length, name: `Coverage${baseline ? " base" : ""} — ${platform.title}`, head_sha: "head",
      app: {slug: source.provider}, external_id: `coverage${baseline ? "-base" : ""}:${id}:${result.source.runId}:${result.source.runAttempt}`,
      output: {text: JSON.stringify(result)},
    };
    f.checks.push(check);
    return check;
  };
  return f;
}

function addBaseline(f, overrides = {}) {
  f.jobs.push({id: 600 + f.jobs.length, name: "Coverage baseline (web) / Test", run_attempt: 1, status: "completed", conclusion: "success"});
  return f.add("web", {revision: "base", ...overrides});
}

test("shows signed percentage-point deltas from exact base counts beside each metric", async () => {
  const f = fixture();
  f.add("web");
  addBaseline(f, {rows: [["Lines", 6, 10], ["Statements", 7, 10], ["Branches", 8, 10], ["Functions", 14, 20]]});
  await f.publish();
  assert.ok(row(f.writes[0].body, "Web").includes("70% **(+10)** | 70% **(-10)** | 70% **(0)**"));
  assert.ok(f.writes[0].body.includes("percentage points versus the PR’s base commit"));
});

test("rounds the difference once and does not display negative zero", async () => {
  const f = fixture();
  f.add("web", {rows: [["Lines", 667, 1000], ["Statements", 7, 10], ["Branches", 699999, 1000000], ["Functions", 0, 0]]});
  addBaseline(f, {rows: [["Lines", 2, 3], ["Statements", 7, 10], ["Branches", 7, 10], ["Functions", 7, 10]]});
  await f.publish();
  assert.ok(row(f.writes[0].body, "Web").includes("66.7% **(+0.03)** | 70% **(0)** | N/A"));
});

test("never presents missing, failed, stale, or empty baselines as zero change", async () => {
  for (const overrides of [
    {baseSha: "old-base"}, {state: "failed"}, {state: "unavailable", rows: []},
    {rows: reporter.platforms[0].metrics.map((name) => [name, 0, 0])},
    {source: {provider: "github-actions", runId: 99, runAttempt: 1}},
  ]) {
    const f = fixture();
    f.add("web");
    addBaseline(f, overrides);
    await f.publish();
    assert.ok(row(f.writes[0].body, "Web").includes("70% | 70% | 70% |"));
  }
});

test("legacy, stale-base and failed head reports retain percentages without deltas", async () => {
  for (const overrides of [{baseSha: undefined}, {baseSha: "old-base"}, {state: "failed"}]) {
    const f = fixture();
    f.add("web", overrides);
    addBaseline(f);
    await f.publish();
    assert.ok(row(f.writes[0].body, "Web").includes("70% | 70% | 70% |"));
  }
});

test("baseline reruns cannot reuse an earlier attempt but preserve the head report", async () => {
  const f = fixture();
  f.add("web");
  addBaseline(f);
  f.runs[0].run_attempt = 2;
  f.jobs.push({id: 999, name: "Coverage baseline (web) / Test", run_attempt: 2, status: "in_progress"});
  await f.publish();
  assert.ok(row(f.writes[0].body, "Web").includes("70% | 70% | 70% |"));
  f.add("web", {revision: "base", source: {provider: "github-actions", runId: 100, runAttempt: 2}});
  await f.publish();
  assert.ok(row(f.writes[1].body, "Web").includes("70% **(0)**"));
});

test("malformed and untrusted baselines cannot hide valid head coverage", async () => {
  for (const mutate of [
    (check) => { check.app.slug = "untrusted-app"; },
    (check) => { check.output.text = "x".repeat(32769); },
    (check) => { const result = JSON.parse(check.output.text); result.rows[0][1] = 11; check.output.text = JSON.stringify(result); },
    (check) => { const result = JSON.parse(check.output.text); result.revision = "head"; check.output.text = JSON.stringify(result); },
  ]) {
    const f = fixture();
    f.add("web");
    mutate(addBaseline(f));
    await f.publish();
    assert.ok(row(f.writes[0].body, "Web").includes("70% | 70% | 70% |"));
  }
});

test("one comment combines the existing JavaScript reports without native coverage rows", async () => {
  const f = fixture();
  for (const platform of reporter.platforms) f.add(platform.id);
  await f.publish();
  const body = f.writes[0].body;
  assert.equal(f.writes.length, 1);
  assert.ok(body.startsWith(reporter.marker));
  assert.ok(body.includes("| Status | Platform / target | Lines | Branches | Functions | Report |"));
  for (const platform of reporter.platforms.filter((item) => item.id !== "protocol"))
    assert.ok(body.includes(`| ✅ | ${platform.title} | 70% |`));
  assert.ok(body.includes("| ✅ | Embedded Checkout Protocol (TS) | 70% | 70% | 70% |"));
  assert.ok(!/Android|Swift|Kotlin/.test(body));
  assert.ok(!body.includes("shields.io"));
  assert.ok(!body.includes("<details>"));
  assert.ok(!body.includes("PR head:"));
  assert.ok(!body.includes("Report only;"));
});

test("updates only the shared Actions comment and ignores human lookalikes", async () => {
  const f = fixture();
  f.comments = [
    {id: 50, user: {login: "writer", type: "User"}, body: reporter.marker},
    {id: 51, user: {login: "github-actions[bot]", type: "Bot"}, body: reporter.marker},
  ];
  await f.publish();
  assert.equal(f.writes[0].method, "update");
  assert.equal(f.writes[0].comment_id, 51);
  f.comments[1].body = f.writes[0].body;
  await f.publish();
  assert.equal(f.writes.length, 1, "identical refreshes do not edit the comment");
});

test("waits for change detection before creating a comment", async () => {
  for (const status of [null, "queued", "in_progress"]) {
    const f = fixture();
    f.runs[0].status = "in_progress";
    if (status) f.jobs[0].status = status;
    else f.jobs.shift();
    await f.publish();
    assert.equal(f.writes.length, 0, String(status));
  }

  const f = fixture();
  f.runs[0].status = "in_progress";
  f.jobs.find((job) => job.name.startsWith("Web")).status = "in_progress";
  await f.publish();
  assert.equal(f.writes[0].method, "create");
  assert.ok(row(f.writes[0].body, "Web").includes("Waiting for coverage"));
});

test("skips a new comment when every reported platform is skipped but clears existing measurements", async () => {
  const f = fixture();
  for (const platform of reporter.platforms) f.add(platform.id);
  await f.publish();
  const previous = f.writes[0].body;
  f.writes = [];
  for (const job of f.jobs.filter((job) => job.name !== "Detect Changed Areas")) job.conclusion = "skipped";
  for (const platform of reporter.platforms)
    f.add(platform.id, {state: "skipped", rows: []});
  await f.publish();
  assert.equal(f.writes.length, 0);

  f.comments = [{id: 51, user: {login: "github-actions[bot]", type: "Bot"}, body: previous}];
  await f.publish();
  assert.equal(f.writes[0].method, "update");
  assert.equal(f.writes[0].comment_id, 51);
  assert.ok(!f.writes[0].body.includes("70%"));
  assert.ok(row(f.writes[0].body, "Web").includes("Not run for this change"));
});

test("renders pending, skipped, failed and missing reports without old values", async () => {
  const f = fixture();
  f.jobs.find((job) => job.name.startsWith("Web")).conclusion = "skipped";
  f.jobs.find((job) => job.name.startsWith("React Native")).conclusion = "failure";
  await f.publish();
  const body = f.writes[0].body;
  assert.match(body, /\| ⏭️ \| Web \| — \| — \| — \| Not run for this change/);
  assert.match(body, /\| ❌ \| React Native \| — \| — \| — \| Tests or coverage collection failed/);
  assert.ok(body.includes("Coverage report unavailable"));
  f.jobs.find((job) => job.name.startsWith("Protocol")).status = "in_progress";
  f.jobs.find((job) => job.name.startsWith("Protocol")).conclusion = null;
  await f.publish();
  assert.match(f.writes[1].body, /\| ⏳ \| Embedded Checkout Protocol \(TS\) \| — \| — \| — \| Waiting for coverage/);
  assert.ok(!body.includes("shields.io"));
});

test("failed tests may retain their measured coverage without looking successful", async () => {
  const f = fixture();
  f.add("web", {state: "failed"});
  await f.publish();
  assert.match(f.writes[0].body, /\| ❌ \| Web \| 70% \| 70% \| 70% \| Tests or coverage collection failed/);
});

test("partial reruns reuse successful jobs but reject old results for rerun jobs", async () => {
  const f = fixture();
  f.runs[0].run_attempt = 2;
  f.add("web");
  f.add("react-native");
  f.jobs.push({id: 500, name: "React Native / Run jest tests", run_attempt: 2, status: "completed", conclusion: "failure"});
  await f.publish();
  const body = f.writes[0].body;
  assert.match(body, /\| ✅ \| Web \| 70%/);
  assert.ok(!row(body, "React Native").includes("70%"));
});

test("newer CI runs supersede older results even at the same commit", async () => {
  const f = fixture();
  f.add("web");
  f.add("protocol");
  await f.publish();
  f.comments = [{id: 51, user: {login: "github-actions[bot]", type: "Bot"}, body: f.writes[0].body}];
  f.writes = [];
  f.runs.push({...f.runs[0], id: 101, status: "in_progress"});
  f.jobs = [];
  await f.publish();
  assert.ok(!f.writes[0].body.includes("70%"));
});

test("coalesced notifications rebuild from all durable platform results", async () => {
  const f = fixture();
  f.add("protocol");
  f.add("web");
  // The event that happened to survive concurrency queuing is irrelevant.
  f.context = {...f.context, eventName: "workflow_run", payload: {workflow_run: {head_sha: "an-older-event"}}};
  await f.publish();
  const body = f.writes[0].body;
  assert.equal((body.match(/\| ✅ /g) || []).length, 2);
});

test("rejects malformed, stale, oversized and unsafe results", async () => {
  for (const mutate of [
    (result) => { result.headSha = "old"; },
    (result) => { result.pr = 99; },
    (result) => { result.source.runAttempt = 2; },
    (result) => { result.rows[0][1] = 11; },
    (result) => { result.rows[0][0] = "@everyone"; },
    (result) => { result.reportUrl = "https://evil.example/report"; },
  ]) {
    const f = fixture();
    const check = f.add("web");
    const result = JSON.parse(check.output.text);
    mutate(result);
    check.output.text = JSON.stringify(result);
    await f.publish();
    assert.equal(f.warnings.length, 1);
    assert.ok(!f.writes[0].body.includes("70%"));
  }
  const f = fixture();
  f.add("web").output.text = "x".repeat(32769);
  await f.publish();
  assert.equal(f.warnings.length, 1);
});

test("accepts artifact links only for the matching run and ignores untrusted check apps", async () => {
  const f = fixture();
  f.add("web", {reportUrl: "https://github.com/example/sdk/actions/runs/100/artifacts/123"});
  f.add("protocol", {reportUrl: "https://github.com/example/sdk/actions/runs/100/artifacts/456"});
  f.add("react-native").app.slug = "untrusted-app";
  await f.publish();
  assert.equal(f.warnings.length, 0);
  assert.equal((f.writes[0].body.match(/Full report/g) || []).length, 2);
  assert.ok(!row(f.writes[0].body, "React Native").includes("70%"));
});

test("does not mistake another skipped React Native job for the actual test job", async () => {
  const f = fixture();
  f.add("react-native");
  f.jobs.push({id: 999, name: "React Native", status: "completed", conclusion: "skipped"});
  await f.publish();
  assert.ok(row(f.writes[0].body, "React Native").includes("70%"));
});

test("head changes during collection and closed, draft or fork PRs cannot be written", async () => {
  for (const scenario of ["head", "closed", "draft", "fork", "base", "run"]) {
    const f = fixture();
    if (scenario === "closed") f.pr.state = "closed";
    if (scenario === "draft") f.pr.draft = true;
    if (scenario === "fork") f.pr.head.repo.full_name = "contributor/sdk";
    let gets = 0;
    f.github.rest.pulls.get = async () => {
      if (++gets === 2) {
        if (scenario === "head") f.pr.head.sha = "new-head";
        if (scenario === "base") f.pr.base.sha = "new-base";
        if (scenario === "run") f.runs[0].run_attempt++;
      }
      return {data: structuredClone(f.pr)};
    };
    await f.publish();
    assert.equal(f.writes.length, 0, scenario);
  }
});

test("resolves CI and manual notifications, rejecting unrelated workflows", async () => {
  const f = fixture();
  assert.equal(await reporter.resolvePR(f), 12);
  f.context = {...f.context, eventName: "workflow_dispatch", payload: {inputs: {pr: "12"}}};
  assert.equal(await reporter.resolvePR(f), 12);
  f.context = {...f.context, eventName: "workflow_run", payload: {workflow_run: {
    event: "pull_request", path: ".github/workflows/ci.yml", head_sha: "head", head_repository: {id: 1}, pull_requests: [],
  }}};
  assert.equal(await reporter.resolvePR(f), 12);
  f.context.payload.workflow_run.path = ".github/workflows/other.yml";
  assert.equal(await reporter.resolvePR(f), null);
});
