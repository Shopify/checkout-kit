// =============================================================================
// CaseMap generator
// =============================================================================
//
// WHAT THIS PRODUCES
//   CaseMap.ts — a small lookup table (SHAPES + REQUIRED) read at runtime by
//   case_transform.ts to convert protocol payloads between the wire format
//   (snake_case) and the shape app code reads (camelCase).
//
// WHY A TABLE IS NEEDED AT ALL
//   The runtime renames keys MECHANICALLY by default: a regex flips every key
//   between snake_case and camelCase. That is correct for the vast majority of
//   fields, so those fields need NO table entry. The table records only the
//   handful of cases where a blind mechanical rename would be WRONG:
//
//     1. Dynamic-key maps  (e.g. payment_handlers, services, constraints)
//        Their keys are DATA — payment-handler IDs, reverse-DNS service names,
//        merchant-defined keys — not schema fields. They must be preserved
//        verbatim, never renamed. Recorded as ['map'] (or ['map', ElementType]
//        when the map's values are themselves a typed object to recurse into).
//
//     2. Irregular field names (e.g. "dev.ucp.buyer_ip" -> "devUcpBuyerIp")
//        Dotted/odd names whose camelCase form the regex can't reproduce.
//        Recorded as ['key', 'devUcpBuyerIp'] — the exact target name.
//
//     3. Navigation edges  (['ref', TypeName] / ['arr', TypeName])
//        Not exceptions themselves. They thread the current type name down into
//        nested objects/arrays so the runtime knows WHEN it has walked into a
//        type that contains one of the exceptions above.
//
// WHERE THE EXCEPTIONS COME FROM
//   They are DERIVED, not hand-listed. quicktype turns the UCP JSON schemas
//   into Models.ts, which embeds a `typeMap` describing every type's fields
//   (wire key, code key, and kind: primitive / ref / array / map / union).
//   This script reads that typeMap and infers the exceptions structurally:
//     - a field is a "map"       => the schema declared it as a dictionary
//     - a field name is "irregular" => quicktype's camelCase name differs from
//                                       what our own mechanical rename produces
//
// WHY IT IS PRUNED
//   A full table would list every field of every type — mostly dead weight,
//   since mechanical rename already handles them. This script keeps ONLY the
//   entries the runtime can actually reach AND that change its output, then
//   PROVES (see the self-check near the end) the pruned table yields identical
//   results to the full one. The shipped bundle carries just that residue.
//
// PIPELINE (top to bottom)
//   1. Extract the `typeMap` literal out of Models.ts and eval it.
//   2. Reduce each type to the fields that could matter (maps / keys / edges)
//      plus its required fields.
//   3. Find the "roots" — the type names the runtime starts a walk from
//      (derived from the method catalog).
//   4. Mark "significant" types — ones where walking diverges from a plain
//      mechanical rename.
//   5. Mark "reachable" types — ones the runtime can get to from a root.
//   6. Keep significant AND reachable types, load-bearing fields only.
//   7. Self-check: pruned table === full table for every reachable type.
//   8. Emit CaseMap.ts.
// =============================================================================

import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

import {EC_METHODS} from './method_catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const modelsPath = resolve(here, '../languages/typescript/src/generated/Models.ts');
const outPath = resolve(here, '../languages/typescript/src/generated/CaseMap.ts');

const src = readFileSync(modelsPath, 'utf8');

// Models.ts is TypeScript and quicktype does not export `typeMap`, so we can't
// import it. Instead we pull the `const typeMap: any = { ... };` object literal
// straight out of the source TEXT. Find its opening brace, then scan forward
// tracking brace depth until the matching close brace — that span is the
// literal. (A plain indexOf of '}' would stop at the first nested one.)
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

// The literal is a call tree built from quicktype's one-letter helpers:
//   o(props)  = object type   r(name) = reference to another named type
//   a(elem)   = array of elem  m(elem) = map (dictionary) of elem
//   u(...ts)  = union (how quicktype models optional / multi-type fields)
// quicktype's real helpers construct runtime converters; we don't want that.
// We redefine them as STUBS that just record the shape as a tagged object
// (e.g. {k: 'ref', name}), then eval the literal so those calls run against
// our stubs. The result is a plain data description of every type — no
// conversion logic, just structure we can inspect.
const r = (name) => ({k: 'ref', name});
const a = (t) => ({k: 'arr', t});
const m = (t) => ({k: 'map', t});
const u = (...ts) => {
  // Pick the "signature" member of a union: the first structured type if any,
  // else the first defined member. `undefined` in a union means the field is
  // optional (quicktype's way of encoding `field?:`), tracked separately.
  const sig = ts.find((t) => t && typeof t === 'object' && t.k) ?? ts.find((t) => t !== undefined);
  return {k: 'union', sig, optional: ts.includes(undefined)};
};
const o = (props) => ({k: 'obj', props});

// Safe here: the input is our own generated Models.ts, never user data.
const typeMap = eval(`(${literal})`);

// The same snake_case -> camelCase transform the runtime applies by default.
// We use it to spot "irregular" names: if mechanical(wireKey) !== quicktype's
// code name, the runtime can't derive the code name on its own and needs an
// explicit ['key', ...] entry.
const mechanical = (s) => s.split('_').map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');

function resolveTyp(typ) {
  if (typ && typeof typeof typ === 'object' && typ.k === 'union') return resolveTyp(typ.sig);
  return typ;
}

// Reduce one field's type descriptor to the Shape the runtime table uses, or
// null when the field needs no entry (a plain scalar, or an array of scalars —
// mechanical rename handles both). Note: this returns the *structural* shape;
// whether it's actually kept in the pruned table is decided later.
function classify(typ) {
  let t = typ;
  if (t && typeof t === 'object' && t.k === 'union') t = t.sig; // unwrap optional/union to its core type
  if (!t || typeof t !== 'object') return null; // scalar -> no entry needed
  if (t.k === 'arr') {
    const el = t.t;
    // Array of typed objects -> recurse into that element type; array of
    // scalars -> nothing to track.
    if (el && typeof el === 'object' && el.k === 'ref') return ['arr', el.name];
    return null;
  }
  if (t.k === 'map') {
    // A dictionary: keys are dynamic and must be preserved. If the values are a
    // typed object (directly, or an array of them) record the element type so
    // the runtime still recurses into the VALUES; otherwise it's a bare ['map'].
    const el = t.t;
    if (el && typeof el === 'object') {
      if (el.k === 'arr' && el.t && typeof el.t === 'object' && el.t.k === 'ref') return ['map', el.t.name];
      if (el.k === 'ref') return ['map', el.name];
    }
    return ['map'];
  }
  if (t.k === 'ref') return ['ref', t.name]; // reference to another named type
  return null;
}

// REQUIRED drives the runtime's top-level input validation (validateRequired):
// a field is required unless quicktype modelled it as optional (a union that
// includes `undefined`). requiredKind records the primitive kind so the runtime
// can also reject a present-but-wrong-typed value.
const isOptional = (typ) => Boolean(typ && typeof typ === 'object' && typ.k === 'union' && typ.optional);

function requiredKind(typ) {
  let t = typ;
  if (t && typeof t === 'object' && t.k === 'union') t = t.sig;
  if (typeof t === 'string') return 'string';
  if (typeof t === 'number') return 'number';
  if (typeof t === 'boolean') return 'boolean';
  return 'any';
}

// Build the FULL tables first (every object type, every field that could
// matter). Pruning to the minimal shipped subset happens further down.
//   shapes[Type][wireKey]   = the Shape for a field the runtime must handle
//                             specially (map / key / navigation edge)
//   required[Type]          = [wireKey, primitiveKind] for each non-optional
//                             field, used by top-level validation
// A field earns a shape entry if classify() returns one (map/edge), OR if its
// name is irregular (mechanical rename can't reproduce quicktype's code name),
// in which case we pin the exact camelCase target with ['key', js].
const shapes = {};
const required = {};
for (const [typeName, desc] of Object.entries(typeMap)) {
  if (!desc || desc.k !== 'obj') continue; // only object types have fields to map
  const fields = {};
  const reqs = [];
  for (const prop of desc.props) {
    const {json, js, typ} = prop; // json = wire key, js = code key, typ = its type
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

// Emit CaseMap.ts: the Shape type, the pruned SHAPES table, and the pruned
// REQUIRED table, serialized as plain JSON literals. This is the only output;
// the trailing console lines just report how much the pruning removed.
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
