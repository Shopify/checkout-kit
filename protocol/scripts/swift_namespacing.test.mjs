import {expect, test} from 'vitest';
import {namespaceSwiftPayloadModels} from './swift_namespacing.mjs';

const source = `public struct Checkout: Codable {
    public let buyer: Buyer
    public let ucp: Metadata
}
public extension Checkout {
    func copy() -> Checkout { self }
}
public struct Order: Codable {
    public let buyer: Buyer
}
public struct Buyer: Codable {
    public let name: String
}
public struct Metadata: Codable {
    public let version: String
}
public struct Result: Codable {
    public let buyer: Buyer
    public let details: ResultDetails
}
public struct ResultDetails: Codable {
    public let status: ResultStatus
}
public enum ResultStatus: String, Codable {
    case accepted = "Result"
}
`;

test('namespaces payloads and exclusive dependencies while preserving shared domain types and wire strings', () => {
  const result = namespaceSwiftPayloadModels(source, new Set(['Checkout', 'Result']));
  for (const name of ['Checkout', 'Metadata', 'Result', 'ResultDetails', 'ResultStatus']) {
    expect(result).toMatch(new RegExp(`extension EmbeddedCheckoutProtocol \\{\\n    public (struct|enum) ${name}:`));
    expect(result).not.toMatch(new RegExp(`^public (struct|enum) ${name}:`, 'm'));
  }
  expect(result).toContain('public extension EmbeddedCheckoutProtocol.Checkout');
  expect(result).toContain('func copy() -> EmbeddedCheckoutProtocol.Checkout');
  expect(result).toContain('public let details: EmbeddedCheckoutProtocol.ResultDetails');
  expect(result).toContain('case accepted = "Result"');
  for (const name of ['Order', 'Buyer']) {
    expect(result).toContain(source.match(new RegExp(`^public struct ${name}:[\\s\\S]*?^}`, 'm'))[0]);
  }
});

test('fails when a catalog payload is missing from generated models', () => {
  expect(() => namespaceSwiftPayloadModels(source, new Set(['Checkout', 'MissingRequest'])))
    .toThrow('missing generated model MissingRequest');
});
