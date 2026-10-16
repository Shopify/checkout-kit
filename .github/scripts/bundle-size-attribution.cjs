const fs = require("node:fs");
const { SourceMap } = require("node:module");
const path = require("node:path");

// Attributes every byte of shipped, minified JavaScript to the npm package
// whose source produced it, using the bundle's source maps. Bytes in mapped
// segments belong to the package that owns the original source file (nearest
// package.json). Unmapped bytes (bundler glue such as import/export wiring)
// stay unattributed. A JavaScript file without a source map belongs to the
// package that owns its output location.

const UNATTRIBUTED = "(unattributed)";

// Returns UTF-8 byte counts per original source path (null for unmapped) in one file.
function attributeFile(code, payload) {
  const map = new SourceMap(payload);
  const counts = new Map();
  const add = (source, text) => {
    counts.set(source, (counts.get(source) ?? 0) + Buffer.byteLength(text));
  };
  // Source maps use zero-based lines and UTF-16 columns. Each column belongs to the
  // nearest mapping at or before it on the same line. Columns before a line's first
  // mapping, and mappings without a source, are unmapped.
  const sourceAt = (line, column) => {
    const entry = map.findEntry(line, column);
    return entry.generatedLine === line ? (entry.originalSource ?? null) : null;
  };
  const lines = code.split("\n");
  lines.forEach((text, line) => {
    // Count runs of columns with the same source, so a surrogate pair is never split.
    let start = 0;
    for (let column = 1; column <= text.length; column++) {
      if (column < text.length && sourceAt(line, column) === sourceAt(line, start)) continue;
      add(sourceAt(line, start), text.slice(start, column));
      start = column;
    }
    if (line < lines.length - 1) add(null, "\n");
  });
  return counts;
}

function packageOwner(file, boundary, cache) {
  let dir = path.dirname(file);
  const stop = path.resolve(boundary);
  while (dir === stop || dir.startsWith(stop + path.sep)) {
    if (cache.has(dir)) return cache.get(dir);
    const manifest = path.join(dir, "package.json");
    if (fs.existsSync(manifest)) {
      const name = JSON.parse(fs.readFileSync(manifest, "utf8")).name;
      const owner = typeof name === "string" && name ? name : UNATTRIBUTED;
      cache.set(dir, owner);
      return owner;
    }
    dir = path.dirname(dir);
  }
  return UNATTRIBUTED;
}

// shippedDir: JavaScript as published (for example an extracted npm tarball's dist/).
// buildDir: where those files were built, so relative map sources resolve to the repository.
// repoRoot: package lookup never leaves this directory.
function attribute({ shippedDir, buildDir, repoRoot }) {
  const totals = {};
  const cache = new Map();
  let bytes = 0;
  const add = (owner, count) => {
    totals[owner] = (totals[owner] ?? 0) + count;
  };
  const files = fs
    .readdirSync(shippedDir, { recursive: true })
    .filter((rel) => /\.(m|c)?js$/.test(rel))
    .sort();
  for (const rel of files) {
    const code = fs.readFileSync(path.join(shippedDir, rel), "utf8");
    const size = Buffer.byteLength(code);
    bytes += size;
    const built = path.join(buildDir, rel);
    const mapPath = path.join(shippedDir, `${rel}.map`);
    if (!fs.existsSync(mapPath)) {
      add(packageOwner(built, repoRoot, cache), size);
      continue;
    }
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    const sourceRoot = path.resolve(path.dirname(built), map.sourceRoot ?? "");
    for (const [source, count] of attributeFile(code, map)) {
      const owner =
        source === null
          ? UNATTRIBUTED
          : packageOwner(path.resolve(sourceRoot, source.replace(/[?#].*$/, "")), repoRoot, cache);
      add(owner, count);
    }
  }
  const attributed = Object.values(totals).reduce((sum, count) => sum + count, 0);
  if (attributed !== bytes) throw new Error(`Attributed ${attributed} of ${bytes} bytes`);
  return { bytes, totals };
}

// Measurement rows consumed by measure-package-size and bundle-size-budgets.cjs.
function rows(platform, { totals }) {
  return Object.entries(totals)
    .sort(
      ([a, x], [b, y]) => (a === UNATTRIBUTED) - (b === UNATTRIBUTED) || y - x || (a < b ? -1 : 1),
    )
    .map(([owner, count]) =>
      owner === UNATTRIBUTED
        ? `${platform}\tJavaScript unattributed\t${count}`
        : `${platform}\tJavaScript package ${owner}\t${count}`,
    );
}

module.exports = { UNATTRIBUTED, attributeFile, attribute, rows };

if (require.main === module) {
  const [platform, shippedDir, buildDir, repoRoot] = process.argv.slice(2);
  if (!platform || !shippedDir || !buildDir || !repoRoot) {
    console.error(
      "Usage: bundle-size-attribution.cjs <platform> <shipped-dir> <build-dir> <repo-root>",
    );
    process.exit(1);
  }
  for (const row of rows(platform, attribute({ shippedDir, buildDir, repoRoot }))) console.log(row);
}
