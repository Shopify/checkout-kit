import {test, expect} from 'vitest';

import {assertResultsAreGenerated, EC_METHODS} from './method_catalog.mjs';

test('the live manifest generates every bound request result', () => {
  expect(() => assertResultsAreGenerated()).not.toThrow();
});

test('throws when a bound result is not declared in MODEL_EXTRACTIONS', () => {
  const bindings = new Map([
    ['ec.fulfillment.address_change_request', {result: 'AddressChangeResult'}],
  ]);
  const extractions = [];

  expect(() => assertResultsAreGenerated(bindings, extractions)).toThrow(
    /AddressChangeResult.*not generated/,
  );
});

test('passes when every bound result has a matching result extraction', () => {
  const bindings = new Map([
    ['ec.fulfillment.address_change_request', {result: 'AddressChangeResult'}],
  ]);
  const extractions = [
    {kind: 'result', rootTitle: 'AddressChangeResult'},
    {kind: 'params', rootTitle: 'AddressChangeRequest'},
  ];

  expect(() => assertResultsAreGenerated(bindings, extractions)).not.toThrow();
});

test('every generated request result is reachable from the catalog', () => {
  const boundResults = EC_METHODS.filter(entry => entry.kind === 'request').map(
    entry => entry.result,
  );

  expect(boundResults).toContain('AddressChangeResult');
});
