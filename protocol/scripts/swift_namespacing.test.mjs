import {expect, test} from 'vitest';
import {namespaceSwiftPayloadModels, swiftPayloadTypes} from './swift_namespacing.mjs';

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

test('qualifies every payload example and exclusive helper without rewriting shared examples or prose', () => {
  const names = [...swiftPayloadTypes, 'ResultDetails', 'Order', 'Buyer'];
  const examples = names.map(name => `//   let value = try ${name}(json)`).join('\n');
  const extraModels = [...swiftPayloadTypes].filter(name => name !== 'Checkout')
    .map(name => `public struct ${name}: Codable {\n    public let details: ResultDetails\n}`).join('\n');
  const header = '// To parse the JSON, add this file to your project and do:';
  const result = namespaceSwiftPayloadModels(`${header}\n${examples}\n// Checkout and Result are protocol models.\n${source}\n${extraModels}`);

  expect(result).toContain('// To parse JSON with the protocol models, use:');
  expect(result).not.toContain('add this file to your project');
  for (const name of [...swiftPayloadTypes, 'ResultDetails']) {
    expect(result).toContain(`//   let value = try EmbeddedCheckoutProtocol.${name}(json)`);
  }
  for (const name of ['Order', 'Buyer']) {
    expect(result).toContain(`//   let value = try ${name}(json)`);
  }
  expect(result).toContain('// Checkout and Result are protocol models.');
});

test('fails if a payload becomes reachable through shared domain models', () => {
  const sharedPayload = source.replace('public let name: String', 'public let result: Result');
  expect(() => namespaceSwiftPayloadModels(sharedPayload, new Set(['Checkout', 'Result'])))
    .toThrow('Swift payload Result is also a shared domain model');
});

test('fails if checkout no longer has the protocol metadata field used to separate shared types', () => {
  expect(() => namespaceSwiftPayloadModels(source.replace('public let ucp: Metadata', ''), new Set(['Checkout'])))
    .toThrow('missing checkout ucp field');
});
