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

type SettingCheck = {
  expected: string;
  accepts: (value: unknown) => boolean;
};

const string: SettingCheck = {
  expected: 'a string',
  accepts: value => typeof value === 'string',
};
const boolean: SettingCheck = {
  expected: 'a boolean',
  accepts: value => typeof value === 'boolean',
};

const configurationChecks: Record<
  Exclude<keyof ConfigurationSpec, 'appearance'>,
  SettingCheck
> = {
  title: string,
  logLevel: string,
  preloading: boolean,
  telemetry: boolean,
  allowedMessageOrigins: {
    expected: 'an array of strings',
    accepts: value =>
      Array.isArray(value) &&
      value.every(origin => origin === null || typeof origin === 'string'),
  },
};

/**
 * Throws a TypeError with `code: 'set_config_failed'` when a top-level setting
 * that native reads, other than `appearance`, has the wrong type or is `null`.
 * An `undefined` setting is omitted. A rejected call changes nothing. Native
 * ignores values that it does not know, so an unknown `logLevel` passes.
 *
 * `appearance` is not checked, as on native. A call with an `appearance` that
 * native cannot read still applies its other settings: native keeps the
 * current appearance, or uses the native default colors for colors that it
 * cannot read.
 */
export function validateConfiguration(configuration: Configuration) {
  for (const [key, {expected, accepts}] of Object.entries(
    configurationChecks,
  )) {
    const value = (configuration as Record<string, unknown>)[key];
    if (value !== undefined && !accepts(value)) {
      // Same `code` as the native rejection on Android, so callers that branch
      // on `e.code` see one error for every unreadable value.
      throw Object.assign(new TypeError(`\`${key}\` must be ${expected}`), {
        code: 'set_config_failed',
      });
    }
  }
}

/**
 * Prepares a valid Configuration for the native `setConfig`.
 *
 * Drops `null` entries from `allowedMessageOrigins`, as Android does, so iOS
 * can read the list. On iOS, React Native drops `null` object properties before
 * they reach the native module. So each iOS palette lists its `null` colors in
 * `resetColors`. Android receives `null` values, so its colors are unchanged.
 */
export function toNativeConfiguration(
  configuration: Configuration,
): ConfigurationSpec {
  const {allowedMessageOrigins, appearance} = configuration;
  return {
    ...configuration,
    ...(allowedMessageOrigins && {
      allowedMessageOrigins: allowedMessageOrigins.filter(
        origin => origin !== null,
      ),
    }),
    ...(appearance && {appearance: withIosResetColors(appearance)}),
  };
}

function withIosResetColors(
  appearance: NonNullable<Configuration['appearance']>,
) {
  const ios = appearance.colors?.ios as IosAutomaticColors | null | undefined;
  if (!appearance.colors || !ios) {
    return appearance;
  }

  const {light, dark, ...shared} = ios;
  return {
    ...appearance,
    colors: {
      ...appearance.colors,
      ios: {
        ...withResetColors(shared),
        ...(light && {light: withResetColors(light)}),
        ...(dark && {dark: withResetColors(dark)}),
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
