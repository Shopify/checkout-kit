import type {LogLevel} from './enums';
import type {Configuration, IosAutomaticColors, IosColors} from './contracts';
import type RNShopifyCheckoutKit from './specs/NativeShopifyCheckoutKit';
import type {ConfigurationSpec} from './specs/NativeShopifyCheckoutKit';

type NativeConfigurationResult = ReturnType<
  typeof RNShopifyCheckoutKit.getConfig
>;

/** iOS colors where `null` resets the color to the native default. */
const iosResettableColors = [
  'closeIconTintColor',
  'headerBorderColor',
] as const;

/**
 * Prepares a Configuration for the native `setConfig`.
 *
 * On iOS, React Native drops `null` object properties before they reach the
 * native module. So each iOS palette lists its `null` colors in
 * `resetColors`. Android receives `null` values, so its colors are unchanged.
 */
export function toNativeConfiguration(
  configuration: Configuration,
): ConfigurationSpec {
  const appearance = configuration.appearance;
  const ios = appearance?.colors?.ios as IosAutomaticColors | null | undefined;
  if (!appearance?.colors || !ios) {
    return configuration;
  }

  const {light, dark, ...shared} = ios;
  return {
    ...configuration,
    appearance: {
      ...appearance,
      colors: {
        ...appearance.colors,
        ios: {
          ...withResetColors(shared),
          ...(light && {light: withResetColors(light)}),
          ...(dark && {dark: withResetColors(dark)}),
        },
      },
    },
  };
}

function withResetColors(palette: IosColors) {
  const resetColors = iosResettableColors.filter(key => palette[key] === null);
  if (resetColors.length === 0) {
    return palette;
  }
  const encoded = {...palette};
  for (const key of resetColors) {
    delete encoded[key];
  }
  return {...encoded, resetColors};
}

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
    appearance: raw.appearance as Configuration['appearance'],
  } as Configuration;
}
