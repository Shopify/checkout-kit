const fs = require("node:fs");
const path = require("node:path");

// Attributes every byte of shipped, minified JavaScript to the npm package
// whose source produced it, using the bundle's source maps. Bytes in mapped
// segments belong to the package that owns the original source file (nearest
// package.json). Unmapped bytes (bundler glue such as import/export wiring)
// stay unattributed. A JavaScript file without a source map belongs to the
// package that owns its output location.

const UNATTRIBUTED = "(unattributed)";
const BASE64 = Object.fromEntries(
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].map((c, i) => [c, i]),
);

function decodeSegment(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const char of segment) {
    const digit = BASE64[char];
    if (digit === undefined) throw new Error(`Invalid source map mapping: ${segment}`);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    values.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }
  if (shift !== 0) throw new Error(`Truncated source map mapping: ${segment}`);
  return values;
}

// Returns byte counts per source index (null for unmapped) for one file.
function attributeFile(code, map) {
  const counts = new Map();
  const add = (source, bytes) => {
    if (bytes > 0) counts.set(source, (counts.get(source) ?? 0) + bytes);
  };
  const lines = code.split("\n");
  const mappingLines = map.mappings.split(";");
  let source = 0;
  lines.forEach((line, index) => {
    const newline = index < lines.length - 1 ? 1 : 0;
    const segments = [];
    let column = 0;
    for (const raw of (mappingLines[index] ?? "").split(",")) {
      if (!raw) continue;
      const fields = decodeSegment(raw);
      column += fields[0];
      if (fields.length > 1) source += fields[1];
      segments.push([column, fields.length > 1 ? source : null]);
    }
    // Source map columns are UTF-16 offsets, so slice the string, then count UTF-8 bytes.
    const start = segments.length ? segments[0][0] : line.length;
    add(null, Buffer.byteLength(line.slice(0, start)) + newline);
    segments.forEach(([from, owner], i) => {
      const to = i + 1 < segments.length ? segments[i + 1][0] : line.length;
      add(owner, Buffer.byteLength(line.slice(from, to)));
    });
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
    for (const [index, count] of attributeFile(code, map)) {
      const source = index === null ? undefined : map.sources[index];
      if (index !== null && typeof source !== "string")
        throw new Error(`Source map for ${rel} references missing source ${index}`);
      const owner =
        source === undefined
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

module.exports = { UNATTRIBUTED, decodeSegment, attributeFile, attribute, rows };

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
