const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const marker = (name) => `<!-- checkout-kit-web-api:${name} -->`;
const latest = (runs) => [...runs].sort((a, b) => b.id - a.id)[0];
const reviewNote =
  "*This friction is intentional to ensure every public-facing API change is considered by reviewers before shipping.*";

function validateReport(report, pr, run) {
  if (
    report.version !== 1 ||
    report.pr !== pr.number ||
    report.headSha !== pr.head.sha ||
    report.baseSha !== pr.base.sha ||
    report.runId !== run.id ||
    report.runAttempt !== run.run_attempt ||
    typeof report.package !== "string" ||
    report.package.length > 214 ||
    !/^@[a-z0-9-]+\/[a-z0-9-]+$/.test(report.package) ||
    !Array.isArray(report.changes) ||
    report.changes.length > 200
  ) {
    throw new Error("API report does not match the current PR and workflow attempt");
  }
  const paths = new Set();
  for (const change of report.changes) {
    if (
      typeof change.path !== "string" ||
      change.path.length > 200 ||
      !/^[a-zA-Z0-9_./-]+$/.test(change.path) ||
      change.path.startsWith("/") ||
      change.path.split("/").includes("..") ||
      !(change.path === "exports.json" || /\.d\.[cm]?ts$/.test(change.path)) ||
      paths.has(change.path) ||
      !["added", "removed", "changed"].includes(change.status) ||
      typeof change.diff !== "string" ||
      !change.diff ||
      change.diff.length > 1024 * 1024
    ) {
      throw new Error("Invalid API change");
    }
    paths.add(change.path);
  }
  return report;
}

function render(report, runUrl, artifactUrl) {
  const lines = [marker(report.package), `### Public API — \`${report.package}\``, ""];
  if (!report.changes.length) {
    lines.push(
      `The API mismatch is resolved: the built interface matches the approved contract at \`${report.headSha.slice(0, 7)}\`.`,
      "",
      `[Check run](${runUrl})`,
      "",
      reviewNote,
    );
    return lines.join("\n");
  }
  lines.push(
    `The built interface at \`${report.headSha.slice(0, 7)}\` differs from the approved contract. Review these proposed changes before updating the baseline.`,
    "",
    "`+` shows the proposed interface; `-` shows the approved interface being removed or replaced. A paired removal and addition can be a signature change.",
    "",
    "| Contract file | Change |",
    "| --- | --- |",
  );
  for (const change of report.changes.slice(0, 30)) {
    const subject = change.path === "exports.json" ? " (package import paths)" : "";
    lines.push(`| \`${change.path}\`${subject} | ${change.status} |`);
  }
  if (report.changes.length > 30)
    lines.push("", "Additional changed files are included in the full report.");
  const fullDiff = report.changes.map((change) => change.diff).join("\n");
  const limit = 16000;
  const diff =
    fullDiff.length > limit
      ? `${fullDiff.slice(0, limit)}\n… diff truncated; see the full report.\n`
      : fullDiff;
  // Artifact text is untrusted. A longer fence keeps any embedded Markdown inert.
  const fence = "`".repeat(
    Math.max(3, ...Array.from(diff.matchAll(/`+/g), (match) => match[0].length + 1)),
  );
  lines.push(
    "",
    `${fence}diff`,
    diff,
    fence,
    "",
    `[Full report](${artifactUrl}) · [Check run](${runUrl})`,
    "",
    "If the change is unintended, fix the implementation.",
    "",
    "<details>",
    "<summary>Updating the baseline</summary>",
    "",
    "```sh",
    "# The check never updates the baseline automatically.",
    "# Agents are instructed not to update this baseline unless explicitly asked.",
    "",
    "# Run from this SDK's package directory to generate a fresh proposal.",
    "# A contract mismatch fails but writes build/api/.",
    "# Fix any build errors before continuing.",
    "pnpm api:check",
    "",
    "# Review the proposal in build/api/ and get explicit approval first.",
    "# Replace the baseline, including removing declarations that no longer exist.",
    "rsync -a --delete build/api/ api/",
    "",
    "# Confirm the updated baseline matches the built API.",
    "pnpm api:check",
    "",
    "# Stage and review all baseline changes, including new and removed files.",
    "git add api/",
    "git diff --cached -- api/",
    "",
    "# Commit the baseline alongside the implementation.",
    "```",
    "",
    "</details>",
    "",
    reviewNote,
  );
  return lines.join("\n");
}

async function readArtifact(github, repo, artifact) {
  if (artifact.size_in_bytes > 2 * 1024 * 1024) throw new Error("API report artifact is too large");
  const { data } = await github.rest.actions.downloadArtifact({
    ...repo,
    artifact_id: artifact.id,
    archive_format: "zip",
  });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "web-api-report-"));
  try {
    const archive = path.join(directory, "report.zip");
    fs.writeFileSync(archive, Buffer.from(data));
    // Read one known JSON entry; never extract paths or execute artifact contents.
    return JSON.parse(
      execFileSync("unzip", ["-p", archive, "api-report.json"], {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      }),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function publish({ github, context, core, workflowFiles = ["ci.yml"], read = readArtifact }) {
  const run = context.payload.workflow_run;
  if (
    run?.event !== "pull_request" ||
    run.status !== "completed" ||
    !workflowFiles.some((file) => run.path === `.github/workflows/${file}`)
  )
    return;
  const repo = context.repo;
  const linked = run.pull_requests?.length
    ? run.pull_requests
    : await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
        ...repo,
        commit_sha: run.head_sha,
        per_page: 100,
      });
  const match = linked.find(
    (pr) => pr.head.sha === run.head_sha && pr.head.repo?.id === run.head_repository?.id,
  );
  if (!match) return;
  const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: match.number });
  if (
    pr.state !== "open" ||
    pr.head.sha !== run.head_sha ||
    pr.head.repo?.id !== run.head_repository?.id
  )
    return;

  async function isLatest() {
    const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
      ...repo,
      workflow_id: run.path.split("/").at(-1),
      event: "pull_request",
      head_sha: pr.head.sha,
      per_page: 100,
    });
    const current = latest(
      runs.filter(
        (item) =>
          item.head_sha === pr.head.sha &&
          item.head_repository?.id === pr.head.repo.id &&
          item.head_branch === pr.head.ref,
      ),
    );
    return (
      current?.id === run.id &&
      current.run_attempt === run.run_attempt &&
      current.status === "completed"
    );
  }
  if (!(await isLatest())) return;
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
    ...repo,
    run_id: run.id,
    per_page: 100,
  });
  const reports = [];
  for (const artifact of artifacts.filter(
    (item) =>
      !item.expired &&
      item.name.startsWith("web-api-") &&
      item.name.endsWith(`-${run.run_attempt}`),
  )) {
    try {
      reports.push({
        artifact,
        report: validateReport(await read(github, repo, artifact), pr, run),
      });
    } catch (error) {
      core.warning(`Could not read API report: ${error.message}`);
    }
  }
  if (new Set(reports.map(({ report }) => report.package)).size !== reports.length)
    throw new Error("Multiple API reports for the same package and workflow attempt");
  let skipped = false;
  if (!reports.length) {
    if (run.conclusion === "cancelled") return;
    // A missing report alone is not a pass: builds and artifact uploads can fail.
    // Only retire the old diff when path filtering succeeded and skipped Web.
    const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
      ...repo,
      run_id: run.id,
      attempt_number: run.run_attempt,
      per_page: 100,
    });
    const changes = jobs.find((job) => job.name === "Detect Changed Areas");
    const web = jobs.find((job) => job.name === "Web");
    if (
      changes?.conclusion !== "success" ||
      web?.conclusion !== "skipped" ||
      jobs.some((job) => job.name.startsWith("Web /"))
    )
      return;
    skipped = true;
    reports.push({
      report: { package: "@shopify/checkout-kit", headSha: pr.head.sha, changes: [] },
    });
  }
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...repo,
    issue_number: pr.number,
    per_page: 100,
  });
  for (const { artifact, report } of reports) {
    const existing = comments.find(
      (comment) =>
        comment.user?.login === "github-actions[bot]" &&
        comment.user.type === "Bot" &&
        comment.body?.startsWith(marker(report.package)),
    );
    // Stay quiet for passing contracts until there is a previous failure to resolve.
    if (!report.changes.length && !existing) continue;
    const runUrl = `${context.serverUrl || "https://github.com"}/${repo.owner}/${repo.repo}/actions/runs/${run.id}`;
    const body = skipped
      ? [
          marker(report.package),
          `### Public API — \`${report.package}\``,
          "",
          `The previous API report is outdated. CI skipped the Web check at \`${report.headSha.slice(0, 7)}\` because no relevant files changed.`,
          "",
          `[Check run](${runUrl})`,
          "",
          reviewNote,
        ].join("\n")
      : render(report, runUrl, `${runUrl}/artifacts/${artifact.id}`);
    const { data: current } = await github.rest.pulls.get({ ...repo, pull_number: pr.number });
    if (
      current.state !== "open" ||
      current.head.sha !== pr.head.sha ||
      current.base.sha !== pr.base.sha ||
      !(await isLatest())
    )
      return;
    if (existing?.body === body) continue;
    if (existing)
      await github.rest.issues.updateComment({ ...repo, comment_id: existing.id, body });
    else await github.rest.issues.createComment({ ...repo, issue_number: pr.number, body });
  }
}

module.exports = { marker, validateReport, render, publish, readArtifact };
