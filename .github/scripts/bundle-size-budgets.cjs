const fs = require("node:fs");

// Measurement adapters map the existing artifact report to stable config keys.
// Policy and acceptance handling below do not depend on a particular platform.
const platforms = {
  web: {
    label: "Web",
    metrics: {
      javascript: "JavaScript",
      javascriptGzip: "JavaScript (gzip)",
      npmTarball: "npm tarball",
    },
  },
  "react-native": { label: "React Native", metrics: { npmTarball: "npm tarball" } },
  android: { label: "Android", metrics: { aar: "release AAR" } },
};
const marker = "<!-- checkout-kit-package-size -->";
const statePattern = /<!-- bundle-size-state:([A-Za-z0-9+/=]+) -->/;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateBudgets(budgets) {
  if (!object(budgets)) throw new Error("Budgets must be an object");
  for (const [platform, metrics] of Object.entries(budgets)) {
    if (!Object.hasOwn(platforms, platform) || !object(metrics))
      throw new Error(`Unknown platform: ${platform}`);
    for (const [metric, budget] of Object.entries(metrics)) {
      if (!Object.hasOwn(platforms[platform].metrics, metric))
        throw new Error(`Unknown metric: ${platform}.${metric}`);
      if (
        !object(budget) ||
        Object.keys(budget).sort().join(",") !== "hardKiB,softKiB" ||
        !Number.isFinite(budget.softKiB) ||
        !Number.isFinite(budget.hardKiB) ||
        budget.softKiB <= 0 ||
        budget.hardKiB < budget.softKiB ||
        budget.hardKiB * 1024 > Number.MAX_SAFE_INTEGER
      ) {
        throw new Error(`Invalid budget for ${platform}.${metric}: require 0 < softKiB <= hardKiB`);
      }
    }
  }
  return budgets;
}

function measurements(tsv) {
  const values = {};
  for (const line of tsv.split("\n").filter(Boolean)) {
    const columns = line.split("\t");
    if (columns.length >= 4) continue; // Per-file details are informational.
    const [platform, metric, bytes] = columns;
    if (columns.length !== 3 || !/^\d+$/.test(bytes) || !Number.isSafeInteger(Number(bytes))) {
      throw new Error("Invalid measurement row");
    }
    const key = `${platform}\t${metric}`;
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate measurement: ${key}`);
    values[key] = Number(bytes);
  }
  return values;
}

function evaluate({ budgets, base, head, measuredPlatforms }, acceptances = {}) {
  validateBudgets(budgets);
  if (
    !Array.isArray(measuredPlatforms) ||
    measuredPlatforms.some((p) => !Object.hasOwn(platforms, p))
  ) {
    throw new Error("Invalid measured platforms");
  }
  const rows = [];
  for (const [platform, metrics] of Object.entries(budgets)) {
    if (!measuredPlatforms.includes(platform)) continue;
    for (const [metric, budget] of Object.entries(metrics)) {
      const key = `${platform}.${metric}`;
      const measurementKey = `${platforms[platform].label}\t${platforms[platform].metrics[metric]}`;
      const before = base[measurementKey];
      const after = head[measurementKey];
      const acceptance = acceptances[key];
      let status;
      if (!Number.isSafeInteger(after) || after <= 0) status = "missing";
      else if (after <= budget.softKiB * 1024) status = "within";
      else if (before !== undefined && after <= before) status = "no-growth";
      else if (after > budget.hardKiB * 1024) status = "hard";
      else if (acceptance && after <= acceptance.bytes) status = "accepted";
      else status = "soft";
      rows.push({ key, platform, metric, before, after, ...budget, status, acceptance });
    }
  }
  return rows;
}

function parseCommands(body) {
  const commands = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("/accept-size")) continue;
    const match = /^\/accept-size ([a-z][a-z-]*) (\S.*)$/.exec(line);
    if (!match || !Object.hasOwn(platforms, match[1]) || match[2].trim().length > 1000) {
      throw new Error("Use /accept-size <platform> <reason> (reason: 1–1000 characters)");
    }
    commands.push({ platform: match[1], reason: match[2].trim() });
  }
  return commands;
}

function accept(rows, commands, actor, comment, previous = {}) {
  const accepted = { ...previous };
  const notes = [];
  for (const { platform, reason } of commands) {
    const eligible = rows.filter((row) => row.platform === platform && row.status === "soft");
    for (const row of eligible) {
      accepted[row.key] = {
        bytes: row.after,
        actor,
        reason,
        commentId: comment.id,
        url: comment.html_url,
      };
    }
    const hard = rows.some((row) => row.platform === platform && row.status === "hard");
    notes.push(
      hard
        ? `${platform}: hard budget exceeded; edit the budget file for review.`
        : eligible.length
          ? `${platform}: accepted ${eligible.length} exceeded metric(s).`
          : `${platform}: no soft-budget breaches to accept.`,
    );
  }
  return { accepted, notes };
}

function readState(body) {
  const match = body?.match(statePattern);
  if (!match) return null;
  const state = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
  if (
    state.version !== 1 ||
    !object(state.acceptances) ||
    !Array.isArray(state.processedComments)
  ) {
    throw new Error("Invalid saved budget report");
  }
  return state;
}

function escape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/\r?\n/g, " ")
    .replace(/([\\`*_[\]])/g, "\\$1");
}

function kib(bytes) {
  return bytes === undefined ? "unavailable" : `${(bytes / 1024).toFixed(2)} KiB`;
}

function render(rows, state, packageComment, notes = []) {
  const labels = {
    within: "Within budget",
    "no-growth": "Above budget; no increase",
    soft: "Acceptance required",
    hard: "Budget change required",
    missing: "Measurement missing",
  };
  const lines = [
    marker,
    "## Size budgets",
    "",
    `Measured head: \`${state.headSha}\`; base: \`${state.baseSha}\`.`,
    "",
    "| Platform / metric | Base | Head | Delta | Soft | Hard | Result |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const row of rows) {
    const status =
      row.status === "accepted"
        ? `Accepted by @${escape(row.acceptance.actor)}: ${escape(row.acceptance.reason)} ([comment](${row.acceptance.url}))`
        : labels[row.status];
    const delta =
      row.before === undefined || row.after === undefined
        ? "unavailable"
        : `${row.after > row.before ? "+" : ""}${kib(row.after - row.before)}`;
    lines.push(
      `| ${row.platform} / ${row.metric} | ${kib(row.before)} | ${kib(row.after)} | ${delta} | ${row.softKiB} KiB | ${row.hardKiB} KiB | ${status} |`,
    );
  }
  if (!rows.length) lines.push("| — | — | — | — | — | — | No configured budgets affected |");
  lines.push(
    "",
    "Repository writers, including the PR author, can accept current soft-budget breaches with a reason:",
    "",
    "```text",
    "/accept-size web Explain why this increase is necessary.",
    "```",
    "",
    "Use one command per platform; several lines can share a comment. Post after this report is ready for the current head. Commands in edited comments are not accepted.",
    "",
    "Acceptance applies to each currently exceeded metric up to its recorded size. Further growth or a newly exceeded metric needs fresh acceptance. Hard-budget increases require a reviewed change to `.ci/bundle-size-budgets.json`.",
    "",
  );
  for (const note of notes) lines.push(`- ${escape(note)}`);
  lines.push(
    "",
    packageComment.replace(/<!--[\s\S]*?-->/g, ""),
    "",
    `<!-- bundle-size-state:${Buffer.from(JSON.stringify(state)).toString("base64")} -->`,
  );
  const body = lines.join("\n");
  if (body.length > 65000) throw new Error("Size report exceeds GitHub comment limit");
  return body;
}

function conclusion(rows) {
  return rows.some((row) => ["soft", "hard", "missing"].includes(row.status))
    ? "failure"
    : "success";
}

module.exports = {
  platforms,
  marker,
  validateBudgets,
  measurements,
  evaluate,
  parseCommands,
  accept,
  readState,
  render,
  conclusion,
};

if (require.main === module) {
  const [basePath, headPath, budgetsPath, outputPath] = process.argv.slice(2);
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const report = {
    version: 1,
    pr: event.pull_request.number,
    headSha: event.pull_request.head.sha,
    baseSha: process.env.BASE_SHA || event.pull_request.base.sha,
    budgets: validateBudgets(JSON.parse(fs.readFileSync(budgetsPath, "utf8"))),
    base: measurements(fs.readFileSync(basePath, "utf8")),
    head: measurements(fs.readFileSync(headPath, "utf8")),
    measuredPlatforms: Object.entries({
      web: process.env.MEASURE_WEB,
      "react-native": process.env.MEASURE_REACT_NATIVE,
      android: process.env.MEASURE_ANDROID,
    })
      .filter(([, enabled]) => enabled === "true")
      .map(([platform]) => platform),
  };
  evaluate(report); // Reject malformed configuration before publishing an artifact.
  fs.writeFileSync(outputPath, JSON.stringify(report));
}
