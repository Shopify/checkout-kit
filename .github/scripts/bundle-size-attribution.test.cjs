const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const attribution = require("./bundle-size-attribution.cjs");

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function encode(values) {
  return values
    .map((n) => {
      let value = n < 0 ? (-n << 1) | 1 : n << 1;
      let out = "";
      do {
        let digit = value & 31;
        value >>>= 5;
        if (value) digit |= 32;
        out += BASE64[digit];
      } while (value);
      return out;
    })
    .join("");
}

// Lines of [column, sourceIndex | null] segments, with absolute values, encoded as deltas.
function mappings(lines) {
  let source = 0;
  return lines
    .map((segments) => {
      let column = 0;
      return segments
        .map(([col, src]) => {
          const fields = [col - column];
          column = col;
          if (src !== null) {
            fields.push(src - source, 0, 0);
            source = src;
          }
          return encode(fields);
        })
        .join(",");
    })
    .join(";");
}

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

test("decodes VLQ segments, including negative and multi-digit values", () => {
  assert.deepEqual(attribution.decodeSegment(encode([0, -3, 16, 1000])), [0, -3, 16, 1000]);
  assert.throws(() => attribution.decodeSegment("g"), /Truncated/);
  assert.throws(() => attribution.decodeSegment("!"), /Invalid/);
});

test("attributes every shipped byte to its source package", (t) => {
  const repo = fixture();
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const build = path.join(repo, "web/dist");
  const shipped = path.join(repo, "shipped/dist");

  // Line 1: "import" glue, then protocol code, then web code with a multibyte character.
  // Line 2: no mappings at all (bundler glue). Line 3: a one-field (unmapped) segment.
  const code = 'imp;P("x");W("é");\nexport{a};\nP();glue';
  const map = {
    version: 3,
    // Relative to web/dist/chunks/, where the map was built. An unnamed package stays unattributed.
    sources: [
      "../../../protocol/src/codec.ts",
      "../../src/index.css?inline",
      "../../../unnamed/a.ts",
    ],
    mappings: mappings([
      [
        [4, 0],
        [11, 1],
      ],
      [],
      [
        [0, 2],
        [4, null],
      ],
    ]),
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
      "@acme/web": Buffer.byteLength('W("é");') + shim,
    },
  });
  assert.deepEqual(attribution.rows("Web", result), [
    `Web\tJavaScript package @acme/web\t${Buffer.byteLength('W("é");') + shim}`,
    "Web\tJavaScript package @acme/protocol\t7",
    `Web\tJavaScript unattributed\t${result.totals["(unattributed)"]}`,
  ]);
});

test("never attributes sources outside the repository and rejects broken maps", (t) => {
  const repo = fixture();
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const build = path.join(repo, "web/dist");
  const shipped = path.join(repo, "shipped/dist");
  write(path.join(shipped, "a.js"), "abc");
  write(
    path.join(shipped, "a.js.map"),
    JSON.stringify({
      version: 3,
      sources: ["../../../outside.ts"],
      mappings: mappings([[[0, 0]]]),
    }),
  );
  assert.deepEqual(
    attribution.attribute({ shippedDir: shipped, buildDir: build, repoRoot: repo }).totals,
    { "(unattributed)": 3 },
  );
  write(
    path.join(shipped, "a.js.map"),
    JSON.stringify({ version: 3, sources: [], mappings: mappings([[[0, 0]]]) }),
  );
  assert.throws(
    () => attribution.attribute({ shippedDir: shipped, buildDir: build, repoRoot: repo }),
    /missing source/,
  );
});
