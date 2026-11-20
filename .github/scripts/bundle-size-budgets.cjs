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
      cdn: "CDN JavaScript",
      cdnGzip: "CDN JavaScript (gzip)",
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
        Object.hasOwn(budget, "name") &&
        (typeof budget.name !== "string" ||
          !budget.name.trim() ||
          budget.name.length > 100 ||
          /[\x00-\x1f\x7f]/.test(budget.name))
      )
        throw new Error(`Name must be 1–100 characters on one line for ${platform}.${metric}`);
      if (
        Object.hasOwn(budget, "file") &&
        (!["package", "cdn"].includes(budget.measurement) ||
          typeof budget.file !== "string" ||
          !budget.file ||
          /[\\\t\r\n*?[\]{}]/.test(budget.file) ||
          budget.file.split("/").some((part) => !part || part === "." || part === ".."))
      )
        throw new Error(
          `File must be an exact package- or CDN-relative path for ${platform}.${metric}`,
        );
      if (
        Object.keys(budget).some(
          (key) => !["measurement", "file", "name", "softKiB", "hardKiB"].includes(key),
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

function measurementNames(budgets) {
  validateBudgets(budgets);
  const names = {};
  for (const [platform, metrics] of Object.entries(budgets)) {
    for (const budget of Object.values(metrics)) {
      if (!budget.name) continue;
      const key = `${platforms[platform].label}\t${platforms[platform].measurements[budget.measurement]}\t${budget.file ?? ""}`;
      names[key] ??= escape(budget.name);
    }
  }
  return names;
}

function measurementKey(platform, measurement, file) {
  return `${platforms[platform].label}\t${platforms[platform].measurements[measurement]}${file ? `\t${file}` : ""}`;
}

function comparison(base, head, key) {
  return { before: base[key], after: head[key] };
}

function sizeCell(value) {
  if (!value) return "—";
  const { before, after } = value;
  if (after === undefined) return "unavailable";
  const current = `${(after / 1024).toFixed(2)} KiB`;
  if (before === undefined) return `${current} (Δ unavailable)`;
  const change = after - before;
  if (!change) return current;
  const delta = Math.abs(change) < 10.24 ? `${change} B` : `${(change / 1024).toFixed(2)} KiB`;
  return `${current} (${change > 0 ? "+" : ""}${delta})`;
}

function npmComponents(base, head) {
  const components = new Map();
  for (const snapshot of [base, head]) {
    for (const key of Object.keys(snapshot)) {
      const [platform, measurement, file] = key.split("\t");
      if (platform !== "Web" || measurement !== "npm tarball") continue;
      const match = /^dist\/chunks\/([^/]+)\.(js|mjs|cjs)$/.exec(file ?? "");
      if (!match) continue;
      const [, name, extension] = match;
      // Entry points distinguish components from internal shared chunks.
      if (Object.hasOwn(snapshot, measurementKey("web", "package", `dist/${name}.${extension}`)))
        components.set(key, name);
    }
  }
  const preferred = ["shopify-checkout", "shopify-universal-checkout", "shop-pay"];
  const rank = (name) => {
    const index = preferred.indexOf(name);
    return index < 0 ? preferred.length : index;
  };
  return [...components]
    .sort(([aKey, a], [bKey, b]) => rank(a) - rank(b) || aKey.localeCompare(bKey))
    .map(([key, name]) => ({
      name: escape(name),
      component: true,
      child: true,
      raw: comparison(base, head, key),
      selectors: [key],
      budgets: [],
    }));
}

function npmSupportingFiles(base, head, excluded) {
  const summarize = (snapshot) => {
    const groups = new Map();
    let available = false;
    for (const [key, bytes] of Object.entries(snapshot)) {
      const [platform, measurement, file] = key.split("\t");
      if (
        platform !== "Web" ||
        measurement !== "npm tarball" ||
        !/^dist\/.*\.(js|mjs|cjs)$/.test(file ?? "")
      )
        continue;
      available = true;
      // Components and explicitly budgeted files already have their own rows.
      if (excluded.has(key)) continue;
      const name = /^dist\/[^/]+$/.test(file) ? "Entry points" : "Shared runtime";
      groups.set(name, (groups.get(name) ?? 0) + bytes);
    }
    return { groups, available };
  };
  const before = summarize(base);
  const after = summarize(head);
  const value = (snapshot, name) =>
    snapshot.groups.get(name) ?? (snapshot.available ? 0 : undefined);
  return ["Shared runtime", "Entry points"]
    .filter((name) => before.groups.has(name) || after.groups.has(name))
    .map((name) => ({
      name,
      child: true,
      raw: { before: value(before, name), after: value(after, name) },
      selectors: [],
      budgets: [],
    }));
}

function cdnComponents(base, head, names) {
  const summarize = (measurements) => {
    const entries = new Map();
    const available = new Set();
    for (const [key, bytes] of Object.entries(measurements)) {
      const [platform, measurement, file] = key.split("\t");
      if (platform !== "Web" || !file) continue;
      const metric =
        measurement === "CDN JavaScript"
          ? "raw"
          : measurement === "CDN JavaScript (gzip)"
            ? "compressed"
            : undefined;
      if (!metric) continue;
      const component = /^assets\/([^/]+)\//.exec(file)?.[1];
      const loader = ["checkout-kit.js", "web-components.js"].includes(file);
      const id = loader ? "loader" : component ? `component:${component}` : `file:${file}`;
      if (!entries.has(id))
        entries.set(id, {
          name: escape(loader ? "Loader" : (component ?? file)),
          files: new Set(),
        });
      const entry = entries.get(id);
      const name = names[measurementKey("web", "cdn", file)];
      if (name) entry.name = name;
      entry.files.add(file);
      entry[metric] = (entry[metric] ?? 0) + bytes;
      available.add(metric);
    }
    return { entries, available };
  };
  const before = summarize(base);
  const after = summarize(head);
  const ids = [...new Set([...before.entries.keys(), ...after.entries.keys()])].sort();
  const preferred = [
    "loader",
    "component:shopify-checkout",
    "component:shopify-universal-checkout",
    "component:shop-pay",
  ];
  const ordered = [
    ...preferred.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !preferred.includes(id)),
  ];
  const value = (snapshot, id, metric) =>
    snapshot.entries.has(id)
      ? snapshot.entries.get(id)[metric]
      : snapshot.available.has(metric)
        ? 0
        : undefined;
  return ordered.map((id) => {
    const entry = after.entries.get(id) ?? before.entries.get(id);
    const files = new Set([
      ...(before.entries.get(id)?.files ?? []),
      ...(after.entries.get(id)?.files ?? []),
    ]);
    const pair = (metric) => {
      const previous = value(before, id, metric);
      const current = value(after, id, metric);
      return previous === undefined && current === undefined
        ? undefined
        : { before: previous, after: current };
    };
    return {
      name: entry.name,
      component: id.startsWith("component:"),
      child: true,
      raw: pair("raw"),
      compressed: pair("compressed"),
      // A file budget can share a component row only when it measures exactly
      // that row, including on the base revision. Never hide a missing old hash.
      selectors: files.size === 1 ? [measurementKey("web", "cdn", [...files][0])] : [],
      budgets: [],
    };
  });
}

function summaryEntries(report, rows) {
  const { base, head } = report;
  const names = measurementNames(report.budgets);
  const entries = [];
  const used = new Set();
  const pair = (key) =>
    Object.hasOwn(base, key) || Object.hasOwn(head, key) ? comparison(base, head, key) : undefined;
  const attach = (entry) => {
    entry.budgets = rows.filter(
      (row) =>
        !used.has(row.key) &&
        entry.selectors.includes(measurementKey(row.platform, row.measurement, row.file)),
    );
    for (const row of entry.budgets) {
      used.add(row.key);
      const column = row.file || ["bundle", "cdn"].includes(row.measurement) ? "raw" : "compressed";
      entry[column] ??= { before: row.before, after: row.after };
    }
    if (entry.budgets[0]?.name) entry.name = escape(entry.budgets[0].name);
    if (entry.raw || entry.compressed || entry.budgets.length) entries.push(entry);
  };
  const total = (platform, measurement, name, gzip) => {
    const key = measurementKey(platform, measurement);
    const compressedKey = measurementKey(platform, gzip ?? measurement);
    const raw = measurement !== "package";
    attach({
      name,
      raw: raw ? pair(key) : undefined,
      compressed: pair(compressedKey),
      selectors: raw ? [key, compressedKey] : [key],
      budgets: [],
    });
  };
  const files = (platform, measurement, predicate = () => true) => {
    for (const row of rows) {
      if (
        used.has(row.key) ||
        row.platform !== platform ||
        row.measurement !== measurement ||
        !row.file ||
        !predicate(row.file)
      )
        continue;
      const key = measurementKey(platform, measurement, row.file);
      attach({
        name: escape(row.name ?? row.file),
        child: true,
        raw: comparison(base, head, key),
        selectors: [key],
        budgets: [],
      });
    }
  };
  if (report.measuredPlatforms.includes("web")) {
    total("web", "bundle", "Web (NPM)", "bundleGzip");
    for (const entry of npmComponents(base, head)) attach(entry);
    const javascript = (file) => /\.(?:js|mjs|cjs)$/.test(file);
    files("web", "package", javascript);
    const displayed = new Set(entries.flatMap((entry) => entry.selectors));
    for (const entry of npmSupportingFiles(base, head, displayed)) attach(entry);
    total("web", "package", "npm package");
    files("web", "package", (file) => !javascript(file));
    total("web", "cdn", "Web (CDN)", "cdnGzip");
    for (const entry of cdnComponents(base, head, names)) attach(entry);
    files("web", "cdn");
  }
  for (const platform of ["react-native", "android"]) {
    if (!report.measuredPlatforms.includes(platform)) continue;
    total(platform, "package", platform === "android" ? "Android AAR" : "React Native package");
    files(platform, "package");
  }
  return entries;
}

function budgetIndicator(entry) {
  // Show absolute threshold crossings even when accepted or unchanged.
  if (entry.budgets.some((row) => row.after > row.hardKiB * 1024)) return "🛑 ";
  if (entry.budgets.some((row) => row.after > row.softKiB * 1024)) return "⚠️ ";
  return "";
}

function budgetCell(entry) {
  const labels = {
    "no-growth": "➖ Above limit; no increase",
    accepted: "✅ Accepted",
    soft: "⚠️ Acceptance required",
    hard: "🛑 Budget change required",
    missing: "⚠️ Measurement missing",
  };
  return (
    entry.budgets
      .map((row) => {
        const gzip = ["bundleGzip", "cdnGzip"].includes(row.measurement) ? "gzip " : "";
        const name = entry.budgets.length > 1 ? `${escape(row.name ?? row.metric)}: ` : "";
        return `${name}${gzip}${row.softKiB} KiB / ${row.hardKiB} KiB${row.status === "within" ? "" : `<br>${entry.reviewOnly && row.status === "soft" ? "⚠️ Budget change required" : labels[row.status]}`}`;
      })
      .join("<br>") || "—"
  );
}

function renderDetails(report, rows, extraDetails = []) {
  const names = measurementNames(report.budgets);
  const lines = ["<details><summary>Measurement details</summary>", ""];
  const groups = new Map();
  for (const key of new Set([...Object.keys(report.base), ...Object.keys(report.head)])) {
    const [platform, artifact, file] = key.split("\t");
    if (!file || artifact === "CDN JavaScript (gzip)") continue;
    const id = `${platform}\t${artifact}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push({ key, file });
  }
  const bytes = (value) => (value === undefined ? "—" : `${(value / 1024).toFixed(2)} KiB`);
  for (const [group, files] of groups) {
    const [platform, artifact] = group.split("\t");
    const cdn = artifact === "CDN JavaScript";
    lines.push(
      `### ${escape(platform)} ${cdn ? "CDN" : "package"} files`,
      "",
      "Uncompressed sizes in KiB. These do not sum to the compressed package size.",
      "",
      "| File | Base | Head | Change |",
      "| --- | ---: | ---: | ---: |",
    );
    files.sort(
      (a, b) =>
        Math.max(report.base[b.key] ?? 0, report.head[b.key] ?? 0) -
          Math.max(report.base[a.key] ?? 0, report.head[a.key] ?? 0) ||
        a.file.localeCompare(b.file),
    );
    for (const { key, file } of files.slice(0, 20)) {
      const before = report.base[key];
      const after = report.head[key];
      const change = (after ?? 0) - (before ?? 0);
      const delta = !change
        ? "—"
        : `${change > 0 ? "+" : ""}${Math.abs(change) < 10.24 ? `${change} B` : `${(change / 1024).toFixed(2)} KiB`}`;
      lines.push(
        `| ${names[key] ?? escape(file)} | ${bytes(before)} | ${bytes(after)} | ${delta} |`,
      );
    }
    if (files.length > 20) lines.push(`| _…and ${files.length - 20} smaller files_ | | | |`);
    lines.push("");
  }
  const accepted = rows.filter((row) => row.status === "accepted");
  if (accepted.length) {
    lines.push("### Accepted increases", "");
    for (const row of accepted)
      lines.push(
        `- ${escape(row.name ?? row.key)}: accepted by @${escape(row.acceptance.actor)} — ${escape(row.acceptance.reason)} ([comment](${row.acceptance.url})).`,
      );
    lines.push("");
  }
  lines.push(
    ...extraDetails,
    "### How sizes are measured",
    "",
    "Entry names show ⚠️ above a soft limit and 🛑 above a hard limit, using exact bytes. These indicators remain for accepted or unchanged sizes above a limit; the budget status explains whether action is required.",
    "",
    "Sizes compare the PR base and head. JavaScript totals sum shipped `.js`, `.mjs`, and `.cjs` files, excluding source maps and declarations. npm JavaScript comes from `dist/`; CDN JavaScript comes from the separate `build:cdn` output in `dist-cdn/`. gzip sizes sum files compressed individually with `gzip -n -9`.",
    "",
    "npm component rows show each component’s implementation chunk. Shared runtime groups the remaining internal JavaScript; Entry points groups the top-level JavaScript files. Files with individual budgets appear separately and are excluded from these groups, so each file contributes once to the npm total. Components appear even without a configured budget; gzip sizes for individual npm rows are not collected.",
    "",
    "The CDN loader is the initial download. Components load on demand and include their bundled dependencies; the CDN total includes every component. Stable component names preserve comparisons across filename-hash changes.",
    "",
    "Package sizes cover the complete published archive, including source maps, declarations, and documentation. npm packages use gzip; Android AARs use ZIP. These are not final app binary sizes. Missing measurements are shown as unavailable; a dash means that measurement is not reported.",
    "",
    "</details>",
  );
  return lines.join("\n");
}

function render(report, state, notes = [], additional = {}) {
  const primaryRows = evaluate(report, state?.acceptances);
  const rows = [...primaryRows, ...(additional.rows ?? [])];
  const entries = [...summaryEntries(report, primaryRows), ...(additional.entries ?? [])];
  const failures = rows.filter((row) => ["soft", "hard", "missing"].includes(row.status));
  const values = [
    ...entries.flatMap((entry) => [entry.raw, entry.compressed].filter(Boolean)),
    // Include budget comparisons that are shown only in measurement details.
    ...rows.map(({ before, after }) => ({ before, after })),
  ];
  for (const key of new Set([...Object.keys(report.base), ...Object.keys(report.head)])) {
    const [, artifact, file] = key.split("\t");
    if (file && !["CDN JavaScript", "CDN JavaScript (gzip)"].includes(artifact)) {
      values.push(comparison(report.base, report.head, key));
    }
  }
  const unchanged =
    values.length &&
    values.every(
      ({ before, after }) => before !== undefined && after !== undefined && before === after,
    );
  const status = !rows.length
    ? "➖ No configured budgets affected"
    : failures.length
      ? `⚠️ ${failures.length} of ${rows.length} budgets need attention`
      : `✅ All ${rows.length} budgets pass`;
  const lines = [
    marker,
    "## Bundle sizes",
    "",
    `**${status}${unchanged ? " · No size changes" : ""}**`,
    "",
    "Nonzero changes appear beside each size.",
    "",
    "| Bundle / artifact | Raw | Gzip | Budget (soft/hard) |",
    "| --- | ---: | ---: | --- |",
  ];
  for (const entry of entries) {
    const name = entry.component ? `&lt;${entry.name}&gt;` : entry.name;
    const cells = [
      `${entry.child ? "&nbsp;&nbsp;↳ " : ""}${budgetIndicator(entry)}${name}`,
      sizeCell(entry.raw),
      sizeCell(entry.compressed),
      budgetCell(entry),
    ];
    lines.push(`| ${cells.map((cell) => (entry.child ? cell : `**${cell}**`)).join(" | ")} |`);
  }
  if (!entries.length) lines.push("| — | — | — | — |");
  lines.push(
    "",
    "Compressed sizes use gzip (Android: ZIP). Limits apply to raw bundles and files, or compressed packages; gzip limits are marked.",
  );
  const hardPlatforms = [
    ...new Set(
      primaryRows
        .filter((row) => row.status === "hard")
        .map((row) => platforms[row.platform].label),
    ),
  ];
  if (hardPlatforms.length) {
    lines.push(
      "",
      "### Hard limit exceeded",
      "",
      `**${hardPlatforms.join(", ")}**: reduce the package or bundle size, or submit a reviewed change to \`.ci/bundle-size-budgets.json\`.`,
      "",
      "`/accept-size` cannot override a hard limit.",
    );
  }
  const softPlatforms = [
    ...new Set(primaryRows.filter((row) => row.status === "soft").map((row) => row.platform)),
  ];
  if (softPlatforms.length) {
    lines.push(
      "",
      "### Accept a size increase",
      "",
      "Contributors can accept current soft-budget breaches with a reason:",
      "",
      "```text",
      ...softPlatforms.map(
        (platform) => `/accept-size ${platform} Explain why this increase is necessary.`,
      ),
      "```",
      "",
      "- **Permission:** Repository write access is required.",
      "- **When:** Post a new comment after this report is ready for the latest commit. Edited comments are not accepted.",
      "- **Platforms:** Use one command per platform. Several commands can share a comment on separate lines.",
      "- **Scope:** Acceptance covers each current soft-budget breach up to its recorded size. Further growth or a newly exceeded metric needs fresh acceptance.",
    );
  }
  if (notes.length) lines.push("");
  for (const note of notes) lines.push(`- ${escape(note)}`);
  lines.push("", renderDetails(report, primaryRows, additional.details));
  if (state)
    lines.push(
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
  measurementNames,
  evaluate,
  parseCommands,
  accept,
  readState,
  render,
  conclusion,
  summaryEntries,
  escape,
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
