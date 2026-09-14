import {EC_METHODS} from './method_catalog.mjs';

export const swiftPayloadTypes = new Set(
  EC_METHODS.flatMap(entry => [entry.payload, entry.result].filter(Boolean)),
);

// Skip comments and string literals so changing Swift type names cannot change
// CodingKeys, enum raw values, or other wire-format strings.
const swiftTokens = /\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b[A-Za-z_]\w*\b/g;

export function namespaceSwiftPayloadModels(source, payloadTypes = swiftPayloadTypes) {
  const models = new Map(
    [...source.matchAll(/^public (?:struct|enum) (\w+):[\s\S]*?^\}/gm)]
      .map(match => [match[1], match[0]]),
  );
  const references = text => (text.match(swiftTokens) ?? [])
    .filter(token => models.has(token));
  const dependencies = roots => {
    const found = new Set();
    const visit = name => {
      if (found.has(name)) return;
      found.add(name);
      for (const dependency of references(models.get(name))) visit(dependency);
    };
    for (const root of roots) visit(root);
    return found;
  };

  for (const name of ['Checkout', 'Order', ...payloadTypes]) {
    if (!models.has(name)) {
      throw new Error(`Swift payload namespacing: missing generated model ${name}`);
    }
  }

  // Kit shares checkout fields other than ucp, and order domain models remain
  // reusable. Everything exclusive to protocol payloads belongs to the namespace.
  const checkoutFields = [...models.get('Checkout').matchAll(/^    public (?:let|var) (\w+): (.+)$/gm)];
  if (!checkoutFields.some(field => field[1] === 'ucp')) {
    throw new Error('Swift payload namespacing: missing checkout ucp field');
  }
  const shared = dependencies([
    'Order',
    ...checkoutFields.filter(field => field[1] !== 'ucp').flatMap(field => references(field[2])),
  ]);
  const namespaced = new Set([...dependencies(payloadTypes)].filter(name => !shared.has(name)));
  for (const name of payloadTypes) {
    if (!namespaced.has(name)) {
      throw new Error(`Swift payload ${name} is also a shared domain model`);
    }
  }

  return source
    .replace(swiftTokens, token => namespaced.has(token) ? `EmbeddedCheckoutProtocol.${token}` : token)
    .replace(/^public (struct|enum) EmbeddedCheckoutProtocol\.(\w+):[\s\S]*?^\}/gm, model => {
      const declaration = model.replace('EmbeddedCheckoutProtocol.', '');
      const indented = declaration.split('\n').map(line => line ? `    ${line}` : line).join('\n');
      return `extension EmbeddedCheckoutProtocol {\n${indented}\n}`;
    })
    .replace('let checkout = try Checkout(json)', 'let checkout = try EmbeddedCheckoutProtocol.Checkout(json)');
}
