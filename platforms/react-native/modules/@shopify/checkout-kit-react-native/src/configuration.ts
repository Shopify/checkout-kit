import {ColorScheme, LogLevel} from './enums';
import type {Configuration} from './index.d';
import type RNShopifyCheckoutKit from './specs/NativeShopifyCheckoutKit';

// TurboModule codegen doesn't support TypeScript string literal unions or
// enums — spec types collapse to plain `string`. These sets are used by the
// coercion helpers below to narrow the string back to the consumer-facing
// enum, falling back to a safe default if native returns an unknown value.
const colorSchemeValues: ReadonlySet<string> = new Set(
  Object.values(ColorScheme),
);
const logLevelValues: ReadonlySet<string> = new Set(Object.values(LogLevel));

type NativeConfigurationResult = ReturnType<
  typeof RNShopifyCheckoutKit.getConfig
>;

/**
 * Coerces a native Configuration result into the consumer-facing
 * Configuration type.
 *
 * The TurboModule codegen spec can only express primitive types — string
 * literal unions and TypeScript enums collapse to plain `string` at the
 * bridge boundary. On the JS side consumers expect the typed `ColorScheme`
 * and `LogLevel` enums, so we coerce those two fields here. The rest of
 * the payload passes through unchanged.
 */
export function coerceConfigurationResult(
  raw: NativeConfigurationResult,
): Configuration {
  return {
    ...raw,
    logLevel: coerceLogLevel(raw.logLevel),
    colorScheme: coerceColorScheme(raw.colorScheme),
  } as Configuration;
}

/**
 * Narrows a raw string from the native bridge to the ColorScheme enum.
 * Falls back to `automatic` if the native side returns an unrecognised
 * value (e.g. future SDK version adds a new scheme).
 */
function coerceColorScheme(value: string): ColorScheme {
  return colorSchemeValues.has(value)
    ? (value as ColorScheme)
    : ColorScheme.automatic;
}

/**
 * Narrows a raw string from the native bridge to the LogLevel enum.
 * Falls back to `error` (the safest default) on unrecognised values.
 */
function coerceLogLevel(value: string): LogLevel {
  return logLevelValues.has(value) ? (value as LogLevel) : LogLevel.error;
}
