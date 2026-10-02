const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const policy = require("./bundle-size-budgets.cjs");

const checkName = "Size budgets";
const workflow = "package-size.yml";
const isReport = (comment) =>
  comment.user?.login === "github-actions[bot]" &&
  comment.user.type === "Bot" &&
  comment.body?.startsWith(policy.marker);

async function resolvePR({ github, context }) {
  if (context.eventName === "issue_comment")
    return context.payload.issue.pull_request ? context.payload.issue.number : null;
  const run = context.payload.workflow_run;
  if (run.event !== "pull_request" || run.path !== `.github/workflows/${workflow}`) return null;
  // workflow_run.pull_requests can be empty for a fork PR.
  const prs = run.pull_requests.length
    ? run.pull_requests
    : await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
        ...context.repo,
        commit_sha: run.head_sha,
        per_page: 100,
      });
  const pr = prs.find(
    (pr) => pr.head.sha === run.head_sha && pr.head.repo?.id === run.head_repository?.id,
  );
  return pr?.number ?? null;
}

async function readArtifact(github, repo, runId) {
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
    ...repo,
    run_id: runId,
    per_page: 100,
  });
  const artifact = artifacts.find((item) => item.name === "bundle-size-report" && !item.expired);
  if (!artifact || artifact.size_in_bytes > 5 * 1024 * 1024)
    throw new Error("Missing or oversized measurement artifact; rerun Package Size.");
  const { data } = await github.rest.actions.downloadArtifact({
    ...repo,
    artifact_id: artifact.id,
    archive_format: "zip",
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-size-report-"));
  try {
    const archive = path.join(directory, "report.zip");
    fs.writeFileSync(archive, Buffer.from(data));
    // Read only known text entries. Never extract paths or execute PR-provided code.
    const read = (name) =>
      execFileSync("unzip", ["-p", archive, name], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return { report: JSON.parse(read("report.json")), packageComment: read("comment.md") };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function validateReport(report, pr, run) {
  if (
    report.version !== 1 ||
    report.pr !== pr.number ||
    report.headSha !== pr.head.sha ||
    report.baseSha !== pr.base.sha ||
    run.head_sha !== pr.head.sha
  ) {
    throw new Error("Measurements do not match the current PR head and base; rerun Package Size.");
  }
  for (const values of [report.base, report.head]) {
    if (
      !values ||
      typeof values !== "object" ||
      Array.isArray(values) ||
      Object.values(values).some((value) => !Number.isSafeInteger(value) || value < 0)
    ) {
      throw new Error("Invalid size measurements");
    }
  }
  policy.evaluate(report);
}

async function latestRun(github, repo, pr) {
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    ...repo,
    workflow_id: workflow,
    event: "pull_request",
    head_sha: pr.head.sha,
    per_page: 100,
  });
  return runs
    .filter((run) => run.head_repository?.id === pr.head.repo.id && run.head_branch === pr.head.ref)
    .sort((a, b) => b.id - a.id)[0];
}

async function updateCheck(github, repo, pr, status, summary, detailsUrl) {
  const { data: current } = await github.rest.pulls.get({ ...repo, pull_number: pr.number });
  if (
    current.head.sha !== pr.head.sha ||
    current.base.sha !== pr.base.sha ||
    current.state !== "open"
  )
    return;
  const checks = await github.paginate(github.rest.checks.listForRef, {
    ...repo,
    ref: pr.head.sha,
    check_name: checkName,
    per_page: 100,
  });
  const externalId = `bundle-size-budgets:${pr.number}`;
  const existing = checks.find(
    (check) => check.external_id === externalId && check.app?.slug === "github-actions",
  );
  const params = {
    ...repo,
    name: checkName,
    external_id: externalId,
    status: status === "pending" ? "in_progress" : "completed",
    output: {
      title:
        status === "success"
          ? "All size budgets satisfied or accepted"
          : status === "pending"
            ? "Waiting for size measurements"
            : "Size budgets need attention",
      summary,
    },
    details_url: detailsUrl,
  };
  if (status !== "pending") {
    params.conclusion = status;
    params.completed_at = new Date().toISOString();
  }
  if (existing) await github.rest.checks.update({ ...params, check_run_id: existing.id });
  else await github.rest.checks.create({ ...params, head_sha: pr.head.sha });
}

async function processCommands({ github, repo, comments, state, report, mayAccept }) {
  let acceptances = { ...state.acceptances };
  const processed = new Set(state.processedComments);
  const notes = [];
  const permissions = new Map();
  for (const comment of comments) {
    if (
      processed.has(comment.id) ||
      !comment.body?.split(/\r?\n/).some((line) => line.startsWith("/accept-size"))
    )
      continue;
    processed.add(comment.id);
    if (!mayAccept || comment.created_at < state.publishedAt) {
      notes.push(
        `Comment ${comment.id}: wait for the current size report, then post a new command.`,
      );
      continue;
    }
    if (comment.created_at !== comment.updated_at) {
      notes.push(`Comment ${comment.id}: post a new command; edited comments are not accepted.`);
      continue;
    }
    const actor = comment.user.login;
    if (comment.user.type !== "User") continue;
    if (!permissions.has(actor)) {
      try {
        const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
          ...repo,
          username: actor,
        });
        permissions.set(
          actor,
          ["admin", "maintain", "write"].includes(data.permission) ||
            data.user?.permissions?.push === true,
        );
      } catch (error) {
        if (error.status !== 404) throw error;
        permissions.set(actor, false);
      }
    }
    if (!permissions.get(actor)) {
      notes.push(`Comment ${comment.id}: repository write access is required.`);
      continue;
    }
    let commands;
    try {
      commands = policy.parseCommands(comment.body);
    } catch (error) {
      notes.push(`Comment ${comment.id}: ${error.message}`);
      continue;
    }
    const result = policy.accept(
      policy.evaluate(report, acceptances),
      commands,
      actor,
      comment,
      acceptances,
    );
    acceptances = result.accepted;
    notes.push(...result.notes);
  }
  return { acceptances, processedComments: [...processed], notes: notes.slice(-10) };
}

async function publish({ github, context, core, prNumber, loadArtifact = readArtifact }) {
  const repo = context.repo;
  const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: prNumber });
  if (pr.state !== "open") return;
  const run = await latestRun(github, repo, pr);
  if (!run) return; // A comment cannot create an approval before measurements exist.
  if (context.eventName === "workflow_run" && context.payload.workflow_run.id !== run.id) return;
  try {
    if (run.status !== "completed") {
      await updateCheck(
        github,
        repo,
        pr,
        "pending",
        "Package Size is measuring this revision. Wait for its report before accepting an increase.",
        run.html_url,
      );
      return;
    }
    if (run.conclusion !== "success")
      throw new Error(
        "Package Size did not succeed. Fix or rerun the measurement workflow; a comment cannot bypass build failures.",
      );
    const { report, packageComment } = await loadArtifact(github, repo, run.id);
    validateReport(report, pr, run);
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...repo,
      issue_number: pr.number,
      per_page: 100,
    });
    const existing = comments.find(isReport);
    const previous = existing ? policy.readState(existing.body) : null;
    // A command only accepts sizes already shown for this exact measurement run.
    // Saved per-metric caps survive subsequent runs and unrelated commits.
    const mayAccept =
      previous?.headSha === report.headSha &&
      previous?.baseSha === report.baseSha &&
      previous?.runId === run.id &&
      previous?.runAttempt === run.run_attempt;
    const state = previous ?? {
      version: 1,
      acceptances: {},
      processedComments: [],
      publishedAt: new Date().toISOString(),
    };
    const processed = await processCommands({ github, repo, comments, state, report, mayAccept });
    const next = {
      ...state,
      ...processed,
      notes: undefined,
      headSha: report.headSha,
      baseSha: report.baseSha,
      runId: run.id,
      runAttempt: run.run_attempt,
      publishedAt: mayAccept ? state.publishedAt : new Date().toISOString(),
    };
    const rows = policy.evaluate(report, next.acceptances);
    const body = policy.render(rows, next, packageComment, processed.notes);
    const { data: current } = await github.rest.pulls.get({ ...repo, pull_number: pr.number });
    if (
      current.head.sha !== pr.head.sha ||
      current.base.sha !== pr.base.sha ||
      current.state !== "open"
    )
      return;
    const { data: comment } = existing
      ? await github.rest.issues.updateComment({ ...repo, comment_id: existing.id, body })
      : await github.rest.issues.createComment({ ...repo, issue_number: pr.number, body });
    await updateCheck(
      github,
      repo,
      pr,
      policy.conclusion(rows),
      body.replace(/<!--.*?-->/gs, "").slice(0, 60000),
      comment.html_url,
    );
  } catch (error) {
    await updateCheck(github, repo, pr, "failure", error.message, run.html_url);
    core.setFailed(error.message);
  }
}

module.exports = { resolvePR, publish, processCommands, validateReport, isReport };
