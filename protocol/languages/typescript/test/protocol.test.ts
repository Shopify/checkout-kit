import {describe, test, expect} from 'vitest';

import {decodeProtocolPayload} from '../src/protocol';

describe('decodeProtocolPayload', () => {
  test('decodes and camelizes a known method payload', () => {
    const decoded = decodeProtocolPayload('ec.start', {
      id: 'checkout-123',
      currency: 'USD',
      line_items: [],
      links: [],
      status: 'incomplete',
      totals: [],
      ucp: {version: '2026-04-08'},
    }) as Record<string, unknown>;

    expect(decoded.lineItems).toEqual([]);
    expect('line_items' in decoded).toBe(false);
  });

  test('returns undefined for an unknown method', () => {
    expect(decodeProtocolPayload('ec.unknown', {})).toBeUndefined();
  });
});
