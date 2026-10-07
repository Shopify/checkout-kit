import {afterEach, expect, test, vi} from 'vitest';

import {encodeRenameMap} from '../../../scripts/generate_typescript_rename_map.mjs';
import type {RenameEntry} from '../src/generated/ProtocolRenameMap';
import {decodeRenameMap} from '../src/protocol_rename_map';

const fields = ['nested_value', 'reference_value', 'array_values', 'map_values', 'union_value', 'map_union_value'];
const entries: RenameEntry[][] = [
  [
    [1, [0, 1]],
    [2, [1, [0, 1]]],
    [3, [2, [0, 1]]],
    [4, [3, [1, [0, 1]], [0, 1]]],
    [5, [3, [2, [0, 1]], [1, [0, 1]]]],
  ],
  [[0]],
];

afterEach(() => {
  vi.doUnmock('../src/generated/ProtocolRenameMap');
  vi.resetModules();
  vi.restoreAllMocks();
});

test('decodes all child variants from generator output', () => {
  const encoded = encodeRenameMap(entries);
  expect(decodeRenameMap(encoded)).toEqual(entries);
  expect(decodeRenameMap(encoded)).toEqual(entries);
});

test.each([0, 1, 89, 90, 91, 92, 182, 8280, 8281, Number.MAX_SAFE_INTEGER])(
  'preserves encoded integer %s',
  value => {
    const map: RenameEntry[][] = [[[value, [0, value]]]];
    expect(decodeRenameMap(encodeRenameMap(map))).toEqual(map);
  },
);

test.each([
  [0, '!'],
  [90, '}'],
  [91, '~#!'],
  [92, '~##'],
  [8280, '~}}'],
  [8281, '~~#!!'],
] as const)('uses the expected wire representation for %s', (value, symbol) => {
  const map: RenameEntry[][] = [[[value]]];
  const encoded = `##${symbol}!`;
  expect(encodeRenameMap(map)).toBe(encoded);
  expect(decodeRenameMap(encoded)).toEqual(map);
});

test.each([91, 92, 182])('supports %s models and entries', count => {
  const map: RenameEntry[][] = Array.from({length: count}, () => []);
  map[count - 1] = Array.from({length: count}, (_, field) => [field]);
  expect(decodeRenameMap(encodeRenameMap(map))).toEqual(map);
});

test.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'rejects invalid encoded integer %s',
  value => {
    expect(() => encodeRenameMap([[[value]]])).toThrow('Invalid rename map integer');
  },
);

test('renames synthetic references, arrays, maps and both union branches', async () => {
  vi.doMock('../src/generated/ProtocolRenameMap', () => ({
    CheckoutModel: -1,
    ErrorResponseModel: -2,
    FulfillmentOptionModel: -3,
    ReadyRequestModel: -4,
    WindowOpenRequestModel: -5,
    encodedRenameMap: encodeRenameMap(entries),
    renameFields: fields,
  }));
  const {decodeProtocolObject, encodeProtocolObject} = await import('../src/protocol_codec_runtime');
  for (const arrayUnion of [false, true]) {
    const wire = {
      reference_value: {nested_value: 'reference'},
      array_values: [{nested_value: 'array'}],
      map_values: {key: {nested_value: 'map'}},
      union_value: arrayUnion ? [{nested_value: 'union'}] : {nested_value: 'union'},
      map_union_value: {key: {nested_value: 'map union'}},
      extension_data: {nested_value: 'unchanged'},
    };
    const expected = {
      referenceValue: {nestedValue: 'reference'},
      arrayValues: [{nestedValue: 'array'}],
      mapValues: {key: {nestedValue: 'map'}},
      unionValue: arrayUnion ? [{nestedValue: 'union'}] : {nestedValue: 'union'},
      mapUnionValue: {key: {nestedValue: 'map union'}},
      extension_data: {nested_value: 'unchanged'},
    };
    expect(decodeProtocolObject(wire, 0, 'Synthetic')).toEqual(expected);
    expect(encodeProtocolObject(expected, 0)).toEqual(wire);
  }
});

test('renames fields through model and field IDs beyond the single-symbol range', async () => {
  const largeMap: RenameEntry[][] = Array.from({length: 93}, () => []);
  largeMap[0] = [[91, [0, 92]]];
  largeMap[92] = [[92]];
  vi.doMock('../src/generated/ProtocolRenameMap', () => ({
    CheckoutModel: -1,
    ErrorResponseModel: -2,
    FulfillmentOptionModel: -3,
    ReadyRequestModel: -4,
    WindowOpenRequestModel: -5,
    encodedRenameMap: encodeRenameMap(largeMap),
    renameFields: Array.from({length: 93}, (_, index) => `field_${index}_name`),
  }));
  const {decodeProtocolObject, encodeProtocolObject} = await import('../src/protocol_codec_runtime');
  const wire = {field_91_name: {field_92_name: 'value'}};
  const expected = {field_91Name: {field_92Name: 'value'}};
  expect(decodeProtocolObject(wire, 0, 'Synthetic')).toEqual(expected);
  expect(encodeProtocolObject(expected, 0)).toEqual(wire);
});

test('reuses derived names across repeated objects and both directions', async () => {
  vi.doMock('../src/generated/ProtocolRenameMap', () => ({
    CheckoutModel: -1,
    ErrorResponseModel: -2,
    FulfillmentOptionModel: -3,
    ReadyRequestModel: -4,
    WindowOpenRequestModel: -5,
    encodedRenameMap: encodeRenameMap(entries),
    renameFields: fields,
  }));
  const {decodeProtocolObject, encodeProtocolObject} = await import('../src/protocol_codec_runtime');
  const replace = vi.spyOn(String.prototype, 'replace');
  const wire = {array_values: Array.from({length: 100}, () => ({nested_value: 'value'}))};
  const decoded = decodeProtocolObject(wire, 0, 'Synthetic');
  const encoded = encodeProtocolObject(decoded, 0);
  const repeated = decodeProtocolObject(wire, 0, 'Synthetic');
  const conversions = replace.mock.calls.length;
  replace.mockRestore();
  expect(conversions).toBe(0);
  expect(decoded).toEqual({arrayValues: Array.from({length: 100}, () => ({nestedValue: 'value'}))});
  expect(repeated).toEqual(decoded);
  expect(encoded).toEqual(wire);
});
