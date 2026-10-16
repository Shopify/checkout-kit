import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {
  buildInventory,
  kotlinApiGraph,
  kotlinDeclarations,
  kotlinExposedRoots,
  loadInventoryInputs,
  renderMarkdown,
  swiftBaselineGraph,
  swiftDeclarations,
  swiftExposedRoots,
} from './coverage_inventory.mjs';

const PROTOCOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AREA_ROOT = path.resolve(PROTOCOL_DIR, '../../..');

describe('coverage inventory', () => {
  test('committed inventory matches the public API baselines', () => {
    const inventory = buildInventory(loadInventoryInputs(AREA_ROOT));
    const message = 'Run scripts/generate_coverage_inventory.mjs after changing API baselines or models.';

    expect(readFileSync(path.join(PROTOCOL_DIR, 'covered-types.json'), 'utf8'), message).toBe(
      `${JSON.stringify(inventory, null, 2)}\n`,
    );
    expect(readFileSync(path.join(PROTOCOL_DIR, 'COVERED_TYPES.md'), 'utf8'), message).toBe(renderMarkdown(inventory));
  });

  test('reads element types that the Kotlin API file erases', () => {
    const api = [
      'public final class com/shopify/checkoutkit/Checkout {',
      '\tpublic final fun getLineItems ()Ljava/util/List;',
      '\tpublic final fun getStatus ()Lcom/shopify/ucp/embedded/checkout/CheckoutStatus;',
      '}',
    ].join('\n');
    const source = 'public class Checkout {\n    public val lineItems: List<LineItem>\n    internal val hidden: List<Secret>\n}';

    expect([...kotlinExposedRoots(api, [source], new Set(['LineItem', 'Secret', 'CheckoutStatus']))].sort()).toEqual([
      'CheckoutStatus',
      'LineItem',
    ]);
  });

  test('reads protocol types from Swift printed names, including nested namespaces', () => {
    const baseline = {children: [{printedName: '[EmbeddedCheckoutProtocol.Message]?'}, {printedName: 'EmbeddedCheckoutProtocol.EmbeddedCheckoutProtocol.Checkout'}]};

    expect([...swiftExposedRoots([baseline])].sort()).toEqual(['Checkout', 'Message']);
  });

  test('follows model fields', () => {
    const models = (entries) => new Map(entries.map(([name, fields]) => [name, fields.map(([field, type]) => ({name: field, type}))]));
    const inventory = buildInventory({
      protocolVersion: 'test',
      kotlin: {types: {models: models([['LineItem', [['item', 'Item']]], ['Item', [['title', 'String']]], ['Message', []]]), values: new Map()}, declarations: new Map(), roots: new Set(['LineItem'])},
      swift: {types: {models: models([['Message', []]]), values: new Map([['Severity', ['error']]])}, declarations: new Map(), roots: new Set(['Message', 'Severity'])},
    });

    expect(inventory.types).toEqual([
      {name: 'Item', kind: 'model', platforms: ['Kotlin'], members: ['title']},
      {name: 'LineItem', kind: 'model', platforms: ['Kotlin'], members: ['item']},
      {name: 'Message', kind: 'model', platforms: ['Swift'], members: []},
      {name: 'Severity', kind: 'value', platforms: ['Swift'], values: ['error']},
    ]);
  });

  const empty = {types: {models: new Map(), values: new Map()}, declarations: new Map(), roots: new Set()};

  test('includes hand-written protocol types the API exposes', () => {
    const declarations = swiftDeclarations([
      {file: 'JSONRPCMessage.swift', source: 'extension EmbeddedCheckoutProtocol {\n    public struct JSONRPCCheckoutParams: EventPayload {\n        public let checkout: Checkout\n    }\n}'},
    ]);
    const inventory = buildInventory({
      protocolVersion: 'test',
      kotlin: empty,
      swift: {types: {models: new Map(), values: new Map()}, declarations, roots: new Set(['JSONRPCCheckoutParams'])},
    });

    expect(inventory.types).toEqual([
      {name: 'JSONRPCCheckoutParams', kind: 'handwritten', platforms: ['Swift'], source: 'JSONRPCMessage.swift', members: ['checkout']},
    ]);
  });

  test('fails when an exposed protocol type has no declaration', () => {
    expect(() =>
      buildInventory({protocolVersion: 'test', kotlin: empty, swift: {...empty, roots: new Set(['Unknown'])}}),
    ).toThrow(/Swift: Checkout Kit exposes protocol type Unknown, but no public declaration was found/);
  });

  test('reads Kotlin hand-written declarations and their members', () => {
    const declarations = kotlinDeclarations([
      {file: 'ProtocolCodec.kt', source: '@Serializable\npublic class EcpRequest internal constructor(\n    public val jsonrpc: String = "2.0",\n    public val method: String,\n) {\n}\n\npublic fun decode(): Unit = Unit'},
    ]);

    expect(declarations.get('EcpRequest')).toEqual({file: 'ProtocolCodec.kt', members: ['jsonrpc', 'method']});
  });

  test('follows generic constraints and signatures in the Swift baseline', () => {
    const baseline = {
      kind: 'Root',
      children: [
        {
          kind: 'TypeDecl',
          name: 'RequestDescriptor',
          genericSig: '<Payload where Payload : EmbeddedCheckoutProtocol.EventPayload>',
          children: [
            {kind: 'Var', name: 'method', children: [{kind: 'TypeNominal', printedName: 'Swift.String'}]},
            {kind: 'Constructor', printedName: 'init(handler:)', genericSig: '<Handler == EmbeddedCheckoutProtocol.RequestMessage<Payload>>'},
          ],
        },
      ],
    };
    const {graph, members} = swiftBaselineGraph(baseline);

    expect([...graph.get('RequestDescriptor')].sort()).toEqual(['EventPayload', 'RequestMessage']);
    expect(members.get('RequestDescriptor')).toEqual(['method']);
  });

  test('attributes Kotlin nested helper classes to their owner', () => {
    const api = [
      'public final class com/shopify/ucp/embedded/checkout/ReadyResult$Builder {',
      '\tpublic final fun messages (Ljava/util/List;)Lcom/shopify/ucp/embedded/checkout/ReadyResult$Builder;',
      '\tpublic final fun ucp (Lcom/shopify/ucp/embedded/checkout/InstrumentsChangeResultUcp;)V',
      '}',
    ].join('\n');

    expect([...kotlinApiGraph(api, new Set(['ReadyResult', 'InstrumentsChangeResultUcp', 'Builder'])).get('ReadyResult')]).toEqual([
      'InstrumentsChangeResultUcp',
    ]);
  });

  test('keeps models with toBuilder separate and resolves nested builders to their model', () => {
    const prefix = 'com/shopify/ucp/embedded/checkout/';
    const api = [
      `public final class ${prefix}LineItem {`,
      `\tpublic final fun toBuilder ()L${prefix}LineItem$Builder;`,
      '}',
      `public final class ${prefix}LineItem$Builder {`,
      `\tpublic final fun build ()L${prefix}LineItem;`,
      '}',
      `public final class ${prefix}EmbeddedCheckoutProtocol$Options$Builder {`,
      `\tpublic final fun build ()L${prefix}EmbeddedCheckoutProtocol$Options;`,
      '}',
    ].join('\n');
    const graph = kotlinApiGraph(api, new Set(['LineItem', 'EmbeddedCheckoutProtocol', 'Options', 'Builder']));

    expect([...graph.keys()].sort()).toEqual(['LineItem', 'Options']);
    expect([...graph.get('LineItem')]).toEqual([]);
    expect([...graph.get('Options')]).toEqual([]);
  });

  test('ends Swift declarations that have no body or an empty one', () => {
    const declarations = swiftDeclarations([
      {
        file: 'Descriptors.swift',
        source: [
          'public protocol EventPayload: Decodable, Sendable {}',
          'public typealias Handler = () -> Void',
          'public struct RequestDescriptor: Sendable {',
          '    public let method: String',
          '}',
        ].join('\n'),
      },
    ]);

    expect(declarations.get('EventPayload').members).toEqual([]);
    expect(declarations.get('Handler').members).toEqual([]);
    expect(declarations.get('RequestDescriptor').members).toEqual(['method']);
  });

  test('uses Swift baseline members for hand-written types when available', () => {
    const inventory = buildInventory({
      protocolVersion: 'test',
      kotlin: empty,
      swift: {
        types: {models: new Map(), values: new Map()},
        declarations: new Map([['EventPayload', {file: 'Descriptors.swift', members: ['method']}]]),
        graph: new Map(),
        members: new Map([['EventPayload', []]]),
        roots: new Set(['EventPayload']),
      },
    });

    expect(inventory.types).toEqual([{name: 'EventPayload', kind: 'handwritten', platforms: ['Swift'], source: 'Descriptors.swift', members: []}]);
  });
});

