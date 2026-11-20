import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Preserve declarations and documentation; omit only generated bundler markers.
export function normalizeDeclaration(source) {
  source = source.replace(/\r\n/g, "\n");
  const file = ts.createSourceFile("api.d.ts", source, ts.ScriptTarget.Latest);
  // Look only at top-level comment trivia so marker-like text inside literal
  // types or documentation can never hide an interface change.
  const markers = [...file.statements, file.endOfFileToken].flatMap((node) =>
    (ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []).filter((comment) =>
      /^\/\/#(?:region\b.*|endregion\b.*| sourceMappingURL=.*)$/.test(
        source.slice(comment.pos, comment.end),
      ),
    ),
  );
  for (const { pos, end } of markers.toReversed()) {
    source = source.slice(0, pos) + source.slice(end + (source[end] === "\n" ? 1 : 0));
  }
  return source;
}

async function declarations(directory, prefix = "") {
  const files = {};
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, await declarations(directory, name));
    else if (/\.d\.[cm]?ts$/.test(name)) {
      files[name] = normalizeDeclaration(await readFile(join(directory, name), "utf8"));
    }
  }
  return files;
}

async function writeFiles(directory, files) {
  await mkdir(directory, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(directory, name)), { recursive: true });
    await writeFile(join(directory, name), content);
  }
}

export async function checkApi(root) {
  // Each invocation replaces its own generated output, never the approved api/.
  const output = join(root, "build/api");
  const reportPath = join(root, "build/api-report.json");
  await rm(output, { recursive: true, force: true });
  await rm(reportPath, { force: true });
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const proposed = await declarations(join(root, "dist"));
  if (!Object.keys(proposed).length)
    throw new Error("No declarations found. Build the package first.");
  if (!manifest.exports) throw new Error("The package must declare its public exports.");
  proposed["exports.json"] = `${JSON.stringify(manifest.exports, null, 2)}\n`;
  await writeFiles(output, proposed);

  let approved = {};
  try {
    approved = await declarations(join(root, "api"));
    approved["exports.json"] = await readFile(join(root, "api/exports.json"), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const temporary = await mkdtemp(join(tmpdir(), "checkout-kit-api-"));
  const changes = [];
  try {
    await writeFiles(join(temporary, "approved"), approved);
    await writeFiles(join(temporary, "proposed"), proposed);
    const names = [...new Set([...Object.keys(approved), ...Object.keys(proposed)])].toSorted();
    for (const name of names) {
      if (approved[name] === proposed[name]) continue;
      const before = Object.hasOwn(approved, name);
      const after = Object.hasOwn(proposed, name);
      const diff = spawnSync(
        "git",
        [
          "diff",
          "--no-index",
          "--no-ext-diff",
          "--no-textconv",
          "--no-color",
          "--no-prefix",
          "--",
          before ? `approved/${name}` : "/dev/null",
          after ? `proposed/${name}` : "/dev/null",
        ],
        { cwd: temporary, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
      );
      if (diff.error) throw diff.error;
      if (diff.status !== 1) throw new Error(diff.stderr || "Could not compare API declarations.");
      changes.push({
        path: name,
        status: !before ? "added" : !after ? "removed" : "changed",
        diff: diff.stdout,
      });
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }

  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"))
    : {};
  const report = {
    version: 1,
    package: manifest.name,
    pr: event.pull_request?.number ?? null,
    headSha: event.pull_request?.head.sha ?? process.env.GITHUB_SHA ?? null,
    baseSha: event.pull_request?.base.sha ?? null,
    runId: Number(process.env.GITHUB_RUN_ID) || null,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT) || null,
    changes,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2)
    throw new Error("Usage: node check-api.mjs (from the package directory)");
  const report = await checkApi(process.cwd());
  if (report.changes.length) {
    process.stderr.write(
      `${report.package}: the built API differs from the approved api/ contract.\n`,
    );
    for (const change of report.changes) process.stderr.write(change.diff);
    process.stderr.write(
      "Review the proposed declarations in build/api/. Do not update api/ without explicit approval.\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(`${report.package}: public API matches api/.\n`);
  }
}
