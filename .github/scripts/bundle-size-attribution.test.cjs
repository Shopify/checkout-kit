const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const attribution = require("./bundle-size-attribution.cjs");

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function fixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-attribution-"));
  write(path.join(repo, "web/package.json"), JSON.stringify({ name: "@acme/web" }));
  write(path.join(repo, "protocol/package.json"), JSON.stringify({ name: "@acme/protocol" }));
  write(path.join(repo, "unnamed/package.json"), "{}");
  return repo;
}

test("attributes every shipped byte to its source package", (t) => {
  const repo = fixture();
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const build = path.join(repo, "web/dist");
  const shipped = path.join(repo, "shipped/dist");

  // Line 1: "imp;" glue, then protocol code from column 4, then web code from column 11.
  //   The web code includes a 2-byte character and an emoji (a UTF-16 surrogate pair).
  // Line 2: no mappings at all (bundler glue).
  // Line 3: unnamed-package code from column 0, then a source-less mapping from column 4.
  const code = 'imp;P("x");W("é😀");\nexport{a};\nP();glue';
  const map = {
    version: 3,
    // Relative to web/dist/chunks/, where the map was built. An unnamed package stays unattributed.
    sources: [
      "../../../protocol/src/codec.ts",
      "../../src/index.css?inline",
      "../../../unnamed/a.ts",
    ],
    // IAAA = column 4, source 0; OCAA = column +7 (11), source +1; ACAA = column 0, source +1; I = column +4, no source.
    mappings: "IAAA,OCAA;;ACAA,I",
  };
  write(path.join(shipped, "chunks/main.js"), code);
  write(path.join(shipped, "chunks/main.js.map"), JSON.stringify(map));
  // Entry shims without maps belong to the package that builds them.
  write(path.join(shipped, "index.js"), 'export*from"./chunks/main.js";');

  const result = attribution.attribute({ shippedDir: shipped, buildDir: build, repoRoot: repo });
  const shim = Buffer.byteLength('export*from"./chunks/main.js";');
  assert.deepEqual(result, {
    bytes: Buffer.byteLength(code) + shim,
    totals: {
      "(unattributed)": 4 + 1 + "export{a};\n".length + 4 + 4,
      "@acme/protocol": 'P("x");'.length,
      "@acme/web": Buffer.byteLength('W("é😀");') + shim,
    },
  });
  assert.deepEqual(attribution.rows("Web", result), [
    `Web\tJavaScript package @acme/web\t${Buffer.byteLength('W("é😀");') + shim}`,
    "Web\tJavaScript package @acme/protocol\t7",
    `Web\tJavaScript unattributed\t${result.totals["(unattributed)"]}`,
  ]);
});

test("never attributes sources outside the repository", (t) => {
  const repo = fixture();
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const build = path.join(repo, "web/dist");
  const shipped = path.join(repo, "shipped/dist");
  write(path.join(shipped, "a.js"), "abc");
  write(
    path.join(shipped, "a.js.map"),
    JSON.stringify({ version: 3, sources: ["../../../outside.ts"], mappings: "AAAA" }),
  );
  assert.deepEqual(
    attribution.attribute({ shippedDir: shipped, buildDir: build, repoRoot: repo }).totals,
    { "(unattributed)": 3 },
  );
});
