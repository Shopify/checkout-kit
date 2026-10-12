import {execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {Readable} from "node:stream";
import {describe, expect, test} from "vitest";

const require = createRequire(import.meta.url);
const quicktypeRequire = createRequire(require.resolve("quicktype/package.json"));
const {CompressedJSONFromStream} = require("quicktype/dist/CompressedJSONFromStream.js");
const {TypeScriptTargetLanguage} = quicktypeRequire("quicktype-core");
const {CompressedJSONFromString} = quicktypeRequire("quicktype-core/dist/input/CompressedJSON.js");
const recognizer = new TypeScriptTargetLanguage().dateTimeRecognizer;

function chunked(json, size) {
  const bytes = Buffer.from(json);
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.subarray(offset, offset + size));
  }
  return Readable.from(chunks);
}

describe("Quicktype stream-json compatibility patch", () => {
  test.each([1, 7, 4096])("preserves JSON inference across %i-byte chunks", async (size) => {
    const json = JSON.stringify({
      "escaped\"key": "é 🛒\n\t\\",
      nested: [{integer: -42, decimal: 1.25, tiny: 1.2e-20, enabled: true}, false, null],
      emptyArray: [],
      emptyObject: {},
      emptyString: "",
      date: "2026-10-12",
      longString: "x".repeat(100),
    });
    const streamed = new CompressedJSONFromStream(recognizer, false);
    const buffered = new CompressedJSONFromString(recognizer, false);

    expect(await streamed.parse(chunked(json, size))).toBe(await buffered.parse(json));
    expect(streamed.hashCode()).toBe(buffered.hashCode());
  });

  test.each(['{"unfinished":', '{"value": true,}', '[1 2]'])(
    "rejects malformed JSON: %s",
    async (json) => {
      const parser = new CompressedJSONFromStream(recognizer, false);
      await expect(parser.parse(chunked(json, 1))).rejects.toThrow();
    },
  );

  test("generates types from streamed CLI input", () => {
    const output = execFileSync(
      process.execPath,
      [require.resolve("quicktype/dist/index.js"), "--lang", "typescript", "--just-types", "--top-level", "Sample"],
      {input: '{"id":42,"label":"synthetic","enabled":true}', encoding: "utf8"},
    );
    expect(output).toMatch(/export interface Sample \{/);
    expect(output).toMatch(/id:\s+number;/);
    expect(output).toMatch(/label:\s+string;/);
    expect(output).toMatch(/enabled:\s+boolean;/);
  });
});
