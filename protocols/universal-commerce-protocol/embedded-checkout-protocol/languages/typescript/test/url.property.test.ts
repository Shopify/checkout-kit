import fc from 'fast-check';
import {describe, expect, test} from 'vitest';

import {Delegations, SPEC_VERSION} from '../src/generated/ProtocolNotifications';
import {url} from '../src/url';
import {propertyOptions} from './property-options';

// Unicode scalar values include controls and supplementary characters, while
// excluding lone surrogates that encodeURIComponent cannot represent.
const text = fc.oneof(
  fc.constantFrom('', 'a b+c&d=#%', '\u0000', 'é', '🛒'),
  fc.string({unit: 'binary', maxLength: 24}),
);

const unrelatedParameter = fc.oneof(
  fc.tuple(text, text).map(([name, value]) =>
    `x_${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
  ),
  fc.constantFrom(
    'flag', 'repeat=one', 'repeat=two', 'a+b=%2B+%20', '%=kept', '%E0%A4=kept',
  ),
);

const staleParameter = fc.tuple(
  fc.constantFrom(
    'ec_version', '%65c_version', 'ec%5Fversion',
    'ec_delegate', '%65c_delegate',
    'ec_auth', '%65c_auth',
    'ec_color_scheme', '%65c_color_scheme',
  ),
  text,
).map(([name, value]) => `${name}=${encodeURIComponent(value)}`);

const input = fc.record({
  path: fc.array(text, {maxLength: 3}),
  unrelated: fc.array(unrelatedParameter, {maxLength: 8}),
  stale: fc.array(staleParameter, {maxLength: 8}),
  fragment: fc.option(text, {nil: undefined}),
  staleFirst: fc.boolean(),
}).map(({path, unrelated, stale, fragment, staleFirst}) => {
  const base = `https://shop.example/checkout${path.map(part => `/part-${encodeURIComponent(part)}`).join('')}`;
  const parameters = staleFirst ? [...stale, ...unrelated] : [...unrelated, ...stale];
  const hash = fragment === undefined ? '' : `#${encodeURIComponent(fragment)}`;
  return {base, unrelated, hash, value: `${base}?${parameters.join('&')}${hash}`};
});

const options = fc.record({
  delegations: fc.option(fc.array(
    fc.constantFrom(Delegations.windowOpen, Delegations.paymentCredential),
    {maxLength: 4},
  ), {nil: undefined}),
  auth: fc.option(text, {nil: undefined}),
  colorScheme: fc.option(text, {nil: undefined}),
});

describe('URL properties', () => {
  test('decoration is idempotent', () => {
    fc.assert(fc.property(input, options, (original, configuration) => {
      const once = url(original.value, configuration);
      expect(url(once, configuration)).toBe(once);
    }), propertyOptions());
  });

  test('the latest options replace all previous protocol options', () => {
    fc.assert(fc.property(input, options, options, (original, first, latest) => {
      expect(url(url(original.value, first), latest)).toBe(url(original.value, latest));
    }), propertyOptions());
  });

  test('preserves unrelated raw parameters and replaces controlled parameters', () => {
    fc.assert(fc.property(input, options, (original, configuration) => {
      const result = url(original.value, configuration);
      const withoutHash = result.split('#')[0]!;
      const rawParameters = withoutHash.slice(withoutHash.indexOf('?') + 1).split('&');
      const params = new URL(result).searchParams;

      expect(result.startsWith(`${original.base}?`)).toBe(true);
      expect(result.slice(withoutHash.length)).toBe(original.hash);
      // Check original bytes, including duplicates, '+', flags and malformed
      // percent escapes. A decoded-value comparison would miss normalization.
      expect(rawParameters.filter(part => original.unrelated.includes(part)))
        .toEqual(original.unrelated);
      expect(params.getAll('ec_version')).toEqual([SPEC_VERSION]);
      expect(params.getAll('ec_delegate')).toEqual(
        configuration.delegations !== undefined && configuration.delegations.length > 0
          ? [configuration.delegations.join(',')] : [],
      );
      expect(params.getAll('ec_auth')).toEqual(
        configuration.auth === undefined ? [] : [configuration.auth],
      );
      expect(params.getAll('ec_color_scheme')).toEqual(
        configuration.colorScheme === undefined ? [] : [configuration.colorScheme],
      );
    }), propertyOptions());
  });
});
