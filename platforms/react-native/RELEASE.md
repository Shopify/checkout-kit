# React Native publish checks

This package is published from the pnpm workspace, but it consumes generated
protocol TypeScript from the repository-local `@shopify/checkout-kit-protocol`
workspace package. That protocol package is intentionally not published to npm.

## Why protocol is a devDependency and a bundledDependency

The React Native package imports protocol code at runtime:

```ts
import {CheckoutProtocol} from '@shopify/checkout-kit-react-native';
```

Internally, the built package still imports `@shopify/checkout-kit-protocol`.
For consumers to install the React Native package without publishing protocol as
a standalone public package, the protocol package must be physically included in
the packed React Native tarball.

The package manifest uses this shape:

```json
{
  "dependencies": {},
  "devDependencies": {
    "@shopify/checkout-kit-protocol": "workspace:*"
  },
  "bundledDependencies": [
    "@shopify/checkout-kit-protocol"
  ]
}
```

This is non-obvious but intentional:

- `devDependencies` keeps the workspace protocol package available while
  building and packing inside this repository.
- `bundledDependencies` makes `pnpm pack` include the protocol package inside
  the tarball at:

  ```text
  node_modules/@shopify/checkout-kit-protocol
  ```

- The published React Native package resolves protocol at runtime from its own
  nested `node_modules`, not from the consumer app's dependency graph.

We avoid listing protocol in normal `dependencies` because `pnpm pack` rewrites
`workspace:*` to the protocol package version (`0.0.0`). With:

```json
"dependencies": {
  "@shopify/checkout-kit-protocol": "0.0.0"
}
```

`npm` and `pnpm` can install the tarball when the dependency is bundled, but
Yarn classic and Bun still try to fetch `@shopify/checkout-kit-protocol@0.0.0`
from the registry. Since protocol is unpublished, those installs fail.

The publish checks below verify that the tarball is installable and that runtime
resolution finds the bundled protocol package.

## Release-gating checks

Run these from `platforms/react-native`.

### Full publish check

```bash
pnpm publish:check
```

`publish:check` runs the package check, the React Native consumer check, and the
Expo consumer check. This is intended as the full release-gating check for the
React Native npm package.

The checks are also available individually:

```bash
pnpm publish:check:package
pnpm publish:check:react-native
pnpm publish:check:expo
```

All checks validate the packed tarball, not local workspace imports.

## Individual checks

### Package install check

```bash
PACKAGE_MANAGERS=all pnpm publish:check:package
```

This builds the RN package, packs it, inspects the tarball manifest, checks for
unresolved local dependency specs (`workspace:`, `file:`, `link:`, `portal:`),
and installs the tarball in clean consumer projects.

To test a single package manager:

```bash
PACKAGE_MANAGERS=pnpm pnpm publish:check:package
PACKAGE_MANAGERS=npm pnpm publish:check:package
PACKAGE_MANAGERS=yarn pnpm publish:check:package
PACKAGE_MANAGERS=bun pnpm publish:check:package
```

If the repo's dev environment wraps `npm`, point to a real npm binary:

```bash
NPM_BIN=/path/to/npm PACKAGE_MANAGERS=npm pnpm publish:check:package
```

### React Native consumer check

```bash
PACKAGE_MANAGER=pnpm PLATFORM=ios pnpm publish:check:react-native
```

This creates a throwaway React Native app, installs the packed tarball, bundles a
protocol runtime entry with Metro, executes the generated bundle, and bundles a
public API entry.

This check does not currently install a native app on a simulator/device. It is a
Metro/runtime consumer check for the published JavaScript package shape.

Examples:

```bash
PACKAGE_MANAGER=yarn PLATFORM=ios pnpm publish:check:react-native
PACKAGE_MANAGER=bun PLATFORM=android pnpm publish:check:react-native
```

### Expo development-client consumer check

```bash
PACKAGE_MANAGER=pnpm PLATFORM=ios pnpm publish:check:expo
```

This uses Expo CLI to create a fresh Expo app, installs the packed tarball,
adds `expo-dev-client`, writes a basic screen that can create a Storefront cart
and launch checkout, verifies the bundled protocol package, runs Expo prebuild,
and compiles the native project. For iOS it runs `xcodebuild`; for Android it
runs Gradle. It does not launch Metro, a simulator, or a device by default, so
it exits cleanly in CI.

The generated Expo app uses distinct native identifiers so it does not overwrite
other smoke apps:

```text
iOS bundle identifier: com.shopify.checkoutkitexposmoke
Android package:       com.shopify.checkoutkitexposmoke
```

Useful variants:

```bash
# iOS native compile only; no Metro/simulator launch.
PACKAGE_MANAGER=pnpm PLATFORM=ios pnpm publish:check:expo

# Android native compile only; no Metro/device launch.
PACKAGE_MANAGER=pnpm PLATFORM=android pnpm publish:check:expo

# Create/install/prebuild, but skip the native compile.
PACKAGE_MANAGER=pnpm PLATFORM=ios BUILD_NATIVE=0 pnpm publish:check:expo

# Launch the app after the native compile for manual smoke testing.
PACKAGE_MANAGER=pnpm PLATFORM=ios RUN_APP=1 pnpm publish:check:expo

# Use a known checkout URL instead of creating a Storefront cart.
PACKAGE_MANAGER=pnpm CHECKOUT_URL="https://example.myshopify.com/checkouts/..." pnpm publish:check:expo

# Use different Storefront API values.
PACKAGE_MANAGER=pnpm \
STOREFRONT_DOMAIN="example.myshopify.com" \
STOREFRONT_ACCESS_TOKEN="public-storefront-token" \
STOREFRONT_VERSION="2025-07" \
pnpm publish:check:expo
```

Generated app checks preserve their temporary app directory by default and print
the path. Set `KEEP_TMP=0` if you want the generated app removed after a
successful run. You can then run a preserved app manually, for example:

```bash
cd /tmp/checkout-kit-expo-smoke...
pnpm expo run:ios
```

## Package-manager configuration

The package check accepts `PACKAGE_MANAGERS` because it can validate multiple
installers in one run:

```bash
PACKAGE_MANAGERS="pnpm npm yarn bun" pnpm publish:check:package
PACKAGE_MANAGERS=all pnpm publish:check:package
```

The consumer app checks accept one `PACKAGE_MANAGER` per run:

```bash
PACKAGE_MANAGER=pnpm pnpm publish:check:react-native
PACKAGE_MANAGER=yarn pnpm publish:check:expo
```

This shape maps naturally to a future CI matrix.

## Expo Go vs Expo development client

`@shopify/checkout-kit-react-native` includes custom native code, so it cannot
run in Expo Go. The Expo consumer check uses a development build by installing
`expo-dev-client`, running `expo prebuild`, and then compiling the generated
native project with `xcodebuild` or Gradle. Set `RUN_APP=1` when you want the
check to launch the app with `expo run:ios` or `expo run:android` after the
native compile.

If you see:

```text
No script URL provided. Make sure the packager is running or you have embedded a JS bundle
```

make sure the generated app has `expo-dev-client` installed and has been
prebuilt/rebuilt after installing it:

```bash
pnpm add expo-dev-client
pnpm expo prebuild --clean
pnpm expo run:ios
```
