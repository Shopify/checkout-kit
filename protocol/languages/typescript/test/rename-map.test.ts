import {describe, expect, it} from 'vitest';

import {parseTypeMap} from '../../../scripts/generate_typescript_rename_map.mjs';

describe('quicktype type map declaration', () => {
  it.each(['const', 'export const'])('accepts %s declarations', (declaration) => {
    const map = parseTypeMap(
      declaration + ' typeMap: any = {"Example": o([{json: "map_order", js: "mapOrder", typ: a("")}], "any")};\n',
    );
    expect(map.Example.props[0]).toEqual({json: 'map_order', js: 'mapOrder', typ: {arrayItems: ''}});
  });

  it('fails clearly when quicktype changes the declaration shape', () => {
    expect(() => parseTypeMap('const renamed = {};')).toThrow('Expected quicktype const or export const typeMap object');
  });
});
