#!/usr/bin/env node
// Applies compat/additive-change.json to a schemas directory, in place. Pointers ending in `/-`
// append to an array; other pointers set a key on an object.
import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const [schemasDir] = process.argv.slice(2);
if (!schemasDir) {
  console.error("Usage: apply_change.mjs <schemas-dir>");
  process.exit(1);
}
const change = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "additive-change.json"), "utf8"));

for (const edit of change.edits) {
  const file = path.join(schemasDir, edit.file);
  const document = JSON.parse(readFileSync(file, "utf8"));
  const keys = edit.pointer.split("/").slice(1);
  const last = keys.pop();
  const parent = keys.reduce((node, key) => {
    if (!(key in node)) throw new Error(`${edit.file}: ${edit.pointer} doesn't exist`);
    return node[key];
  }, document);
  if (last === "-") {
    if (!Array.isArray(parent)) throw new Error(`${edit.file}: ${edit.pointer} isn't an array`);
    parent.push(edit.value);
  } else {
    if (last in parent) throw new Error(`${edit.file}: ${edit.pointer} already exists; the change must be additive`);
    parent[last] = edit.value;
  }
  writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
}
console.log(`Applied ${change.edits.length} additive edits`);
