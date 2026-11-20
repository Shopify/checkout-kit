import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectPodspec, inspectSwiftPackage} from './check-swift-dependencies.mjs';

const manifest = (dependencies, type = 'regular') => ({
  dependencies: [{sourceControl: [{identity: 'viewinspector'}]}],
  products: [{name: 'ShopifyCheckoutKit', targets: ['ShopifyCheckoutKit']}],
  targets: [
    {name: 'EmbeddedCheckoutProtocol', type: 'regular', dependencies: []},
    {name: 'ShopifyCheckoutKit', type, dependencies},
  ],
});

test('accepts local targets and external packages used only by test targets', () => {
  const packageDump = manifest([{byName: ['EmbeddedCheckoutProtocol', null]}]);
  packageDump.targets.push({
    name: 'ShopifyCheckoutKitTests', type: 'test',
    dependencies: [{byName: ['ShopifyCheckoutKit', null]}, {product: ['ViewInspector', 'ViewInspector', null, null]}],
  });
  assert.deepEqual(inspectSwiftPackage(packageDump), []);
  const root = new URL('../', import.meta.url);
  assert.deepEqual(inspectPodspec(readFileSync(new URL('ShopifyCheckoutKit.podspec', root), 'utf8')), []);
});

test('rejects external products in shipped targets', () => {
  const errors = inspectSwiftPackage(manifest([{product: ['SomeLibrary', 'SomeLibrary', null, null]}]));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /target ShopifyCheckoutKit depends on external package SomeLibrary, which is not an approved runtime dependency/);
});

test('rejects external products referenced by bare name in shipped targets', () => {
  const errors = inspectSwiftPackage(manifest([{byName: ['SomeLibrary', null]}]));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /target ShopifyCheckoutKit depends on SomeLibrary, which is not a target in this package/);
});

test('rejects a remote binary target reachable from a shipped product', () => {
  const packageDump = manifest([{byName: ['BinarySDK', null]}]);
  packageDump.targets.push({name: 'BinarySDK', type: 'binary', url: 'https://example.com/BinarySDK.zip', dependencies: []});
  assert.match(inspectSwiftPackage(packageDump).join('\n'), /product depends on remote binary target BinarySDK/);
});

test('allows a remote binary target used only by tests', () => {
  const packageDump = manifest([]);
  packageDump.targets.push({name: 'BinarySDK', type: 'binary', url: 'https://example.com/BinarySDK.zip', dependencies: []});
  packageDump.targets.push({name: 'CheckoutTests', type: 'test', dependencies: [{byName: ['BinarySDK', null]}]});
  assert.deepEqual(inspectSwiftPackage(packageDump), []);
});

test('fails closed for unknown dependency shapes', () => {
  assert.throws(() => inspectSwiftPackage(manifest([{futureDependency: ['SomeLibrary']}])), /Unexpected swift package dump-package dependency/);
});

test('allows podspec dependencies on its own subspecs only', () => {
  assert.deepEqual(inspectPodspec(`s.subspec 'A' do |a|\n  # a.dependency 'Alamofire'\n  a.dependency 'ShopifyCheckoutKit/Core'\nend`), []);
  const errors = inspectPodspec(`s.dependency "Alamofire", "~> 5.0"`);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /dependency Alamofire is not an approved runtime dependency/);
});
