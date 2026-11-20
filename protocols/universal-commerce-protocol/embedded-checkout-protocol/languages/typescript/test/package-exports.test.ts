import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {describe, expect, test} from 'vitest';

import {
  Delegations as RootDelegations,
  EmbeddedCheckoutProtocol as PublicProtocol,
  SPEC_VERSION as rootSpecVersion,
  notificationDescriptors as rootNotificationDescriptors,
  requestDescriptors as rootRequestDescriptors,
  url as rootUrl,
} from '@shopify/embedded-checkout-protocol';
import {
  Delegations as PublicDelegations,
  SPEC_VERSION as publicSpecVersion,
  notificationDescriptors as publicNotificationDescriptors,
  requestDescriptors as publicRequestDescriptors,
} from '@shopify/embedded-checkout-protocol/notifications';
import {url as publicUrl} from '@shopify/embedded-checkout-protocol/url';

import {EmbeddedCheckoutProtocol} from '../src/embedded_checkout_protocol';
import {url} from '../src/url';
import {
  Delegations,
  SPEC_VERSION,
  notificationDescriptors,
  requestDescriptors,
} from '../src/generated/ProtocolNotifications';

describe('package exports', () => {
  test('accepts public type imports and rejects generated source imports', () => {
    const fixture = fileURLToPath(new URL('./fixtures/package-exports.ts', import.meta.url));
    const program = ts.createProgram([fixture], {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);

    expect(diagnostics.map(diagnostic =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )).toEqual([]);
  });

  test('preserves the root entry point', () => {
    expect(PublicProtocol).toBe(EmbeddedCheckoutProtocol);
    expect(RootDelegations).toBe(Delegations);
    expect(rootSpecVersion).toBe(SPEC_VERSION);
    expect(rootNotificationDescriptors).toBe(notificationDescriptors);
    expect(rootRequestDescriptors).toBe(requestDescriptors);
    expect(rootUrl).toBe(url);
  });

  test('exports granular protocol notifications', () => {
    expect(PublicDelegations).toBe(Delegations);
    expect(publicSpecVersion).toBe(SPEC_VERSION);
    expect(publicNotificationDescriptors).toBe(notificationDescriptors);
    expect(publicRequestDescriptors).toBe(requestDescriptors);
  });

  test('exports the protocol URL helper', () => {
    expect(publicUrl).toBe(url);
  });
});
