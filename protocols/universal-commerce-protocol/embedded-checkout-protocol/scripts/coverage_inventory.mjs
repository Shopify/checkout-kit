// Builds the inventory of protocol types inside Checkout Kit's compatibility promise: every
// protocol type Checkout Kit's public API exposes, directly or through the fields of exposed
// models. The inputs are Checkout Kit's committed API baselines, so the inventory follows the
// public API rather than a hand-kept list.

import {readFileSync, readdirSync} from "node:fs";
import path from "node:path";

function walkFiles(dir, extension) {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(full, extension);
    return entry.name.endsWith(extension) ? [full] : [];
  });
}

const capitalized = (type) => [...type.matchAll(/\b[A-Z]\w*\b/g)].map((match) => match[0]);

// Kotlin: generated models (plain classes) and open values (classes with a private constructor).
export function kotlinProtocolTypes(source) {
  const models = new Map();
  for (const match of source.matchAll(/^public class (\w+) internal constructor \(\n([\s\S]*?)\n\) \{/gm)) {
    models.set(
      match[1],
      [...match[2].matchAll(/^ {4}public val (\w+): (.+?)(?: = [^\n]+?)?,?$/gm)].map((property) => ({
        name: property[1],
        type: property[2],
      })),
    );
  }
  const values = new Map();
  for (const match of source.matchAll(/^public class (\w+) private constructor\(public val value: String\) \{\n([\s\S]*?)\n\}$/gm)) {
    values.set(match[1], [...match[2].matchAll(/= \w+\("([^"]*)"\)/g)].map((value) => value[1]));
  }
  return {models, values};
}

// Swift: generated structs (models) and RawRepresentable structs (open values).
export function swiftProtocolTypes(source) {
  const models = new Map();
  const values = new Map();
  let current = null;
  let indent = "";
  let isValue = false;
  for (const line of source.split("\n")) {
    const struct = line.match(/^( *)public struct (\w+)\b/);
    if (struct) {
      current = struct[2];
      indent = struct[1];
      isValue = /: RawRepresentable\b/.test(line);
      (isValue ? values : models).set(current, []);
      continue;
    }
    if (current && line === `${indent}}`) {
      current = null;
      continue;
    }
    if (!current) continue;
    const property = !isValue && line.match(/^ +public (?:let|var) (\w+): ([^=]+?)(?: = .*)?$/);
    if (property) models.get(current).push({name: property[1], type: property[2]});
    const constant = isValue && line.match(/^ +public static let \w+ = \w+\(known: "([^"]*)"\)/);
    if (constant) values.get(current).push(constant[1]);
  }
  return {models, values};
}

// Public type declarations in the protocol sources, generated or hand-written, with their public
// stored members. Hand-written types (the JSON-RPC envelopes, the client and descriptors) are
// covered too when Checkout Kit exposes them.
export function swiftDeclarations(files) {
  const declarations = new Map();
  for (const {file, source} of files) {
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      const match = line.match(/^( *)public (?:final )?(struct|enum|class|protocol|typealias|actor) (\w+)\b/);
      if (!match || declarations.has(match[3])) return;
      const members = [];
      // A declaration without a body (`typealias`) or with an empty one (`{}`) has no members.
      const hasBody = line.trimEnd().endsWith("{");
      for (let next = index + 1; hasBody && next < lines.length && lines[next] !== `${match[1]}}`; next += 1) {
        const member = lines[next].match(new RegExp(`^${match[1]} {4}public (?:let|var) (\\w+):`));
        if (member) members.push(member[1]);
      }
      declarations.set(match[3], {file, members});
    });
  }
  return declarations;
}

export function kotlinDeclarations(files) {
  const declarations = new Map();
  for (const {file, source} of files) {
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      const match = line.match(/^( *)public (?:(?:final|open|abstract|sealed|data|value|enum|fun|annotation) )*(?:class|object|interface|typealias) (\w+)\b/);
      if (!match || declarations.has(match[2])) return;
      const indent = match[1];
      const members = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        const text = lines[next];
        if (text === `${indent}}` || new RegExp(`^${indent}(?:public|internal|private|@)`).test(text)) break;
        const member = text.match(new RegExp(`^${indent} {4}public (?:val|var) (\\w+):`));
        if (member) members.push(member[1]);
      }
      declarations.set(match[2], {file, members});
    });
  }
  return declarations;
}

// Protocol types referenced anywhere in Checkout Kit's Swift API baselines.
export function swiftExposedRoots(baselines) {
  const roots = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    for (const [, name] of (node.printedName ?? "").matchAll(/EmbeddedCheckoutProtocol\.(?:EmbeddedCheckoutProtocol\.)?([A-Z]\w*)/g)) {
      roots.add(name);
    }
    Object.values(node).forEach(walk);
  };
  baselines.forEach(walk);
  return roots;
}

// Protocol types referenced by Checkout Kit's Kotlin API. The .api file erases generic arguments
// (`getLineItems ()Ljava/util/List;`), so element types come from the matching public property
// declarations in Checkout Kit's sources.
export function kotlinExposedRoots(api, sources, protocolNames) {
  const roots = new Set([...api.matchAll(/Lcom\/shopify\/ucp\/embedded\/checkout\/(\w+)[;$]/g)].map((match) => match[1]));
  const erased = new Set(
    [...api.matchAll(/public (?:final )?fun get(\w+) \(\)Ljava\/util\/(?:List|Map|Set);/g)].map(
      (match) => match[1][0].toLowerCase() + match[1].slice(1),
    ),
  );
  for (const source of sources) {
    for (const match of source.matchAll(/^\s*public (?:val|var) (\w+): (.+)$/gm)) {
      if (!erased.has(match[1])) continue;
      for (const name of capitalized(match[2])) if (protocolNames.has(name)) roots.add(name);
    }
  }
  return roots;
}

// Reference graphs from the protocol's own API baselines, which record every public signature:
// properties, initializers, methods, generic constraints and conformances. Following them makes
// the inventory include types that only appear in hand-written signatures.
const SWIFT_PROTOCOL_TYPE = /EmbeddedCheckoutProtocol\.(?:EmbeddedCheckoutProtocol\.)?([A-Z]\w*)/g;

export function swiftBaselineGraph(baseline) {
  const graph = new Map();
  const members = new Map();
  const visitType = (type) => {
    const references = new Set();
    const names = [];
    const collect = (node) => {
      if (Array.isArray(node)) return node.forEach(collect);
      if (!node || typeof node !== "object") return;
      if (node !== type && node.kind === "TypeDecl") return visitType(node);
      for (const value of [node.printedName, node.genericSig].filter(Boolean)) {
        for (const [, name] of value.matchAll(SWIFT_PROTOCOL_TYPE)) if (name !== type.name) references.add(name);
      }
      Object.values(node).forEach(collect);
    };
    for (const child of type.children ?? []) {
      if (child.kind === "Var" && !child.static) names.push(child.name);
    }
    collect(type);
    graph.set(type.name, references);
    members.set(type.name, names);
  };
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (node.kind === "TypeDecl") return visitType(node);
    Object.values(node).forEach(walk);
  };
  walk(baseline);
  return {graph, members};
}

// Kotlin: class blocks in the .api file. Nested helper classes (Builder, Companion, serializers)
// count towards the class that owns them.
export function kotlinApiGraph(api, protocolNames) {
  const graph = new Map();
  const owner = (path) => {
    const segments = path.split("$").filter(Boolean);
    // Source declarations include the common helper names too. Resolve helpers to their
    // enclosing model before looking up names, or toBuilder() connects every model's Builder.
    while (segments.length > 1 && ["Builder", "Companion", "serializer"].includes(segments[segments.length - 1])) {
      segments.pop();
    }
    const last = segments[segments.length - 1];
    return protocolNames.has(last) ? last : segments[0];
  };
  let current = null;
  for (const line of api.split("\n")) {
    const header = line.match(/^public .*class com\/shopify\/ucp\/embedded\/checkout\/([\w$]+)/);
    if (header) {
      current = owner(header[1]);
      if (!graph.has(current)) graph.set(current, new Set());
    }
    if (!current) continue;
    for (const [, path] of line.matchAll(/com\/shopify\/ucp\/embedded\/checkout\/([\w$]+)/g)) {
      const name = owner(path);
      if (name !== current) graph.get(current).add(name);
    }
    if (line === "}") current = null;
  }
  return graph;
}

function closure(roots, models, graph = new Map()) {
  const covered = new Set(roots);
  const pending = [...roots];
  while (pending.length > 0) {
    const name = pending.pop();
    const references = [
      ...(models.get(name) ?? []).flatMap((property) => capitalized(property.type)),
      ...(graph.get(name) ?? []),
    ];
    for (const reference of references) {
      if (!covered.has(reference)) {
        covered.add(reference);
        pending.push(reference);
      }
    }
  }
  return covered;
}

export function buildInventory({protocolVersion, kotlin, swift}) {
  const covered = {
    Kotlin: closure(kotlin.roots, kotlin.types.models, kotlin.graph),
    Swift: closure(swift.roots, swift.types.models, swift.graph),
  };
  const inputs = {Kotlin: kotlin, Swift: swift};
  const names = [...new Set([...covered.Kotlin, ...covered.Swift])].sort();
  const types = [];
  for (const name of names) {
    const platforms = ["Kotlin", "Swift"].filter((platform) => covered[platform].has(name));
    const model = platforms.map((platform) => inputs[platform].types.models.get(name)).find(Boolean);
    const values = platforms.map((platform) => inputs[platform].types.values.get(name)).find(Boolean);
    // Swift members come from the API baseline when it describes the type; it records every public
    // member. Source-parsed members are only used for types the baseline doesn't describe.
    const baselineMembers = platforms.includes("Swift") ? swift.members?.get(name) : undefined;
    const withBaseline = (names) => [...new Set([...names, ...(baselineMembers ?? [])])];
    if (model) {
      types.push({name, kind: "model", platforms, members: withBaseline(model.map((property) => property.name))});
      continue;
    }
    if (values) {
      types.push({name, kind: "value", platforms, values});
      continue;
    }
    const handwritten = platforms.map((platform) => inputs[platform].declarations.get(name)).find(Boolean);
    if (handwritten) {
      const members = baselineMembers ?? handwritten.members;
      types.push({name, kind: "handwritten", platforms, source: handwritten.file, members});
      continue;
    }
    // Roots are explicitly protocol-qualified in Checkout Kit's API, so they must be declared in the
    // protocol sources. Names found only inside field types (String, Date, …) aren't protocol types.
    const exposedBy = platforms.filter((platform) => inputs[platform].roots.has(name));
    if (exposedBy.length > 0) {
      throw new Error(`${exposedBy.join(", ")}: Checkout Kit exposes protocol type ${name}, but no public declaration was found in the protocol sources.`);
    }
  }
  return {
    description:
      "Generated by scripts/generate_coverage_inventory.mjs from Checkout Kit's public API baselines. " +
      "Protocol types inside Checkout Kit's compatibility promise.",
    protocolVersion,
    types,
  };
}


export function renderMarkdown(inventory) {
  const rows = (kind) => inventory.types.filter((type) => type.kind === kind);
  const platforms = (type) => type.platforms.join(", ");
  const lines = [
    "<!-- Generated by scripts/generate_coverage_inventory.mjs. Do not edit. -->",
    "",
    "# Protocol types covered by Checkout Kit",
    "",
    `Checkout Kit's semantic versioning covers these protocol types (UCP \`${inventory.protocolVersion}\`): the types its public API exposes, directly or through the fields of exposed models. Other protocol types follow the protocol package's own versioning.`,
    "",
    "## Models",
    "",
    "Every model can be built with its builder or DSL (Kotlin) or its initializer (Swift).",
    "",
    "| Type | Platforms | Members |",
    "|---|---|---|",
    ...rows("model").map((type) => `| \`${type.name}\` | ${platforms(type)} | ${type.members.map((member) => `\`${member}\``).join(", ")} |`),
    "",
    "## Values",
    "",
    "Open values: switch over them with a `default` / `else` case.",
    "",
    "| Type | Platforms | Values |",
    "|---|---|---|",
    ...rows("value").map((type) => `| \`${type.name}\` | ${platforms(type)} | ${type.values.map((value) => `\`${value}\``).join(", ")} |`),
  ];
  const handwritten = rows("handwritten");
  if (handwritten.length > 0) {
    lines.push(
      "",
      "## Hand-written protocol types",
      "",
      "| Type | Platforms | Source | Members |",
      "|---|---|---|---|",
      ...handwritten.map(
        (type) => `| \`${type.name}\` | ${platforms(type)} | \`${type.source}\` | ${type.members.map((member) => `\`${member}\``).join(", ")} |`,
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function loadInventoryInputs(areaRoot) {
  const protocolDir = path.join(areaRoot, "protocols/universal-commerce-protocol/embedded-checkout-protocol");
  const sourcesOf = (dir, extension) =>
    walkFiles(path.join(protocolDir, dir), extension).map((file) => ({file: path.relative(protocolDir, file), source: readFileSync(file, "utf8")}));

  const kotlinSource = readFileSync(
    path.join(protocolDir, "languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/Models.kt"),
    "utf8",
  );
  const swiftSource = readFileSync(
    path.join(protocolDir, "languages/swift/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/Generated/Models.swift"),
    "utf8",
  );
  const kotlinTypes = kotlinProtocolTypes(kotlinSource);
  const swiftTypes = swiftProtocolTypes(swiftSource);
  const kotlinNames = new Set([...kotlinTypes.models.keys(), ...kotlinTypes.values.keys(), ...kotlinDeclarations(sourcesOf("languages/kotlin/embedded-checkout-protocol/src/main", ".kt")).keys()]);

  const swiftBaselines = ["ShopifyCheckoutKit", "ShopifyAcceleratedCheckouts"].map((module) =>
    JSON.parse(readFileSync(path.join(areaRoot, `platforms/swift/api/${module}.json`), "utf8")),
  );
  const androidApi = readFileSync(path.join(areaRoot, "platforms/android/shopify-checkout/api/shopify-checkout.api"), "utf8");
  const androidSources = walkFiles(path.join(areaRoot, "platforms/android/shopify-checkout/src/main"), ".kt").map((file) =>
    readFileSync(file, "utf8"),
  );

  return {
    protocolVersion: JSON.parse(readFileSync(path.join(protocolDir, "source-lock.json"), "utf8")).protocolVersion,
    kotlin: {
      types: kotlinTypes,
      graph: kotlinApiGraph(
        readFileSync(path.join(protocolDir, "languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api"), "utf8"),
        kotlinNames,
      ),
      declarations: kotlinDeclarations(sourcesOf("languages/kotlin/embedded-checkout-protocol/src/main", ".kt")),
      roots: kotlinExposedRoots(androidApi, androidSources, kotlinNames),
    },
    swift: {
      types: swiftTypes,
      ...(({graph, members}) => ({graph, members}))(
        swiftBaselineGraph(JSON.parse(readFileSync(path.join(areaRoot, "platforms/swift/api/EmbeddedCheckoutProtocol.json"), "utf8"))),
      ),
      declarations: swiftDeclarations(sourcesOf("languages/swift/Sources", ".swift")),
      roots: swiftExposedRoots(swiftBaselines),
    },
  };
}
