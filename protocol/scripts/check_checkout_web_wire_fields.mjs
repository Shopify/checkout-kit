#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const DEFAULT_SCHEMA_VERSION = "v2026-04-08";
const CHECKOUT_WEB_SCHEMA_DIR = path.join(
  "app",
  "entrypoints",
  "shared",
  "embed",
  "mappers",
  "ucp-flavoured-ecp",
  "tests",
  "spec",
  "schemas",
);
const UCP_SCHEMA_BASE_URL = "https://ucp.dev/schemas/";

const checkoutShapes = [
  {
    label: "checkout",
    file: "shopping/checkout.json",
    pointer: "",
  },
  {
    label: "discount checkout extension",
    file: "shopping/discount.json",
    pointer: "/$defs/dev.ucp.shopping.checkout",
  },
  {
    label: "fulfillment checkout extension",
    file: "shopping/fulfillment.json",
    pointer: "/$defs/dev.ucp.shopping.checkout",
  },
];

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const schemaRoot = resolveSchemaRoot(options);
  const modelsPath =
    options.models ??
    path.join(
      repoRoot,
      "protocol",
      "languages",
      "typescript",
      "src",
      "generated",
      "Models.ts",
    );

  const expectedPaths = collectCheckoutWebPaths(schemaRoot);
  const generatedPaths = collectGeneratedModelPaths(modelsPath);
  const missingPaths = [...expectedPaths.keys()]
    .filter((fieldPath) => !generatedPaths.has(fieldPath))
    .sort();
  const extraPaths = [...generatedPaths.keys()]
    .filter((fieldPath) => !expectedPaths.has(fieldPath))
    .sort();

  if (options.debug) {
    console.log(
      JSON.stringify(
        buildDebugPayload({
          options,
          schemaRoot,
          modelsPath,
          expectedPaths,
          generatedPaths,
          missingPaths,
          extraPaths,
        }),
        null,
        2,
      ),
    );
  }

  if (missingPaths.length > 0) {
    console.error(
      `ERROR: ${missingPaths.length} checkout-web schema field path(s) are not present in ${path.relative(
        repoRoot,
        modelsPath,
      )}:`,
    );

    for (const fieldPath of missingPaths) {
      const sources = [...expectedPaths.get(fieldPath).sources]
        .sort()
        .join(", ");
      console.error(`  - ${fieldPath} (${sources})`);
    }

    process.exit(1);
  }

  if (!options.debug) {
    console.log(
      `No missing checkout fields detected. Checkout-web ${options.schemaVersion} field coverage OK: ${expectedPaths.size} schema field paths are present in ${path.relative(
        repoRoot,
        modelsPath,
      )}.`,
    );

    if (options.verbose) {
      console.log(`Schema root: ${schemaRoot}`);
      console.log(`Generated model: ${modelsPath}`);
    }
  }
}

function parseArgs(argv) {
  const options = {
    checkoutWeb: process.env.CHECKOUT_WEB_ROOT,
    schemaRoot: process.env.CHECKOUT_WEB_SCHEMA_ROOT,
    schemaVersion:
      process.env.CHECKOUT_WEB_SCHEMA_VERSION ?? DEFAULT_SCHEMA_VERSION,
    models: undefined,
    positionals: [],
    debug: false,
    verbose: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--checkout-web":
        options.checkoutWeb = readOptionValue(argv, ++index, arg);
        break;
      case "--schema-root":
        options.schemaRoot = readOptionValue(argv, ++index, arg);
        break;
      case "--schema-version":
        options.schemaVersion = readOptionValue(argv, ++index, arg);
        break;
      case "--models":
        options.models = readOptionValue(argv, ++index, arg);
        break;
      case "--debug":
        options.debug = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (arg.startsWith("--checkout-web=")) {
          options.checkoutWeb = arg.slice("--checkout-web=".length);
        } else if (arg.startsWith("--schema-root=")) {
          options.schemaRoot = arg.slice("--schema-root=".length);
        } else if (arg.startsWith("--schema-version=")) {
          options.schemaVersion = arg.slice("--schema-version=".length);
        } else if (arg.startsWith("--models=")) {
          options.models = arg.slice("--models=".length);
        } else if (arg.startsWith("--")) {
          throw new Error(`Unknown argument: ${arg}`);
        } else {
          options.positionals.push(arg);
        }
    }
  }

  if (options.positionals.length > 1) {
    throw new Error(
      `Expected at most one positional checkout-web path, got ${options.positionals.length}`,
    );
  }

  if (
    options.positionals.length === 1 &&
    !options.checkoutWeb &&
    !options.schemaRoot
  ) {
    options.checkoutWeb = options.positionals[0];
  }

  return options;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value`);
  }

  return value;
}

function printUsage() {
  console.log(`Usage:
  node protocol/scripts/check_checkout_web_wire_fields.mjs --checkout-web /path/to/checkout-web
  node protocol/scripts/check_checkout_web_wire_fields.mjs /path/to/checkout-web
  CHECKOUT_WEB_ROOT=/path/to/checkout-web node protocol/scripts/check_checkout_web_wire_fields.mjs
  node protocol/scripts/check_checkout_web_wire_fields.mjs --schema-root /path/to/tests/spec/schemas/v2026-04-08

Options:
  --schema-version <version>  Fixture directory under checkout-web schemas. Default: ${DEFAULT_SCHEMA_VERSION}
  --models <path>            Generated TypeScript model file to inspect.
  --debug                    Emit a JSON field manifest for checkout-web and native models.
  --verbose                  Print resolved input paths.`);
}

function resolveSchemaRoot(options) {
  const candidates = [];

  if (options.schemaRoot) {
    candidates.push(options.schemaRoot);
  }

  if (options.checkoutWeb) {
    candidates.push(
      path.join(
        options.checkoutWeb,
        CHECKOUT_WEB_SCHEMA_DIR,
        options.schemaVersion,
      ),
      path.join(options.checkoutWeb, "schemas", options.schemaVersion),
      path.join(options.checkoutWeb, options.schemaVersion),
      options.checkoutWeb,
    );
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const checkoutSchema = path.join(resolved, "shopping", "checkout.json");

    if (fs.existsSync(checkoutSchema)) {
      return resolved;
    }
  }

  printUsage();
  throw new Error(
    "Could not find checkout-web schemas. Pass --checkout-web, --schema-root, CHECKOUT_WEB_ROOT, or CHECKOUT_WEB_SCHEMA_ROOT.",
  );
}

function collectCheckoutWebPaths(schemaRoot) {
  const resolver = new SchemaResolver(schemaRoot);
  const paths = new Map();

  for (const shape of checkoutShapes) {
    const file = path.join(schemaRoot, shape.file);
    const document = resolver.load(file);
    const schema = resolvePointer(document, shape.pointer);

    collectSchemaPaths({
      resolver,
      schema,
      file,
      prefix: ["checkout"],
      source: shape.label,
      paths,
      stack: [],
    });
  }

  return paths;
}

function collectSchemaPaths({
  resolver,
  schema,
  file,
  prefix,
  source,
  paths,
  stack,
  depth = 0,
}) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    return;
  }

  if (depth > 80) {
    throw new Error(`Schema recursion limit exceeded at ${prefix}`);
  }

  if (schema.$ref) {
    const resolved = resolver.resolve(schema.$ref, file);
    const key = `${resolved.file}#${resolved.pointer}|${formatFieldPath(prefix)}`;

    if (!stack.includes(key)) {
      collectSchemaPaths({
        resolver,
        schema: resolved.schema,
        file: resolved.file,
        prefix,
        source,
        paths,
        stack: [...stack, key],
        depth: depth + 1,
      });
    }
  }

  for (const keyword of ["allOf", "anyOf", "oneOf"]) {
    if (!Array.isArray(schema[keyword])) {
      continue;
    }

    for (const child of schema[keyword]) {
      collectSchemaPaths({
        resolver,
        schema: child,
        file,
        prefix,
        source,
        paths,
        stack,
        depth: depth + 1,
      });
    }
  }

  if (schema.properties && typeof schema.properties === "object") {
    for (const [propertyName, propertySchema] of Object.entries(
      schema.properties,
    )) {
      const propertyPath = [...prefix, propertyName];
      addSource(paths, propertyPath, source);
      collectSchemaPaths({
        resolver,
        schema: propertySchema,
        file,
        prefix: propertyPath,
        source,
        paths,
        stack,
        depth: depth + 1,
      });
    }
  }

  if (schema.items) {
    collectSchemaPaths({
      resolver,
      schema: schema.items,
      file,
      prefix: appendArraySegment(prefix),
      source,
      paths,
      stack,
      depth: depth + 1,
    });
  }

  if (
    schema.additionalProperties &&
    typeof schema.additionalProperties === "object"
  ) {
    collectSchemaPaths({
      resolver,
      schema: schema.additionalProperties,
      file,
      prefix: [...prefix, "*"],
      source,
      paths,
      stack,
      depth: depth + 1,
    });
  }
}

function addSource(paths, fieldPath, source) {
  const key = formatFieldPath(fieldPath);
  const entry = paths.get(key) ?? {
    segments: fieldPath,
    sources: new Set(),
  };
  entry.sources.add(source);
  paths.set(key, entry);
}

function appendArraySegment(fieldPath) {
  if (fieldPath.length === 0) {
    throw new Error("Cannot append array marker to an empty field path");
  }

  return [
    ...fieldPath.slice(0, -1),
    `${fieldPath[fieldPath.length - 1]}[]`,
  ];
}

function formatFieldPath(fieldPath) {
  return fieldPath.join(".");
}

function buildDebugPayload({
  options,
  schemaRoot,
  modelsPath,
  expectedPaths,
  generatedPaths,
  missingPaths,
  extraPaths,
}) {
  return {
    schemaVersion: options.schemaVersion,
    inputs: {
      checkoutWebSchemaRoot: schemaRoot,
      nativeGeneratedModel: modelsPath,
    },
    summary: {
      checkoutWebFieldCount: expectedPaths.size,
      nativeFieldCount: generatedPaths.size,
      missingInNativeCount: missingPaths.length,
      extraInNativeCount: extraPaths.length,
    },
    missingInNative: missingPaths.map((fieldPath) => ({
      path: fieldPath,
      sources: [...expectedPaths.get(fieldPath).sources].sort(),
    })),
    extraInNative: extraPaths,
    checkoutWeb: {
      fields: buildFieldSchema(
        [...expectedPaths.values()]
          .sort((left, right) =>
            formatFieldPath(left.segments).localeCompare(
              formatFieldPath(right.segments),
            ),
          )
          .map((entry) => entry.segments),
      ),
      paths: [...expectedPaths.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([fieldPath, entry]) => ({
          path: fieldPath,
          sources: [...entry.sources].sort(),
        })),
    },
    native: {
      fields: buildFieldSchema(
        [...generatedPaths.values()]
          .sort((left, right) =>
            formatFieldPath(left).localeCompare(formatFieldPath(right)),
          ),
      ),
      paths: [...generatedPaths.keys()].sort(),
    },
  };
}

function buildFieldSchema(fieldPathSegments) {
  const root = {
    type: "object",
    properties: {},
  };

  for (const fieldPath of fieldPathSegments) {
    addFieldPath(root, fieldPath.slice(1));
  }

  return root;
}

function addFieldPath(node, segments) {
  if (segments.length === 0) {
    return;
  }

  const [rawSegment, ...remainingSegments] = segments;
  const isArray = rawSegment.endsWith("[]");

  if (rawSegment === "*" || rawSegment === "*[]") {
    node.additionalProperties = isArray
      ? asArrayNode(node.additionalProperties)
      : asObjectNode(node.additionalProperties);

    if (remainingSegments.length === 0) {
      return;
    }

    if (isArray) {
      node.additionalProperties.items = asObjectNode(
        node.additionalProperties.items,
      );
      addFieldPath(node.additionalProperties.items, remainingSegments);
      return;
    }

    addFieldPath(node.additionalProperties, remainingSegments);
    return;
  }

  const fieldName = isArray ? rawSegment.slice(0, -2) : rawSegment;
  node.properties ??= {};

  if (isArray) {
    node.properties[fieldName] = asArrayNode(node.properties[fieldName]);

    if (remainingSegments.length === 0) {
      return;
    }

    node.properties[fieldName].items = asObjectNode(
      node.properties[fieldName].items,
    );
    addFieldPath(node.properties[fieldName].items, remainingSegments);
    return;
  }

  if (remainingSegments.length === 0) {
    node.properties[fieldName] ??= true;
    return;
  }

  node.properties[fieldName] = asObjectNode(node.properties[fieldName]);
  addFieldPath(node.properties[fieldName], remainingSegments);
}

function asArrayNode(existingNode) {
  if (existingNode?.type === "array") {
    existingNode.items = asObjectNode(existingNode.items);
    return existingNode;
  }

  return {
    type: "array",
    items: existingNode === undefined || existingNode === true
      ? true
      : asObjectNode(existingNode),
  };
}

function asObjectNode(existingNode) {
  if (!existingNode || existingNode === true) {
    return {
      type: "object",
      properties: {},
    };
  }

  if (existingNode.type === "array") {
    return existingNode.items ?? {type: "object", properties: {}};
  }

  existingNode.type = "object";
  existingNode.properties ??= {};
  return existingNode;
}

class SchemaResolver {
  constructor(schemaRoot) {
    this.schemaRoot = schemaRoot;
    this.cache = new Map();
  }

  load(file) {
    const absoluteFile = path.resolve(file);

    if (!this.cache.has(absoluteFile)) {
      this.cache.set(
        absoluteFile,
        JSON.parse(fs.readFileSync(absoluteFile, "utf8")),
      );
    }

    return this.cache.get(absoluteFile);
  }

  resolve(ref, fromFile) {
    const hashIndex = ref.indexOf("#");
    const documentRef = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
    const pointer = hashIndex === -1 ? "" : ref.slice(hashIndex + 1);
    const file = this.resolveDocumentRef(documentRef, fromFile);
    const document = this.load(file);

    return {
      file,
      pointer,
      schema: resolvePointer(document, pointer),
    };
  }

  resolveDocumentRef(documentRef, fromFile) {
    if (documentRef === "") {
      return path.resolve(fromFile);
    }

    if (documentRef.startsWith(UCP_SCHEMA_BASE_URL)) {
      return path.join(
        this.schemaRoot,
        documentRef.slice(UCP_SCHEMA_BASE_URL.length),
      );
    }

    if (/^https?:\/\//.test(documentRef)) {
      throw new Error(`Unsupported schema ref: ${documentRef}`);
    }

    return path.resolve(path.dirname(fromFile), documentRef);
  }
}

function resolvePointer(document, pointer) {
  if (pointer === "") {
    return document;
  }

  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported JSON pointer: ${pointer}`);
  }

  return pointer
    .slice(1)
    .split("/")
    .reduce((node, rawToken) => {
      const token = decodeURIComponent(rawToken)
        .replace(/~1/g, "/")
        .replace(/~0/g, "~");

      if (node === undefined || node === null || !(token in node)) {
        throw new Error(`Could not resolve JSON pointer segment: ${token}`);
      }

      return node[token];
    }, document);
}

function collectGeneratedModelPaths(modelsPath) {
  const modelsSource = fs.readFileSync(modelsPath, "utf8");
  const typeMap = parseTypeMap(modelsSource);
  const paths = new Map();

  collectGeneratedTypeName({
    typeMap,
    typeName: "Checkout",
    prefix: ["checkout"],
    paths,
    stack: new Set(),
  });

  return paths;
}

function parseTypeMap(modelsSource) {
  const typeMap = new Map();
  let currentType = undefined;

  for (const line of modelsSource.split(/\r?\n/)) {
    const typeMatch = line.match(/^\s+"([^"]+)": o\(\[/);

    if (typeMatch) {
      currentType = typeMatch[1];
      typeMap.set(currentType, []);
      continue;
    }

    if (!currentType) {
      continue;
    }

    if (/^\s*\],\s*(?:"any"|false)\),?/.test(line)) {
      currentType = undefined;
      continue;
    }

    const propertyMatch = line.match(
      /^\s*\{ json: "((?:\\"|[^"])*)", js: "((?:\\"|[^"])*)", typ: (.*) \},\s*$/,
    );

    if (!propertyMatch) {
      continue;
    }

    typeMap.get(currentType).push({
      json: JSON.parse(`"${propertyMatch[1]}"`),
      typ: parseTypeExpression(propertyMatch[3]),
    });
  }

  if (!typeMap.has("Checkout")) {
    throw new Error("Could not find Checkout in generated TypeScript typeMap");
  }

  return typeMap;
}

function collectGeneratedTypeName({
  typeMap,
  typeName,
  prefix,
  paths,
  stack,
  depth = 0,
}) {
  const properties = typeMap.get(typeName);

  if (!properties) {
    return;
  }

  if (depth > 80) {
    throw new Error(`Generated model recursion limit exceeded at ${prefix}`);
  }

  const key = `${typeName}|${prefix}`;

  if (stack.has(key)) {
    return;
  }

  stack.add(key);

  for (const property of properties) {
    const propertyPath = [...prefix, property.json];
    paths.set(formatFieldPath(propertyPath), propertyPath);
    collectGeneratedType({
      typeMap,
      typeNode: property.typ,
      prefix: propertyPath,
      paths,
      stack,
      depth: depth + 1,
    });
  }

  stack.delete(key);
}

function collectGeneratedType({
  typeMap,
  typeNode,
  prefix,
  paths,
  stack,
  depth,
}) {
  switch (typeNode.kind) {
    case "call":
      collectGeneratedCall({typeMap, typeNode, prefix, paths, stack, depth});
      break;
    case "primitive":
      break;
    default:
      throw new Error(`Unsupported type node: ${typeNode.kind}`);
  }
}

function collectGeneratedCall({
  typeMap,
  typeNode,
  prefix,
  paths,
  stack,
  depth,
}) {
  switch (typeNode.name) {
    case "r": {
      const referencedName = typeNode.args[0]?.value;
      collectGeneratedTypeName({
        typeMap,
        typeName: referencedName,
        prefix,
        paths,
        stack,
        depth,
      });
      break;
    }
    case "a":
      collectGeneratedType({
        typeMap,
        typeNode: typeNode.args[0],
        prefix: appendArraySegment(prefix),
        paths,
        stack,
        depth,
      });
      break;
    case "m":
      collectGeneratedType({
        typeMap,
        typeNode: typeNode.args[0],
        prefix: [...prefix, "*"],
        paths,
        stack,
        depth,
      });
      break;
    case "u":
      for (const child of typeNode.args) {
        collectGeneratedType({
          typeMap,
          typeNode: child,
          prefix,
          paths,
          stack,
          depth,
        });
      }
      break;
    default:
      break;
  }
}

function parseTypeExpression(expression) {
  let index = 0;

  function parseExpression() {
    skipWhitespace();

    if (expression[index] === '"') {
      return {
        kind: "primitive",
        value: parseString(),
      };
    }

    if (/[-0-9]/.test(expression[index])) {
      parseNumber();
      return {kind: "primitive"};
    }

    const name = parseIdentifier();
    skipWhitespace();

    if (expression[index] !== "(") {
      return {kind: "primitive", value: name};
    }

    index += 1;
    const args = [];
    skipWhitespace();

    while (expression[index] !== ")") {
      args.push(parseExpression());
      skipWhitespace();

      if (expression[index] === ",") {
        index += 1;
        skipWhitespace();
        continue;
      }

      if (expression[index] !== ")") {
        throw new Error(`Unexpected type expression near: ${expression.slice(index)}`);
      }
    }

    index += 1;

    return {
      kind: "call",
      name,
      args,
    };
  }

  function skipWhitespace() {
    while (/\s/.test(expression[index])) {
      index += 1;
    }
  }

  function parseString() {
    let value = "";
    index += 1;

    while (index < expression.length) {
      const char = expression[index];

      if (char === '"') {
        index += 1;
        return value;
      }

      if (char === "\\") {
        value += JSON.parse(`"${expression.slice(index, index + 2)}"`);
        index += 2;
        continue;
      }

      value += char;
      index += 1;
    }

    throw new Error(`Unterminated string in type expression: ${expression}`);
  }

  function parseNumber() {
    while (/[-0-9.]/.test(expression[index])) {
      index += 1;
    }
  }

  function parseIdentifier() {
    const match = expression.slice(index).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);

    if (!match) {
      throw new Error(`Expected identifier in type expression: ${expression}`);
    }

    index += match[0].length;
    return match[0];
  }

  const typeNode = parseExpression();
  skipWhitespace();

  if (index !== expression.length) {
    throw new Error(`Unexpected trailing type expression: ${expression.slice(index)}`);
  }

  return typeNode;
}

main();
