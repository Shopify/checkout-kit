import type {CheckoutAppearanceType, ColorScheme, LogLevel} from './enums';
import type {Configuration} from './index.d';
import type RNShopifyCheckoutKit from './specs/NativeShopifyCheckoutKit';

type NativeConfigurationResult = ReturnType<
  typeof RNShopifyCheckoutKit.getConfig
>;

/**
 * Coerces a native Configuration result into the consumer-facing
 * Configuration type.
 *
 * The TurboModule codegen spec can only express primitive types — string
 * literal unions and TypeScript enums collapse to plain `string` at the
 * bridge boundary. On the JS side consumers expect the typed appearance
 * enums and `LogLevel`, so we narrow those fields here.
 *
 * The native SDK owns the defaults, so the value is reported as native gave
 * it. A newer native SDK that adds a level or a scheme is reported truthfully
 * through an older version of this package. Substituting a default here would
 * report a value the native SDK does not hold.
 */
export function coerceConfigurationResult(
  raw: NativeConfigurationResult,
): Configuration {
  return {
    ...raw,
    logLevel: raw.logLevel as LogLevel,
    appearance: raw.appearance as {
      type: CheckoutAppearanceType;
      colorScheme?: ColorScheme;
    },
  } as Configuration;
}
