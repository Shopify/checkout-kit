const fs = require("node:fs");

// Measurement adapters map the existing artifact report to explicit selectors.
// Policy and acceptance handling below do not depend on a particular platform.
const platforms = {
  web: {
    label: "Web",
    packageLabel: "npm package (gzip)",
    measurements: {
      bundle: "JavaScript",
      bundleGzip: "JavaScript (gzip)",
      package: "npm tarball",
    },
  },
  "react-native": {
    label: "React Native",
    packageLabel: "npm package (gzip)",
    measurements: { package: "npm tarball" },
  },
  android: {
    label: "Android",
    packageLabel: "AAR package (ZIP)",
    measurements: { package: "release AAR" },
  },
  swift: {
    label: "Swift",
    measurements: {
      core: "core incremental app",
      accelerated: "accelerated incremental app",
    },
    measurementLabels: {
      core: "Core Checkout Kit incremental app size (uncompressed)",
      accelerated: "Checkout Kit with Accelerated Checkouts incremental app size (uncompressed)",
    },
  },
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
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(metric))
        throw new Error(`Invalid budget name: ${platform}.${metric}`);
      if (
        !object(budget) ||
        typeof budget.measurement !== "string" ||
        !Object.hasOwn(platforms[platform].measurements, budget.measurement)
      )
        throw new Error(`Unknown measurement for ${platform}.${metric}`);
      if (
        Object.hasOwn(budget, "file") &&
        (budget.measurement !== "package" ||
          typeof budget.file !== "string" ||
          !budget.file ||
          /[\\\t\r\n*?[\]{}]/.test(budget.file) ||
          budget.file.split("/").some((part) => !part || part === "." || part === ".."))
      )
        throw new Error(`File must be an exact package-relative path for ${platform}.${metric}`);
      if (
        Object.keys(budget).some(
          (key) => !["measurement", "file", "softKiB", "hardKiB"].includes(key),
        ) ||
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
    const [platform, metric, bytes, file] = columns;
    if (
      ![3, 4].includes(columns.length) ||
      (columns.length === 4 && !file) ||
      !/^\d+$/.test(bytes) ||
      !Number.isSafeInteger(Number(bytes))
    ) {
      throw new Error("Invalid measurement row");
    }
    const key = `${platform}\t${metric}${file ? `\t${file}` : ""}`;
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
      const measurementKey = `${platforms[platform].label}\t${platforms[platform].measurements[budget.measurement]}${budget.file ? `\t${budget.file}` : ""}`;
      const before = base[measurementKey];
      const after = head[measurementKey];
      const acceptance = acceptances[key];
      let status;
      if (!Number.isSafeInteger(after) || after < 0 || (after === 0 && !budget.file))
        status = "missing";
      else if (after <= budget.softKiB * 1024) status = "within";
      else if (before !== undefined && after <= before) status = "no-growth";
      else if (after > budget.hardKiB * 1024) status = "hard";
      else if (
        acceptance &&
        acceptance.measurement === budget.measurement &&
        acceptance.file === budget.file &&
        after <= acceptance.bytes
      )
        status = "accepted";
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
        measurement: row.measurement,
        ...(row.file ? { file: row.file } : {}),
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
    within: "✅ Within budget",
    "no-growth": "➖ Above budget; no increase",
    soft: "⚠️ Acceptance required",
    hard: "❌ Budget change required",
    missing: "⚠️ Measurement missing",
  };
  const lines = [
    marker,
    "## Bundle Size Budgets",
    "",
    "| Budget | Size | Limits | Result |",
    "| --- | ---: | --- | --- |",
  ];
  for (const row of rows) {
    const status =
      row.status === "accepted"
        ? `✅ Accepted by @${escape(row.acceptance.actor)}: ${escape(row.acceptance.reason)} ([comment](${row.acceptance.url}))`
        : labels[row.status];
    const change = row.after - row.before;
    const delta =
      row.before === undefined || row.after === undefined
        ? "unavailable"
        : `${change > 0 ? "+" : ""}${Math.abs(change) < 1024 ? `${change} B` : kib(change)}`;
    const size =
      row.after === undefined
        ? "unavailable"
        : `${kib(row.after)} (${delta === "unavailable" ? "change unavailable" : delta})`;
    const scope = row.file
      ? `${escape(row.file)} (uncompressed)`
      : platforms[row.platform].measurementLabels?.[row.measurement] ?? {
          bundle: "JavaScript (uncompressed)",
          bundleGzip: "JavaScript (gzip)",
          package: platforms[row.platform].packageLabel,
        }[row.measurement];
    const named = rows.some(
      (other) =>
        other.platform === row.platform &&
        other.measurement === row.measurement &&
        other.file === row.file &&
        other.metric !== row.metric,
    );
    const budget = `${platforms[row.platform].label} ${scope}${named ? ` / ${escape(row.metric)}` : ""}`;
    lines.push(
      `| ${budget} | ${size} | ${row.softKiB} KiB soft / ${row.hardKiB} KiB hard | ${status} |`,
    );
  }
  if (!rows.length) lines.push("| — | — | — | ➖ No configured budgets affected |");
  if (rows.some(({ status }) => status === "soft" || status === "hard")) {
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
    );
  }
  if (notes.length) lines.push("");
  for (const note of notes) lines.push(`- ${escape(note)}`);
  lines.push(
    "",
    packageComment.replace(/<!--[\s\S]*?-->/g, "").trim(),
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
      swift: process.env.MEASURE_SWIFT,
    })
      .filter(([, enabled]) => enabled === "true")
      .map(([platform]) => platform),
  };
  evaluate(report); // Reject malformed configuration before publishing an artifact.
  fs.writeFileSync(outputPath, JSON.stringify(report));
}
