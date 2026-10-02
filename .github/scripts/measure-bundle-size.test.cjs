const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { measurements } = require("./bundle-size-budgets.cjs");

test("collector measures all shipped JS chunks, excludes maps/types, and ignores timestamps in gzip", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-collector-test-"));
  try {
    const dist = path.join(directory, "package/dist");
    const bin = path.join(directory, "bin");
    fs.mkdirSync(dist, { recursive: true });
    fs.mkdirSync(bin);
    fs.mkdirSync(path.join(directory, "platforms/web"), { recursive: true });
    const files = {
      "index.js": "export const answer = 42;\n",
      "chunk.mjs": 'export default "chunk";\n',
      "legacy.cjs": "module.exports = 42;\n",
      "index.d.ts": "export declare const answer: number;",
      "index.js.map": '{"sources":[]}',
    };
    for (const [name, content] of Object.entries(files))
      fs.writeFileSync(path.join(dist, name), content);
    const fakePnpm = path.join(bin, "pnpm");
    fs.writeFileSync(
      fakePnpm,
      '#!/usr/bin/env bash\nset -euo pipefail\nif [[ "$1" == pack ]]; then\n  tar -czf "$3/package.tgz" -C "$PACKAGE_SIZE_REPO_ROOT" package\nfi\n',
    );
    fs.chmodSync(fakePnpm, 0o755);
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TMPDIR: directory,
      PACKAGE_SIZE_REPO_ROOT: directory,
      MEASURE_WEB: "true",
      MEASURE_REACT_NATIVE: "false",
      MEASURE_ANDROID: "false",
    };
    const output = path.join(directory, "sizes.tsv");
    const collect = () => {
      execFileSync("bash", [path.join(__dirname, "measure-package-size"), "collect", output], {
        env,
      });
      return measurements(fs.readFileSync(output, "utf8"));
    };
    const first = collect();
    const scripts = ["index.js", "chunk.mjs", "legacy.cjs"];
    assert.equal(
      first["Web\tJavaScript"],
      scripts.reduce((sum, file) => sum + Buffer.byteLength(files[file]), 0),
    );
    assert.equal(
      first["Web\tJavaScript (gzip)"],
      scripts.reduce(
        (sum, file) => sum + execFileSync("gzip", ["-n", "-9", "-c", path.join(dist, file)]).length,
        0,
      ),
    );
    for (const name of scripts) fs.utimesSync(path.join(dist, name), 1234567890, 1234567890);
    const second = collect();
    assert.equal(second["Web\tJavaScript (gzip)"], first["Web\tJavaScript (gzip)"]);
    for (const name of scripts) fs.unlinkSync(path.join(dist, name));
    assert.throws(collect, /No shipped web JavaScript found/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
