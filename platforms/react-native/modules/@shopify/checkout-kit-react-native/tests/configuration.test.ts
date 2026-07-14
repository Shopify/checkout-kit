import {coerceConfigurationResult} from '../src/configuration';
import {LogLevel, ColorScheme} from '../src/enums';

describe('coerceConfigurationResult', () => {
  describe('logLevel', () => {
    it.each([
      ['debug', LogLevel.debug],
      ['warn', LogLevel.warn],
      ['error', LogLevel.error],
      ['none', LogLevel.none],
    ])('narrows %s to the LogLevel enum', (raw, expected) => {
      const result = coerceConfigurationResult({
        logLevel: raw,
        colorScheme: 'automatic',
      } as any);

      expect(result.logLevel).toBe(expected);
    });

    it('falls back to warn on an unrecognised value', () => {
      const result = coerceConfigurationResult({
        logLevel: 'verbose',
        colorScheme: 'automatic',
      } as any);

      expect(result.logLevel).toBe(LogLevel.warn);
    });
  });
});
