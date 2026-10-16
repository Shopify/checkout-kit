// Shapes generated models so that additive protocol changes stay additive in the public API.
//
// - String enums become open value types with named constants. Switches over them need a
//   default, so a value added by a later protocol version is a new constant, not a new case.
//   Unknown strings survive decoding and encoding without acquiring a known meaning.
// - Every model has a construction API that doesn't grow with the schema, so tests, previews and
//   hosts can build models and a new optional field stays additive:
//   - Kotlin: plain classes (no copy() or componentN()) with internal constructors, a Builder
//     (required fields as constructor parameters, optional fields as properties and setters)
//     and a DSL.
//   - Swift: required fields plus one configuration closure, public var properties, and a
//     closure-based with(_:).

const SWIFT_STRING_ENUM = /^( *)public enum (\w+): String, Codable, Sendable \{\n((?:\1 {4}case \w+ = "[^"\n]*"\n)+)\1\}$/gm;
const SWIFT_ENUM_CASE = /case (\w+) = "([^"\n]*)"/g;

export function swiftOpenStringEnum(indent, name, cases) {
  const i = indent;
  const constants = cases.map(([member, value]) => `${i}    public static let ${member} = ${name}(unchecked: "${value}")`);
  const known = cases.map(([, value]) => `"${value}"`).join(", ");
  return [
    `${i}public struct ${name}: RawRepresentable, Codable, Hashable, Sendable {`,
    `${i}    public let rawValue: String`,
    "",
    `${i}    /// Preserves the string, including values this protocol version doesn't define.`,
    `${i}    /// This initializer never returns nil. Use \`isKnown\` to check for a named value.`,
    `${i}    public init?(rawValue: String) {`,
    `${i}        self.init(unchecked: rawValue)`,
    `${i}    }`,
    "",
    `${i}    private init(unchecked rawValue: String) {`,
    `${i}        self.rawValue = rawValue`,
    `${i}    }`,
    "",
    ...constants,
    "",
    `${i}    /// Values defined by the pinned protocol version.`,
    `${i}    static let knownValues: Set<String> = [${known}]`,
    "",
    `${i}    /// Whether this protocol version defines a named constant for the value.`,
    `${i}    public var isKnown: Bool { Self.knownValues.contains(rawValue) }`,
    "",
    `${i}    public init(from decoder: Decoder) throws {`,
    `${i}        let container = try decoder.singleValueContainer()`,
    `${i}        self.init(unchecked: try container.decode(String.self))`,
    `${i}    }`,
    "",
    `${i}    public func encode(to encoder: Encoder) throws {`,
    `${i}        var container = encoder.singleValueContainer()`,
    `${i}        try container.encode(rawValue)`,
    `${i}    }`,
    `${i}}`,
  ].join("\n");
}

// Splits a parameter list on top-level commas (types such as [String: [Int]] contain commas).
function splitParameters(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "[" || char === "(" || char === "<") depth += 1;
    if (char === "]" || char === ")" || char === ">") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

export function applySwiftEvolvableShapes(source) {
  let initCount = 0;
  let enumCount = 0;

  // Memberwise initializers are single-line in quicktype output. Optional parameters get a
  // nil default so that a new optional field keeps existing calls compiling.
  let result = source.replace(/^( +)public init\(((?!from decoder)[^\n]*)\) \{$/gm, (_, indent, list) => {
    initCount += 1;
    const parameters = splitParameters(list).map((parameter) =>
      /\?$/.test(parameter) && !parameter.includes("=") ? `${parameter} = nil` : parameter,
    );
    return `${indent}public init(${parameters.join(", ")}) {`;
  });

  // String enums become open value types.
  result = result.replace(SWIFT_STRING_ENUM, (_, indent, name, body) => {
    enumCount += 1;
    const cases = [...body.matchAll(SWIFT_ENUM_CASE)].map((match) => [match[1], match[2]]);
    return swiftOpenStringEnum(indent, name, cases);
  });

  if (initCount === 0 || enumCount === 0) {
    throw new Error(`Swift evolvable-shape pass matched init=${initCount} enum=${enumCount}; quicktype output may have changed`);
  }
  if (/public enum \w+: String, Codable, Sendable/.test(result)) {
    throw new Error("Swift evolvable-shape pass left a closed string enum; quicktype output may have changed");
  }
  return applySwiftConstructionShapes(result);
}

// Models take their required fields plus one configuration closure, so adding an optional property
// (a public var) doesn't change the initializer's signature or function type. The field-shaped
// with(…) helper becomes a closure-based copy that doesn't grow with the schema.
function swiftModelInit(indent, parameters) {
  const required = splitParameters(parameters).filter((parameter) => !parameter.includes("="));
  const assignments = required.map((parameter) => parameter.split(":")[0].trim());
  return [
    `${indent}public init(${[...required, "configure: (inout Self) -> Void = { _ in }"].join(", ")}) {`,
    ...assignments.map((field) => `${indent}    self.${field} = ${field}`),
    `${indent}    configure(&self)`,
    `${indent}}`,
  ];
}

function swiftModelWith() {
  return [
    `    /// Returns a copy with \`update\` applied.`,
    "    func with(_ update: (inout Self) -> Void) -> Self {",
    "        var copy = self",
    "        update(&copy)",
    "        return copy",
    "    }",
  ];
}

export function applySwiftConstructionShapes(source) {
  const lines = source.split("\n");
  const models = new Set(
    lines.map((line) => line.match(/^ *public struct (\w+)\b/)).filter((match) => match && !/: RawRepresentable\b/.test(match.input)).map((match) => match[1]),
  );
  const output = [];
  let struct = null;
  let structIndent = "";
  let extension = false;
  let initCount = 0;
  let withCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const opened = line.match(/^( *)public struct (\w+)\b/);
    if (opened) {
      struct = /: RawRepresentable\b/.test(line) ? null : opened[2];
      structIndent = opened[1];
      output.push(line);
      continue;
    }
    if (struct && line === `${structIndent}}`) struct = null;
    const extended = line.match(/^public extension (?:EmbeddedCheckoutProtocol\.)?(\w+) \{$/);
    if (extended) {
      extension = models.has(extended[1]);
      output.push(line);
      continue;
    }
    if (extension && line === "}") extension = false;

    const memberIndent = `${structIndent}    `;
    if (struct && line.startsWith(`${memberIndent}public let `)) {
      output.push(line.replace("public let ", "public var "));
      continue;
    }
    if (struct && line.startsWith(`${memberIndent}public init(`) && !line.includes("from decoder")) {
      const parameters = line.slice(`${memberIndent}public init(`.length, line.lastIndexOf(") {"));
      while (lines[index] !== `${memberIndent}}`) index += 1;
      output.push(...swiftModelInit(memberIndent, parameters));
      initCount += 1;
      continue;
    }
    if (extension && /^ {4}func with\(/.test(line)) {
      while (lines[index] !== "    }") index += 1;
      output.push(...swiftModelWith());
      withCount += 1;
      continue;
    }
    output.push(line);
  }
  if (initCount === 0 || withCount === 0) {
    throw new Error(`Swift construction pass matched init=${initCount} with=${withCount}; quicktype output may have changed`);
  }
  return output.join("\n").replace(/^( *)public enum CodingKeys: String, CodingKey \{$/gm, "$1enum CodingKeys: String, CodingKey {");
}

const KOTLIN_DATA_CLASS = /^public data class (\w+) \(\n([\s\S]*?)\n\)$/gm;
const KOTLIN_STRING_ENUM =
  /^@Serializable\npublic enum class (\w+)\(public val value: String\) \{\n((?: {4}@SerialName\("[^"\n]*"\) \w+\("[^"\n]*"\)[,;]\n)+)\}$/gm;
const KOTLIN_ENUM_ENTRY = /@SerialName\("([^"\n]*)"\) (\w+)\("[^"\n]*"\)/g;
const KOTLIN_PROPERTY = /^ {4}public val (\w+): (.+?)(?: = [^\n]+?)?,?$/gm;


const KOTLIN_PROPERTY_WITH_DEFAULT = /^ {4}public val (\w+): (.+?)(?: = ([^\n]+?))?,?$/gm;

// Required fields are Builder constructor parameters, so the compiler still checks them.
// All fields are `var`s for the Kotlin DSL and fluent setters for Java. The companion
// `invoke` lets Kotlin callers write `Model(required = …) { optional = … }`.
function kotlinBuilder(name, body) {
  const properties = [...body.matchAll(KOTLIN_PROPERTY_WITH_DEFAULT)].map((match) => ({
    name: match[1],
    type: match[2],
    defaultValue: match[3],
  }));
  const required = properties.filter((property) => property.defaultValue === undefined);
  const optional = properties.filter((property) => property.defaultValue !== undefined);
  const requiredParameters = required.map((property) => `${property.name}: ${property.type}`);
  const requiredArguments = required.map((property) => property.name).join(", ");

  const header =
    required.length === 0
      ? "    public class Builder {"
      : ["    public class Builder(", ...required.map((property) => `        public var ${property.name}: ${property.type},`), "    ) {"].join("\n");
  const members = [
    ...optional.map((property) => `        public var ${property.name}: ${property.type} = ${property.defaultValue}`),
    ...properties.map(
      (property) => `        public fun ${property.name}(value: ${property.type}): Builder = apply { this.${property.name} = value }`,
    ),
    `        public fun build(): ${name} = ${name}(${properties.map((property) => `${property.name} = ${property.name}`).join(", ")})`,
  ];
  const invokeParameters = [...requiredParameters, "configure: Builder.() -> Unit = {}"].join(", ");
  const toBuilder = optional.length === 0
    ? `    public fun toBuilder(): Builder = Builder(${requiredArguments})`
    : [
        `    public fun toBuilder(): Builder = Builder(${requiredArguments}).also { builder ->`,
        ...optional.map((property) => `        builder.${property.name} = this.${property.name}`),
        "    }",
      ].join("\n");
  return [
    "",
    "    /** Returns a builder initialized with every field of this model. Nested values are shared. */",
    toBuilder,
    "",
    `    /** Builds a [${name}]. Required fields are constructor parameters; all fields have properties and setters. */`,
    "    @ProtocolModelDsl",
    header,
    members.join("\n\n"),
    "    }",
    "",
    "    public companion object {",
    `        /** Builds a [${name}]: \`${name}(required = …) { optional = … }\`. */`,
    `        public operator fun invoke(${invokeParameters}): ${name} =`,
    `            Builder(${requiredArguments}).apply(configure).build()`,
    "    }",
  ].join("\n");
}

function kotlinPlainClass(name, body) {
  const fields = [...body.matchAll(KOTLIN_PROPERTY)].map((match) => match[1]);
  const equality = fields.map((field) => `${field} == other.${field}`).join(" &&\n            ");
  const described = fields.map((field) => `${field}=$${field}`).join(", ");
  return [
    `public class ${name} internal constructor (`,
    body,
    ") {",
    "    override fun equals(other: Any?): Boolean =",
    `        this === other || (other is ${name} &&`,
    `            ${equality})`,
    "",
    `    override fun hashCode(): Int = java.util.Objects.hash(${fields.join(", ")})`,
    "",
    `    override fun toString(): String = "${name}(${described})"`,
    kotlinBuilder(name, body),
    "}",
  ].join("\n");
}

// Open string values: named constants plus lossless pass-through of unknown strings.
function kotlinOpenStringEnum(name, entries) {
  const constants = entries.map(([value, member]) => `        @JvmField public val ${member}: ${name} = ${name}("${value}")`);
  const members = entries.map(([, member]) => member).join(", ");
  return [
    `@Serializable(with = ${name}Serializer::class)`,
    `public class ${name} private constructor(public val value: String) {`,
    "    public companion object {",
    ...constants,
    "",
    "        /** Values defined by the pinned protocol version. */",
    `        internal val known: Map<String, ${name}> = listOf(${members}).associateBy { it.value }`,
    "",
    `        internal fun fromWire(value: String): ${name} = known[value] ?: ${name}(value)`,
    "    }",
    "",
    `    override fun equals(other: Any?): Boolean = this === other || (other is ${name} && value == other.value)`,
    "",
    "    override fun hashCode(): Int = value.hashCode()",
    "",
    "    override fun toString(): String = value",
    "}",
    "",
    `internal object ${name}Serializer : KSerializer<${name}> {`,
    `    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("com.shopify.ucp.embedded.checkout.${name}", PrimitiveKind.STRING)`,
    "",
    `    override fun deserialize(decoder: Decoder): ${name} {`,
    "        val value = if (decoder is JsonDecoder) {",
    "            val primitive = decoder.decodeJsonElement() as? JsonPrimitive",
    "            if (primitive?.isString != true) {",
    `                throw SerializationException("Expected a string for ${name}")`,
    "            }",
    "            primitive.content",
    "        } else {",
    "            decoder.decodeString()",
    "        }",
    `        return ${name}.fromWire(value)`,
    "    }",
    "",
    `    override fun serialize(encoder: Encoder, value: ${name}): Unit = encoder.encodeString(value.value)`,
    "}",
  ].join("\n");
}

export function applyKotlinEvolvableShapes(source) {
  let classCount = 0;
  let enumCount = 0;

  let result = source.replace(KOTLIN_DATA_CLASS, (_, name, body) => {
    classCount += 1;
    return kotlinPlainClass(name, body);
  });
  result = result.replace(KOTLIN_STRING_ENUM, (_, name, body) => {
    enumCount += 1;
    const entries = [...body.matchAll(KOTLIN_ENUM_ENTRY)].map((match) => [match[1], match[2]]);
    return kotlinOpenStringEnum(name, entries);
  });

  if (classCount === 0 || enumCount === 0) {
    throw new Error(`Kotlin evolvable-shape pass matched classes=${classCount} enums=${enumCount}; quicktype output may have changed`);
  }
  if (/^public (data|enum) class /m.test(result)) {
    throw new Error("Kotlin evolvable-shape pass left a data class or enum class; quicktype output may have changed");
  }
  return result;
}

// TypeScript: string-literal unions stay open so a value added by a later protocol version
// doesn't break exhaustive checks. `(string & {})` keeps editor completion for known values;
// the runtime type map must accept the same strings on both decode and encode.
const TYPESCRIPT_STRING_UNION = /^export type (\w+) = ("[^"\n]*"(?: \| "[^"\n]*")*);$/gm;

export function applyTypescriptEvolvableShapes(source) {
  let count = 0;
  let result = source.replace(TYPESCRIPT_STRING_UNION, (_, name, members) => {
    count += 1;
    return `export type ${name} = ${members} | (string & {});`;
  });
  if (count === 0) {
    throw new Error("TypeScript evolvable-shape pass matched no string unions; quicktype output may have changed");
  }
  // Keep object/field validation intact; only open the string-enum entries. Fail if a
  // named union loses its matching quicktype runtime entry during a generator update.
  const names = [...source.matchAll(TYPESCRIPT_STRING_UNION)].map(match => match[1]);
  for (const name of names) {
    const entry = new RegExp(`^( {4}"${name}"): \\[\\n(?: {8}"[^"\\n]*",\\n)+ {4}\\],$`, "m");
    if (!entry.test(result)) {
      throw new Error(`TypeScript string union ${name} has no runtime enum entry; quicktype output may have changed`);
    }
    result = result.replace(entry, '$1: "",');
  }
  return result;
}
