const marker = "<!-- checkout-kit-coverage -->";
const jsMetrics = ["Lines", "Statements", "Branches", "Functions"];
const platforms = [
  {id: "web", title: "Web", job: "Web / Lint, test, build, verify", metrics: jsMetrics},
  {id: "react-native", title: "React Native", job: "React Native / Run jest tests", metrics: jsMetrics},
  {id: "android", title: "Android", job: "Android / test", metrics: ["Lines", "Instructions", "Branches", "Methods"]},
  {id: "swift", title: "Swift", metrics: ["ShopifyCheckoutKit", "ShopifyAcceleratedCheckouts"]},
  {id: "protocol", title: "Embedded Checkout Protocol (TypeScript)", displayTitle: "Embedded Checkout Protocol (TS)", job: "Protocol / Test", skippedJob: "Protocol", metrics: jsMetrics},
  {id: "protocol-kotlin", title: "Embedded Checkout Protocol (Kotlin)", job: "Android / test", skippedJob: "Android", metrics: ["Lines", "Instructions", "Branches", "Methods"]},
  {id: "protocol-swift", title: "Embedded Checkout Protocol (Swift)", metrics: ["Lines", "Functions"]},
];

const latest = (items) => [...items].sort((a, b) => b.id - a.id)[0];
const isComment = (comment) => comment.user?.type === "Bot" &&
  comment.user.login === "github-actions[bot]" && comment.body?.startsWith(marker);
const pipelineCheck = (checks) => latest(checks.filter((check) =>
  check.app?.slug === "bitrise" && check.name === "ci/bitrise/ci-ios/pr"));

async function resolvePR({github, context}) {
  if (context.eventName === "repository_dispatch" || context.eventName === "workflow_dispatch") {
    const pr = Number(context.payload.client_payload?.pr ?? context.payload.inputs?.pr);
    return Number.isSafeInteger(pr) && pr > 0 ? pr : null;
  }
  const run = context.payload.workflow_run;
  if (run?.event !== "pull_request" || run.path !== ".github/workflows/ci.yml") return null;
  const prs = run.pull_requests?.length ? run.pull_requests :
    await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
      ...context.repo, commit_sha: run.head_sha, per_page: 100,
    });
  return prs.find((pr) => pr.head.sha === run.head_sha && pr.head.repo?.id === run.head_repository?.id)?.number ?? null;
}

async function sources(github, repo, pr) {
  const [runs, checks] = await Promise.all([
    github.paginate(github.rest.actions.listWorkflowRuns, {
      ...repo, workflow_id: "ci.yml", event: "pull_request", head_sha: pr.head.sha, per_page: 100,
    }),
    github.paginate(github.rest.checks.listForRef, {
      ...repo, ref: pr.head.sha, filter: "all", per_page: 100,
    }),
  ]);
  const run = latest(runs.filter((item) => item.head_sha === pr.head.sha && item.head_repository?.id === pr.head.repo.id && item.head_branch === pr.head.ref));
  return {run, checks, pipeline: pipelineCheck(checks.filter((check) => check.head_sha === pr.head.sha))};
}

function reportURL(value, repo, platform, run) {
  if (!value) return null;
  const url = new URL(value);
  const artifactPrefix = `/${repo.owner}/${repo.repo}/actions/runs/${run?.id}/artifacts/`;
  const valid = !platform.job
    ? url.hostname === "app.bitrise.io" && /^\/app\/[\w-]+\/build\/[\w-]+$/.test(url.pathname)
    : url.hostname === "github.com" && url.pathname.startsWith(artifactPrefix) && /^[0-9]+$/.test(url.pathname.slice(artifactPrefix.length));
  if (!valid || url.protocol !== "https:" || url.username || url.password || url.search || url.hash)
    throw new Error("Invalid coverage report link");
  return url.href;
}

function readResult(check, platform, expected, pr, repo, run) {
  if (check.head_sha !== pr.head.sha || !check.output?.text || check.output.text.length > 32768)
    throw new Error("Invalid coverage check");
  const result = JSON.parse(check.output.text);
  if (result.version !== 1 || result.platform !== platform.id || result.pr !== pr.number ||
      result.headSha !== pr.head.sha || result.source?.provider !== expected.provider ||
      (result.revision ?? "head") !== (expected.revision ?? "head") ||
      result.source.runId !== expected.runId || (result.source.runAttempt ?? 1) !== expected.runAttempt ||
      !["success", "failed", "skipped", "unavailable"].includes(result.state) || !Array.isArray(result.rows))
    throw new Error("Coverage result does not match this run");
  if (expected.revision === "base" && result.baseSha !== pr.base.sha)
    throw new Error("Coverage baseline does not match the PR base");
  if (["skipped", "unavailable"].includes(result.state) && result.rows.length)
    throw new Error("Unexpected measurements for an unmeasured platform");
  if (result.rows.length || result.state === "success") {
    if (result.rows.length !== platform.metrics.length) throw new Error("Missing coverage metrics");
    result.rows.forEach((row, index) => {
      if (!Array.isArray(row) || row.length !== 3 || row[0] !== platform.metrics[index] ||
          !Number.isSafeInteger(row[1]) || !Number.isSafeInteger(row[2]) || row[1] < 0 || row[2] < row[1])
        throw new Error("Invalid coverage counts");
    });
  }
  return {...result, reportUrl: reportURL(result.reportUrl, repo, platform, run)};
}

function platformResult(platform, snapshot, jobs, pr, repo, core, revision = "head") {
  const {run, pipeline, checks} = snapshot;
  const baseline = revision === "base";
  if (baseline && !platform.job) return {state: "unavailable"};
  let expected, state = "pending";
  if (!platform.job) {
    if (!pipeline) return {state};
    expected = {provider: "bitrise", runId: pipeline.id, runAttempt: pipeline.external_id ?? 1};
    if (pipeline.status === "completed") state = pipeline.conclusion === "success" ? "unavailable" : "failed";
  } else {
    if (!run) return {state};
    // A failed-jobs rerun reuses successful jobs from an earlier attempt. Match
    // each result to the attempt that actually ran that platform's test job.
    const jobName = baseline ? `Coverage baseline (${platform.id}) / Test` : platform.job;
    const skippedJob = baseline ? `Coverage baseline (${platform.id})` : platform.skippedJob || platform.title;
    const job = latest(jobs.filter((item) => item.name === jobName)) ||
      latest(jobs.filter((item) => item.name === skippedJob));
    expected = {provider: "github-actions", runId: run.id, runAttempt: job?.run_attempt ?? run.run_attempt};
    const plan = latest(jobs.filter((item) => item.name === "Detect Changed Areas"));
    if (plan?.status === "completed" && plan.conclusion !== "success") return {state: "unavailable"};
    if (job?.conclusion === "skipped") return {state: "skipped"};
    if (job?.status === "completed") state = job.conclusion === "success" ? "unavailable" : "failed";
    else if (!job && run.status === "completed") state = "unavailable";
  }
  expected.revision = revision;
  const externalId = `coverage${baseline ? "-base" : ""}:${platform.id}:${expected.runId}:${expected.runAttempt}`;
  const check = latest(checks.filter((item) => item.app?.slug === expected.provider &&
    item.external_id === externalId && item.name === `Coverage${baseline ? " base" : ""} — ${platform.title}`));
  if (!check) return {state};
  try {
    return readResult(check, platform, expected, pr, repo, run);
  } catch (error) {
    core.warning(`${platform.title}: ${error.message}`);
    return {state: "unavailable"};
  }
}

function metric(row, baseline) {
  if (!row) return "—";
  const [, covered, total] = row;
  if (!total) return "N/A";
  const percentage = Number((100 * covered / total).toFixed(2));
  if (!baseline?.[2]) return `${percentage}%`;
  const delta = Number((100 * covered / total - 100 * baseline[1] / baseline[2]).toFixed(2));
  return `${percentage}% **(${delta > 0 ? "+" : ""}${delta})**`;
}

function render(results, baselines = {}) {
  const lines = [marker, "# Coverage Report", "",
    "| Status | Platform / target | Lines | Branches | Functions | Report |",
    "| :---: | --- | ---: | ---: | ---: | --- |"];
  const statuses = {
    success: ["✅", "—"], pending: ["⏳", "Waiting for coverage"],
    skipped: ["⏭️", "Not run for this change"], failed: ["❌", "Tests or coverage collection failed"],
    unavailable: ["⚠️", "Coverage report unavailable"],
  };
  for (const platform of platforms) {
    const result = results[platform.id];
    const rows = result.rows || [];
    const [emoji, status] = statuses[result.state];
    const report = result.reportUrl ? `[Full report](${result.reportUrl})` : status;
    const find = (name) => rows.find((row) => row[0] === name);
    const baseline = baselines[platform.id];
    const comparable = result.state === "success" && baseline?.state === "success" &&
      result.baseSha && result.baseSha === baseline.baseSha;
    const value = (name) => metric(find(name), comparable ? baseline.rows.find((row) => row[0] === name) : undefined);
    if (platform.id === "swift") {
      for (const target of platform.metrics)
        lines.push(`| ${emoji} | Swift · ${target} | ${value(target)} | — | — | ${report} |`);
    } else {
      lines.push(`| ${emoji} | ${platform.displayTitle || platform.title} | ${value("Lines")} | ${value("Branches")} | ${value(find("Functions") ? "Functions" : "Methods")} | ${report} |`);
    }
  }
  lines.push("", "Changes in parentheses are **percentage points versus the PR’s base commit**. No delta appears when matching base coverage is unavailable.");
  return lines.join("\n") + "\n";
}

const sourceKey = ({run, pipeline}) => `${run?.id}:${run?.run_attempt}:${pipeline?.id}:${pipeline?.external_id}`;

async function publish({github, context, core, prNumber}) {
  const repo = context.repo;
  const {data: pr} = await github.rest.pulls.get({...repo, pull_number: prNumber});
  // Match the producer policy: forks keep artifacts/logs without comment writes.
  if (pr.state !== "open" || pr.draft || pr.head.repo?.full_name !== `${repo.owner}/${repo.repo}`) return;
  const snapshot = await sources(github, repo, pr);
  const jobs = snapshot.run ? await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
    ...repo, run_id: snapshot.run.id, filter: "all", per_page: 100,
  }) : [];
  const results = Object.fromEntries(platforms.map((platform) =>
    [platform.id, platformResult(platform, snapshot, jobs, pr, repo, core)]));
  const baselines = Object.fromEntries(platforms.map((platform) =>
    [platform.id, platformResult(platform, snapshot, jobs, pr, repo, core, "base")]));
  const body = render(results, baselines);
  const comments = await github.paginate(github.rest.issues.listComments, {...repo, issue_number: pr.number, per_page: 100});
  const existing = comments.find(isComment);
  // Wait for change detection before opening a comment for an affected platform.
  // Existing comments still refresh so skipped runs replace stale measurements.
  const plan = latest(jobs.filter((item) => item.name === "Detect Changed Areas"));
  const inScope = Object.values(results).some((result) => result.state !== "skipped");
  if (!existing && (plan?.status !== "completed" || !inScope)) return;
  const {data: current} = await github.rest.pulls.get({...repo, pull_number: pr.number});
  if (current.state !== "open" || current.draft || current.head.sha !== pr.head.sha || current.base.sha !== pr.base.sha) return;
  if (sourceKey(await sources(github, repo, current)) !== sourceKey(snapshot)) return;
  if (existing?.body === body) return;
  if (existing) await github.rest.issues.updateComment({...repo, comment_id: existing.id, body});
  else await github.rest.issues.createComment({...repo, issue_number: pr.number, body});
}

module.exports = {resolvePR, publish, readResult, platformResult, render, platforms, marker, isComment};
