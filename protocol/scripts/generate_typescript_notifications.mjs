#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  DELEGATIONS,
  EC_METHODS,
  delegationToIdentifier,
} from './method_catalog.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const protocolRoot = path.resolve(scriptDir, '..');

const outputPath = path.resolve(
  protocolRoot,
  'languages/typescript/src/generated/ProtocolNotifications.ts',
);

const SPEC_VERSION = '2026-04-08';

// TypeScript-specific notification decode wiring: each payload model maps to its
// generated codec function and the JSON-RPC params wrapper key it arrives under
// on the wire. Mirrors the Swift/Kotlin catalogs' per-payload bindings. A
// notification whose payload has no binding fails loudly rather than silently
// dropping out of the catalog.
const NOTIFICATION_BINDINGS = new Map([
  ['Checkout', {decoder: 'decodeCheckout', wrapperKey: 'checkout'}],
  ['ErrorResponse', {decoder: 'decodeErrorResponse', wrapperKey: 'error'}],
]);

function notificationBinding(entry) {
  const binding = NOTIFICATION_BINDINGS.get(entry.payload);
  if (binding === undefined) {
    throw new Error(
      `No TypeScript notification binding for payload ${entry.payload} (${entry.method})`,
    );
  }
  return binding;
}

// A descriptor consumes raw JSON-RPC `params` from `Client.process` and returns
// the camelized `params` envelope unchanged in shape: it camelizes the wrapped
// payload but re-wraps it under the same `{wrapperKey: ...}` key so the client
// can assemble the full JSON-RPC message it hands to handlers. The kits narrow
// `.params.<wrapperKey>` on their own side.
function notificationDecodeExpr(binding) {
  return (
    `params => ({${binding.wrapperKey}: ${binding.decoder}((params as {${binding.wrapperKey}: unknown}).${binding.wrapperKey})})`
  );
}

// TypeScript request decode wiring. `whole` decodes the params object straight
// into the payload type (ready/auth); `checkoutUnwrap` camelizes the wrapped
// checkout and re-wraps it under `{checkout}`. Both return the `params` envelope
// the client frames into the full JSON-RPC message. Mirrors the Swift/Kotlin
// catalogs' decode closures.
function requestDecodeExpr(entry) {
  switch (entry.decode) {
    case 'whole':
      return `params => decode${entry.payload}(params ?? {})`;
    case 'checkoutUnwrap':
      return `params => ({checkout: decodeCheckout((params as {checkout: unknown}).checkout)})`;
    default:
      throw new Error(`Unknown decode strategy: ${entry.decode} (${entry.method})`);
  }
}

// The `params` type each request's descriptor produces: `whole` yields the bare
// payload; `checkoutUnwrap` yields the `{checkout}` wrapper.
function requestParamsType(entry) {
  switch (entry.decode) {
    case 'whole':
      return entry.payload;
    case 'checkoutUnwrap':
      return '{checkout: Checkout}';
    default:
      throw new Error(`Unknown decode strategy: ${entry.decode} (${entry.method})`);
  }
}

function requestEncodeExpr(entry) {
  return `(result: ${entry.result}) => encode${entry.result}(result)`;
}

function requestDelegationExpr(entry) {
  if (entry.delegation === null) {
    return 'null';
  }
  return `Delegations.${delegationToIdentifier(entry.delegation)}`;
}

function collectNotifications() {
  return EC_METHODS.filter(entry => entry.kind === 'notification').map(
    entry => {
      const binding = notificationBinding(entry);
      return {
        identifier: entry.identifier,
        method: entry.method,
        typeName: entry.payload,
        wrapperKey: binding.wrapperKey,
        paramsType: `{${binding.wrapperKey}: ${entry.payload}}`,
        decoder: binding.decoder,
        decodeExpr: notificationDecodeExpr(binding),
      };
    },
  );
}

function collectRequests() {
  return EC_METHODS.filter(entry => entry.kind === 'request').map(entry => ({
    identifier: entry.descriptorIdentifier,
    method: entry.method,
    payload: entry.payload,
    result: entry.result,
    paramsType: requestParamsType(entry),
    decodeExpr: requestDecodeExpr(entry),
    encodeExpr: requestEncodeExpr(entry),
    delegationExpr: requestDelegationExpr(entry),
  }));
}

function modelImports(notifications, requests) {
  const names = new Set();
  for (const notification of notifications) {
    names.add(notification.typeName);
  }
  for (const request of requests) {
    names.add(request.payload);
    names.add(request.result);
  }
  return Array.from(names).sort();
}

function renderModule(notifications, requests) {
  const typeNames = modelImports(notifications, requests);
  const allMethods = EC_METHODS.map(entry => entry.method);
  const codecNames = new Set();
  for (const notification of notifications) {
    codecNames.add(`decode${notification.typeName}`);
  }
  for (const request of requests) {
    codecNames.add(`decode${request.payload}`);
    codecNames.add(`encode${request.result}`);
  }
  const typeAliases = typeNames
    .map(typeName => `type ${typeName} = import('./Models').${typeName};`)
    .join('\n');

  return `// This file is generated by protocol/scripts/generate_typescript_notifications.mjs.
// Do not edit directly.

import {notificationDescriptor, requestDescriptor, type NotificationDescriptor, type NotificationMessage, type RequestDescriptor, type RequestMessage} from '../descriptors';
import {${Array.from(codecNames).sort().join(', ')}} from './ProtocolCodecs';

${typeAliases}

export const SPEC_VERSION = '${SPEC_VERSION}';

export const Delegations = {
${DELEGATIONS.map(
  delegation => `  ${delegation.identifier}: '${delegation.value}',`,
).join('\n')}
} as const;

export type Delegation =
  | (typeof Delegations)[keyof typeof Delegations]
  | (string & {});

export const checkoutProtocolCatalog = {
${notifications
  .map(
    notification => `  ${notification.identifier}: '${notification.method}',`,
  )
  .join('\n')}
} as const;

export type CheckoutProtocolCatalogMethod =
  (typeof checkoutProtocolCatalog)[keyof typeof checkoutProtocolCatalog];

export interface CheckoutProtocolCatalogPayloads {
${notifications
  .map(
    notification => `  '${notification.method}': ${notification.typeName};`,
  )
  .join('\n')}
}

export interface CheckoutProtocolCatalogParams {
${notifications
  .map(notification => `  '${notification.method}': ${notification.paramsType};`)
  .join('\n')}
}

export type CheckoutProtocolNotificationMessage = {
  [K in keyof CheckoutProtocolCatalogParams]: NotificationMessage<
    K,
    CheckoutProtocolCatalogParams[K]
  >;
}[keyof CheckoutProtocolCatalogParams];

export type CheckoutProtocolCatalogPayloadDecoder<
  K extends keyof CheckoutProtocolCatalogPayloads,
> = (payload: unknown) => CheckoutProtocolCatalogPayloads[K];

export const checkoutProtocolCatalogPayloadDecoders = {
${notifications
  .map(
    notification =>
      `  [checkoutProtocolCatalog.${notification.identifier}]: decode${notification.typeName},`,
  )
  .join('\n')}
} satisfies {
  [K in keyof CheckoutProtocolCatalogPayloads]:
    CheckoutProtocolCatalogPayloadDecoder<K>;
};

export const notificationDescriptors = {
${notifications
  .map(
    notification =>
      `  ${notification.identifier}: notificationDescriptor(
    checkoutProtocolCatalog.${notification.identifier},
    ${notification.decodeExpr},
  ),`,
  )
  .join('\n')}
} satisfies {
  [K in keyof typeof checkoutProtocolCatalog]: NotificationDescriptor<
    NotificationMessage<
      (typeof checkoutProtocolCatalog)[K],
      CheckoutProtocolCatalogParams[(typeof checkoutProtocolCatalog)[K]]
    >
  >;
};

export const checkoutProtocolRequestCatalog = {
${requests.map(request => `  ${request.identifier}: '${request.method}',`).join('\n')}
} as const;

export type CheckoutProtocolRequestMethod =
  (typeof checkoutProtocolRequestCatalog)[keyof typeof checkoutProtocolRequestCatalog];

export interface CheckoutProtocolRequestPayloads {
${requests.map(request => `  '${request.method}': ${request.payload};`).join('\n')}
}

export interface CheckoutProtocolRequestResults {
${requests.map(request => `  '${request.method}': ${request.result};`).join('\n')}
}

export interface CheckoutProtocolRequestParams {
${requests.map(request => `  '${request.method}': ${request.paramsType};`).join('\n')}
}

export type CheckoutProtocolRequestMessage = {
  [K in keyof CheckoutProtocolRequestParams]: RequestMessage<
    K,
    CheckoutProtocolRequestParams[K]
  >;
}[keyof CheckoutProtocolRequestParams];

export const requestDescriptors = {
${requests
  .map(
    request =>
      `  ${request.identifier}: requestDescriptor(
    checkoutProtocolRequestCatalog.${request.identifier},
    ${request.delegationExpr},
    ${request.decodeExpr},
    ${request.encodeExpr},
  ),`,
  )
  .join('\n')}
} satisfies {
  [K in keyof typeof checkoutProtocolRequestCatalog]: RequestDescriptor<
    RequestMessage<
      (typeof checkoutProtocolRequestCatalog)[K],
      CheckoutProtocolRequestParams[(typeof checkoutProtocolRequestCatalog)[K]]
    >,
    CheckoutProtocolRequestResults[(typeof checkoutProtocolRequestCatalog)[K]]
  >;
};

export const embeddedCheckoutMethods: ReadonlySet<string> = new Set([
${allMethods.map(method => `  '${method}',`).join('\n')}
]);
`;
}

function main() {
  const notifications = collectNotifications();
  const requests = collectRequests();
  const generated = renderModule(notifications, requests);
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, generated);
  console.log(`Generated ${outputPath}`);
}

main();
