import {describe, expect, test} from 'vitest';
import {applyKotlinEvolvableShapes, applySwiftEvolvableShapes, applyTypescriptEvolvableShapes} from './evolvable_shapes.mjs';

describe('Swift', () => {
  const source = `public struct LineItem: Codable, Sendable {
    public let id: String
    public let parentID: String?
    public let attributes: [String: [String]]?

    enum CodingKeys: String, CodingKey {
        case id
    }

    public init(id: String, parentID: String?, attributes: [String: [String]]?) {
        self.id = id
        self.parentID = parentID
        self.attributes = attributes
    }

    public init(from decoder: Decoder) throws {
        fatalError()
    }
}

public extension LineItem {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(LineItem.self, from: data)
    }

    func with(
        id: String? = nil
    ) -> LineItem {
        return LineItem(id: id ?? self.id, parentID: parentID, attributes: attributes)
    }
}

public struct Payment: Codable, Sendable {
    public let instruments: [String]?

    public enum CodingKeys: String, CodingKey {
        case instruments
    }

    public init(instruments: [String]?) {
        self.instruments = instruments
    }
}

public extension Payment {
    func with(
        instruments: [String]?? = nil
    ) -> Payment {
        return Payment(instruments: instruments ?? self.instruments)
    }
}

public enum CheckoutStatus: String, Codable, Sendable {
    case completeInProgress = "complete_in_progress"
    case completed = "completed"
}
`;

  test('gives every model required-field initializers with a configuration closure', () => {
    const result = applySwiftEvolvableShapes(source);

    expect(result).toContain(`    public init(id: String, configure: (inout Self) -> Void = { _ in }) {
        self.id = id
        configure(&self)
    }`);
    expect(result).toContain(`    public init(configure: (inout Self) -> Void = { _ in }) {
        configure(&self)
    }`);
    expect(result).toContain('    public var parentID: String?');
    expect(result).not.toMatch(/public let (id|parentID|attributes|instruments):/);
  });

  test('replaces field-shaped with(…) helpers with a closure-based copy', () => {
    const result = applySwiftEvolvableShapes(source);

    expect(result).not.toContain('id: String? = nil');
    expect(result.match(/func with\(_ update: \(inout Self\) -> Void\) -> Self \{/g)).toHaveLength(2);
  });

  test('keeps decoding initializers public and CodingKeys internal', () => {
    const result = applySwiftEvolvableShapes(source);

    expect(result).toContain('    public init(from decoder: Decoder) throws {\n        fatalError()');
    expect(result).toContain('    init(data: Data) throws {');
    expect(result).not.toContain('public enum CodingKeys');
  });

  test('turns string enums into open values with lossless decoding', () => {
    const result = applySwiftEvolvableShapes(source);

    expect(result).not.toContain('public enum CheckoutStatus');
    expect(result).toContain('public struct CheckoutStatus: RawRepresentable, Codable, Hashable, Sendable {');
    expect(result).toContain('    public init?(rawValue: String) {');
    expect(result).not.toContain('guard Self.knownValues.contains(rawValue)');
    expect(result).toContain('        self.init(unchecked: rawValue)');
    expect(result).toContain('    public var isKnown: Bool { Self.knownValues.contains(rawValue) }');
    expect(result).toContain('    private init(unchecked rawValue: String) {');
    expect(result).toContain('    public static let completeInProgress = CheckoutStatus(unchecked: "complete_in_progress")');
    expect(result).toContain('    static let knownValues: Set<String> = ["complete_in_progress", "completed"]');
    expect(result).toContain('        self.init(unchecked: try container.decode(String.self))');
  });

  test('keeps nested enums at their indentation', () => {
    const nested = `${source}
public struct Config: Codable, Sendable {
    public let scheme: Scheme

    public init(scheme: Scheme) {
    }

    public enum Scheme: String, Codable, Sendable {
        case dark = "dark"
    }
}
`;
    const result = applySwiftEvolvableShapes(nested);

    expect(result).toContain('    public struct Scheme: RawRepresentable, Codable, Hashable, Sendable {');
    expect(result).toContain('        public static let dark = Scheme(unchecked: "dark")');
  });

  test('fails loudly when quicktype output no longer matches', () => {
    expect(() => applySwiftEvolvableShapes('public struct Empty: Codable {\n    public init(a: Int) {\n}\n}')).toThrow(
      /quicktype output may have changed/,
    );
  });
});

describe('Kotlin', () => {
  const source = `@Serializable
public data class Message (
    public val content: String,

    @SerialName("image_url")
    public val imageURL: String? = null
)

@Serializable
public data class LineItem (
    public val id: String,

    @SerialName("parent_id")
    public val parentID: String? = null,

    public val totals: Map<String, Long>
)

@Serializable
public enum class CheckoutStatus(public val value: String) {
    @SerialName("complete_in_progress") CompleteInProgress("complete_in_progress"),
    @SerialName("completed") Completed("completed");
}
`;

  test('replaces data classes with plain classes that have internal constructors', () => {
    const result = applyKotlinEvolvableShapes(source);

    expect(result).not.toContain('data class');
    expect(result).not.toContain('fun copy(');
    expect(result).not.toContain(' public constructor');
    expect(result).toContain('public class LineItem internal constructor (');
    expect(result).toContain('            parentID == other.parentID &&');
    expect(result).toContain('    override fun hashCode(): Int = java.util.Objects.hash(id, parentID, totals)');
    expect(result).toContain('    override fun toString(): String = "LineItem(id=$id, parentID=$parentID, totals=$totals)"');
  });

  test('gives every model a builder and a DSL', () => {
    const result = applyKotlinEvolvableShapes(source);

    expect(result.match(/ {4}public class Builder/g)).toHaveLength(2);
    expect(result).toContain(`    @ProtocolModelDsl
    public class Builder(
        public var content: String,
    ) {
        public var imageURL: String? = null

        public fun content(value: String): Builder = apply { this.content = value }

        public fun imageURL(value: String?): Builder = apply { this.imageURL = value }

        public fun build(): Message = Message(content = content, imageURL = imageURL)
    }`);
    expect(result).toContain(`        public operator fun invoke(id: String, totals: Map<String, Long>, configure: Builder.() -> Unit = {}): LineItem =
            Builder(id, totals).apply(configure).build()`);
  });

  test('turns string enums into open values with lossless decoding', () => {
    const result = applyKotlinEvolvableShapes(source);

    expect(result).not.toContain('enum class');
    expect(result).toContain('@Serializable(with = CheckoutStatusSerializer::class)');
    expect(result).toContain('public class CheckoutStatus private constructor(public val value: String) {');
    expect(result).toContain('        @JvmField public val CompleteInProgress: CheckoutStatus = CheckoutStatus("complete_in_progress")');
    expect(result).toContain('internal val known: Map<String, CheckoutStatus> = listOf(CompleteInProgress, Completed).associateBy { it.value }');
    expect(result).toContain('internal fun fromWire(value: String): CheckoutStatus = known[value] ?: CheckoutStatus(value)');
    expect(result).toContain('return CheckoutStatus.fromWire(value)');
    expect(result).toContain('if (primitive?.isString != true)');
  });

  test('fails loudly when quicktype output no longer matches', () => {
    expect(() => applyKotlinEvolvableShapes('public class Empty')).toThrow(/quicktype output may have changed/);
  });
});

describe('TypeScript', () => {
  test('keeps string unions open', () => {
    const result = applyTypescriptEvolvableShapes(`export type Severity = "recoverable" | "unrecoverable";
export type Single = "error";
const typeMap: any = {
    "Severity": [
        "recoverable",
        "unrecoverable",
    ],
    "Single": [
        "error",
    ],
    "Message": o([
        { json: "severity", js: "severity", typ: r("Severity") },
    ], false),
};
`);

    expect(result).toContain('export type Severity = "recoverable" | "unrecoverable" | (string & {});');
    expect(result).toContain('export type Single = "error" | (string & {});');
    expect(result).toContain('    "Severity": "",');
    expect(result).toContain('    "Single": "",');
    expect(result).toContain('{ json: "severity", js: "severity", typ: r("Severity") }');
  });

  test('fails loudly when a string union has no matching runtime entry', () => {
    expect(() => applyTypescriptEvolvableShapes('export type Single = "error";\n')).toThrow(/no runtime enum entry/);
  });

  test('fails loudly when quicktype output no longer matches', () => {
    expect(() => applyTypescriptEvolvableShapes('export interface Checkout {}')).toThrow(/quicktype output may have changed/);
  });
});
