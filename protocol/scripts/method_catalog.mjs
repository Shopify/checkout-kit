import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const protocolRoot = path.resolve(scriptDir, '..');

const openRpcPath = path.resolve(
  protocolRoot,
  'services/shopping/embedded.openrpc.json',
);
const openRpcDir = path.dirname(openRpcPath);

const fallbackPayload = 'JSONAny';

const refPayloadMappings = new Map([
  ['checkout.json', 'Checkout'],
  ['cart.json', fallbackPayload],
  ['types/error_response.json', 'ErrorResponse'],
  ['error_response.json', 'ErrorResponse'],
]);

function normalizeRef(ref) {
  return ref
    .replace(/^\.\.\/\.\.\/schemas\/shopping\//, '')
    .replace(/^\.\.\/\.\.\/schemas\/common\//, '')
    .replace(/#.*$/, '');
}

// `ec.line_items.change` -> `lineItemsChange`. The leading `ec` capability
// segment is dropped; the enclosing namespace already conveys it.
export function methodNameToIdentifier(methodName) {
  const parts = methodName
    .replace(/^ec\./, '')
    .split(/[._]/g)
    .filter(Boolean);

  return parts
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}

// `payment.instruments_change` -> `paymentInstrumentsChange`.
export function delegationToIdentifier(delegation) {
  return delegation
    .split(/[._]/g)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}

// Public name of a request descriptor: delegated requests are named after the
// delegation (`paymentInstrumentsChange`), core requests after the method
// (`ready`). Keeps the descriptor surface stable as methods gain `_request`
// suffixes.
function descriptorIdentifier(methodName, delegation) {
  return delegation
    ? delegationToIdentifier(delegation)
    : methodNameToIdentifier(methodName);
}

function resolvePointer(doc, pointer) {
  if (!pointer) return doc;

  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((node, rawSegment) => {
      if (node == null) return undefined;
      const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
      return node[segment];
    }, doc);
}

function resolveMethod(rawMethod, baseDir) {
  const ref = rawMethod?.$ref;
  if (typeof ref !== 'string') {
    return {method: rawMethod, baseDir};
  }

  const [relativePath, pointer = ''] = ref.split('#');
  const targetPath = path.resolve(baseDir, relativePath);
  const targetDoc = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

  return {
    method: resolvePointer(targetDoc, pointer),
    baseDir: path.dirname(targetPath),
  };
}

function notificationPayload(method) {
  const ref = method.params?.[0]?.schema?.$ref;
  if (typeof ref !== 'string') {
    return fallbackPayload;
  }

  return refPayloadMappings.get(normalizeRef(ref)) ?? fallbackPayload;
}

// A result-bearing method `ec.<x>_request` binds to delegation `<x>` when `<x>`
// is declared in `x-delegations`; core requests (`ec.ready`, `ec.auth`) have no
// delegation.
function delegationForMethod(methodName, delegationSet) {
  if (!methodName.endsWith('_request')) {
    return null;
  }

  const candidate = methodName.replace(/^ec\./, '').replace(/_request$/, '');
  return delegationSet.has(candidate) ? candidate : null;
}

// Payment-instrument schema shared by the instruments-change and ready result
// extractions; only the local title differs.
function selectedInstrumentPayment(title) {
  return {
    title,
    description: 'Payment instruments with selected instrument ID.',
    allOf: [
      {$ref: 'checkout.json#/properties/payment'},
      {
        type: 'object',
        properties: {
          selected_instrument_id: {
            type: 'string',
            description: 'ID of the selected payment instrument.',
          },
        },
      },
    ],
  };
}

// Request payload/result types the model generator synthesizes from the spec.
// `rootTitle`s here are the canonical Swift/Kotlin/TS type names; the Swift
// catalog reads them back to emit fully-typed descriptors. `kind` selects the
// extraction (`params` -> request payload, `result` -> response payload).
export const MODEL_EXTRACTIONS = [
  {
    kind: 'result',
    method: 'ec.payment.instruments_change_request',
    outputFile: 'instruments_change_result.json',
    rootTitle: 'InstrumentsChangeResult',
    checkoutTitle: 'InstrumentsChangeCheckout',
    paymentSchema: selectedInstrumentPayment('InstrumentsChangePayment'),
  },
  {
    kind: 'result',
    method: 'ec.payment.credential_request',
    outputFile: 'credential_result.json',
    rootTitle: 'CredentialResult',
    checkoutTitle: 'CredentialCheckout',
    paymentSchema: {$ref: 'checkout.json#/properties/payment'},
  },
  {
    kind: 'params',
    method: 'ec.ready',
    outputFile: 'ready_request.json',
    rootTitle: 'ReadyRequest',
  },
  {
    kind: 'result',
    method: 'ec.ready',
    outputFile: 'ready_result.json',
    rootTitle: 'ReadyResult',
    checkoutTitle: 'ReadyCheckout',
    paymentSchema: selectedInstrumentPayment('ReadyPayment'),
  },
  {
    kind: 'params',
    method: 'ec.auth',
    outputFile: 'auth_request.json',
    rootTitle: 'AuthRequest',
  },
  {
    kind: 'result',
    method: 'ec.auth',
    outputFile: 'auth_result.json',
    rootTitle: 'AuthResult',
  },
];

// Per-request binding the spec cannot express: the Swift payload/result type
// names and the decode strategy. `home` is `protocol` when the typed descriptor
// is generated into the protocol package, or `kit` when only the method string
// is generated and the descriptor is hand-authored in the kit (`window.open`,
// whose result encoding is host policy).
//
// `decode`:
//   - `whole`          decode the params object into `payload` (ready/auth).
//   - `checkoutUnwrap` decode `JSONRPCCheckoutParams.checkout` -> `Checkout`.
const REQUEST_BINDINGS = new Map([
  ['ec.ready', {payload: 'ReadyRequest', result: 'ReadyResult', decode: 'whole', home: 'protocol'}],
  ['ec.auth', {payload: 'AuthRequest', result: 'AuthResult', decode: 'whole', home: 'protocol'}],
  ['ec.payment.instruments_change_request', {payload: 'Checkout', result: 'InstrumentsChangeResult', decode: 'checkoutUnwrap', home: 'protocol'}],
  ['ec.payment.credential_request', {payload: 'Checkout', result: 'CredentialResult', decode: 'checkoutUnwrap', home: 'protocol'}],
  ['ec.window.open_request', {payload: 'WindowOpenRequest', result: 'WindowOpenResult', decode: 'whole', home: 'kit'}],
  ['ec.fulfillment.address_change_request', {payload: 'Checkout', result: 'AddressChangeResult', decode: 'checkoutUnwrap', home: 'protocol'}],
]);

function buildCatalog() {
  const openRpc = JSON.parse(fs.readFileSync(openRpcPath, 'utf8'));
  const delegationSet = new Set(openRpc['x-delegations'] ?? []);

  const methods = [];
  for (const rawMethod of openRpc.methods ?? []) {
    const {method} = resolveMethod(rawMethod, openRpcDir);
    if (typeof method?.name !== 'string' || !method.name.startsWith('ec.')) {
      continue;
    }

    const identifier = methodNameToIdentifier(method.name);

    if (method.result != null) {
      const binding = REQUEST_BINDINGS.get(method.name);
      if (binding === undefined) {
        throw new Error(`No request binding for ${method.name}`);
      }
      const delegation = delegationForMethod(method.name, delegationSet);
      methods.push({
        kind: 'request',
        method: method.name,
        identifier,
        descriptorIdentifier: descriptorIdentifier(method.name, delegation),
        payload: binding.payload,
        result: binding.result,
        decode: binding.decode,
        home: binding.home,
        delegation,
      });
    } else {
      methods.push({
        kind: 'notification',
        method: method.name,
        identifier,
        payload: notificationPayload(method),
      });
    }
  }

  const delegations = (openRpc['x-delegations'] ?? []).map(value => ({
    identifier: delegationToIdentifier(value),
    value,
  }));

  return {methods, delegations};
}

const catalog = buildCatalog();

// Ordered catalog of every `ec.*` method, in spec order. Notifications carry a
// `payload`; requests additionally carry `result`, `decode`, `home`,
// `delegation`, and `descriptorIdentifier`.
export const EC_METHODS = catalog.methods;

// Delegations declared by the service in `x-delegations`, pre-mapped to Swift
// identifiers.
export const DELEGATIONS = catalog.delegations;
