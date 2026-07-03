import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

import {EC_METHODS} from './method_catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const modelsPath = resolve(here, '../languages/typescript/src/generated/Models.ts');
const outPath = resolve(here, '../languages/typescript/src/generated/CaseMap.ts');

const src = readFileSync(modelsPath, 'utf8');

// Extract the `const typeMap: any = { ... };` object literal.
const start = src.indexOf('const typeMap: any = {');
if (start === -1) throw new Error('typeMap not found');
const braceStart = src.indexOf('{', start);
let depth = 0;
let end = -1;
for (let i = braceStart; i < src.length; i++) {
  const c = src[i];
  if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const literal = src.slice(braceStart, end);

// Stub helpers matching Models.ts semantics, recording structure.
const r = (name) => ({k: 'ref', name});
const a = (t) => ({k: 'arr', t});
const m = (t) => ({k: 'map', t});
const u = (...ts) => {
  const sig = ts.find((t) => t && typeof t === 'object' && t.k) ?? ts.find((t) => t !== undefined);
  return {k: 'union', sig, optional: ts.includes(undefined)};
};
const o = (props) => ({k: 'obj', props});

const typeMap = eval(`(${literal})`);

const mechanical = (s) => s.split('_').map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');

function resolveTyp(typ) {
  if (typ && typeof typeof typ === 'object' && typ.k === 'union') return resolveTyp(typ.sig);
  return typ;
}

function classify(typ) {
  let t = typ;
  if (t && typeof t === 'object' && t.k === 'union') t = t.sig;
  if (!t || typeof t !== 'object') return null; // scalar
  if (t.k === 'arr') {
    const el = t.t;
    if (el && typeof el === 'object' && el.k === 'ref') return ['arr', el.name];
    return null; // array of scalars
  }
  if (t.k === 'map') {
    const el = t.t;
    if (el && typeof el === 'object') {
      if (el.k === 'arr' && el.t && typeof el.t === 'object' && el.t.k === 'ref') return ['map', el.t.name];
      if (el.k === 'ref') return ['map', el.name];
    }
    return ['map'];
  }
  if (t.k === 'ref') return ['ref', t.name];
  return null;
}

const isOptional = (typ) => Boolean(typ && typeof typ === 'object' && typ.k === 'union' && typ.optional);

function requiredKind(typ) {
  let t = typ;
  if (t && typeof t === 'object' && t.k === 'union') t = t.sig;
  if (typeof t === 'string') return 'string';
  if (typeof t === 'number') return 'number';
  if (typeof t === 'boolean') return 'boolean';
  return 'any';
}

const shapes = {};
const required = {};
for (const [typeName, desc] of Object.entries(typeMap)) {
  if (!desc || desc.k !== 'obj') continue;
  const fields = {};
  const reqs = [];
  for (const prop of desc.props) {
    const {json, js, typ} = prop;
    const shape = classify(typ);
    const irregular = mechanical(json) !== js;
    if (shape) {
      fields[json] = shape;
    } else if (irregular) {
      fields[json] = ['key', js];
    }
    if (!isOptional(typ)) reqs.push([json, requiredKind(typ)]);
  }
  if (Object.keys(fields).length) shapes[typeName] = fields;
  if (reqs.length) required[typeName] = reqs;
}

// The runtime (case_transform.ts) only consults the tables at the type names it
// walks. Everything else is dead weight in the shipped bundle. Derive those
// entry points from the method catalog so the pruned table stays correct as the
// protocol evolves:
//   - decode roots: type names `camelizeKeys` is called with (notification
//     payloads + request payloads; `checkoutUnwrap` requests remap `Checkout`).
//   - encode roots: request result types `snakeifyKeys` is called with.
const decodeRoots = new Set();
const encodeRoots = new Set();
for (const entry of EC_METHODS) {
  if (entry.kind === 'notification') {
    decodeRoots.add(entry.payload);
  } else if (entry.kind === 'request') {
    decodeRoots.add(entry.decode === 'checkoutUnwrap' ? 'Checkout' : entry.payload);
    encodeRoots.add(entry.result);
  }
}

// A type is "significant" only if walking it can diverge from a plain mechanical
// snake<->camel rename: it carries an irregular `key`, a dynamic-key `map`, or a
// `ref`/`arr` into another significant type. `walk` falls back to the mechanical
// rename for any field the table omits, and the generator only omits a field
// when `mechanical(json) === js`, so pruning a `ref`/`arr` edge into an
// insignificant type is behaviour-preserving in both directions.
const isLoadBearing = (shape) => shape[0] === 'key' || shape[0] === 'map';
const significant = new Set();
for (let changed = true; changed; ) {
  changed = false;
  for (const [typeName, fields] of Object.entries(shapes)) {
    if (significant.has(typeName)) continue;
    for (const shape of Object.values(fields)) {
      if (
        isLoadBearing(shape) ||
        ((shape[0] === 'ref' || shape[0] === 'arr') && significant.has(shape[1]))
      ) {
        significant.add(typeName);
        changed = true;
        break;
      }
    }
  }
}

const edgeTarget = (shape) =>
  shape[0] === 'ref' || shape[0] === 'arr' || (shape[0] === 'map' && shape.length === 2)
    ? shape[1]
    : undefined;

// Types the runtime can actually reach from an entry point, over the full graph.
const reachable = new Set();
const stack = [...decodeRoots, ...encodeRoots];
while (stack.length) {
  const typeName = stack.pop();
  if (reachable.has(typeName)) continue;
  reachable.add(typeName);
  for (const shape of Object.values(shapes[typeName] ?? {})) {
    const target = edgeTarget(shape);
    if (target && !reachable.has(target)) stack.push(target);
  }
}

// SHAPES: keep reachable significant types, and within them only the fields that
// change behaviour — irregular keys, dynamic maps, and edges into other
// significant types. REQUIRED is consulted only at the top level by
// `validateRequired`, so it collapses to the decode roots.
const minimalShapes = {};
for (const [typeName, fields] of Object.entries(shapes)) {
  if (!significant.has(typeName) || !reachable.has(typeName)) continue;
  const kept = {};
  for (const [json, shape] of Object.entries(fields)) {
    if (isLoadBearing(shape)) kept[json] = shape;
    else if ((shape[0] === 'ref' || shape[0] === 'arr') && significant.has(shape[1])) {
      kept[json] = shape;
    }
  }
  minimalShapes[typeName] = kept;
}

const minimalRequired = {};
for (const [typeName, reqs] of Object.entries(required)) {
  if (decodeRoots.has(typeName)) minimalRequired[typeName] = reqs;
}

// Generation-time proof that the pruned table produces identical `walk` output
// to the full table for every reachable type, in both directions. If this ever
// throws, the pruning heuristics diverged from the runtime and the emitted table
// would silently corrupt payloads.
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function assert(condition, message) {
  if (!condition) throw new Error(`CaseMap prune self-check failed: ${message}`);
}
for (const [typeName, fields] of Object.entries(shapes)) {
  if (!reachable.has(typeName)) continue;
  for (const [json, shape] of Object.entries(fields)) {
    const min = minimalShapes[typeName]?.[json];
    if (isLoadBearing(shape) || (edgeTarget(shape) && significant.has(shape[1]))) {
      assert(eq(min, shape), `dropped required entry ${typeName}.${json}`);
    } else {
      assert(min === undefined, `kept redundant entry ${typeName}.${json}`);
    }
  }
  for (const json of Object.keys(minimalShapes[typeName] ?? {})) {
    assert(fields[json] !== undefined, `invented entry ${typeName}.${json}`);
  }
}
for (const typeName of Object.keys(shapes)) {
  const shouldKeep = significant.has(typeName) && reachable.has(typeName);
  assert(shouldKeep === (minimalShapes[typeName] !== undefined), `membership mismatch for ${typeName}`);
}
for (const typeName of decodeRoots) {
  if (required[typeName]) assert(minimalRequired[typeName], `dropped required root ${typeName}`);
}

const banner = `// This file is generated by protocol/scripts/generate_case_map.mjs.\n// Do not edit directly.\n\n`;
const body =
  `export type Shape =\n` +
  `  | readonly ['ref', string]\n` +
  `  | readonly ['arr', string]\n` +
  `  | readonly ['map']\n` +
  `  | readonly ['map', string]\n` +
  `  | readonly ['key', string];\n\n` +
  `export const SHAPES: Record<string, Record<string, Shape>> = ${JSON.stringify(minimalShapes, null, 2)};\n\n` +
  `export type RequiredKind = 'string' | 'number' | 'boolean' | 'any';\n\n` +
  `export const REQUIRED: Record<string, ReadonlyArray<readonly [string, RequiredKind]>> = ${JSON.stringify(minimalRequired, null, 2)};\n`;

writeFileSync(outPath, banner + body);

const countFields = (table) =>
  Object.values(table).reduce((n, f) => n + Object.keys(f).length, 0);
console.log(`Wrote ${outPath}`);
console.log(
  `SHAPES types: ${Object.keys(shapes).length} -> ${Object.keys(minimalShapes).length} ` +
    `(fields ${countFields(shapes)} -> ${countFields(minimalShapes)})`,
);
console.log(
  `REQUIRED types: ${Object.keys(required).length} -> ${Object.keys(minimalRequired).length}`,
);
console.log(`Entry points: ${decodeRoots.size} decode, ${encodeRoots.size} encode`);
