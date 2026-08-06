# Contributing

We welcome code contributions, feature requests, and reporting of issues. Please
see [guidelines and instructions](../../.github/CONTRIBUTING.md).

---

This repo is subdivided into 3 parts using pnpm workspaces:

- The base repo (workspace name = `checkout-kit-react-native`)
- The `@shopify/checkout-kit-react-native` Native Module (workspace name = `module`)
- The sample application (workspace name = `sample`)

Each of the workspaces contains a separate `package.json` to manage tasks
specific to each workspace.

## Getting started

If you've cloned the repo and want to run the sample app, Shopify employees can
run `dev up` and `dev react-native <command>` from the repo root or any
platform directory (`dev rn` is an alias). Run `dev rn pod-install` when iOS
pods need to be installed. The underlying
`pnpm` commands below are run from
`platforms/react-native`:

1. Install the NPM dependencies

   ```sh
   pnpm install
   ```

2. Install iOS dependencies. (N.b. Android dependencies are automatically installed by Gradle)

   ```sh
   pnpm run pod-install
   ```

3. Build the Native Module

   ```sh
   pnpm module build
   ```

4. Start the Metro server

   ```sh
   pnpm sample start
   ```

5. Run the sample application (in a new terminal / tab)

   ```sh
   pnpm sample ios
   # or
   pnpm sample android
   ```

## Local SDK development (`--local`)

The RN module wraps the Shopify Swift and Android SDKs, which live in this same monorepo at `platforms/swift/` and `platforms/android/`. The sample app builds against the **published** artifacts on CocoaPods / Maven Central — the same path CI takes.

**Most work does not need `--local`.** Before reaching for it, check whether the native API you need already exists in the published version pinned at `checkoutKit.nativeSdkVersions` in `modules/@shopify/checkout-kit-react-native/package.json`. If it does, build normally. Editing `platforms/swift/` or `platforms/android/` does not on its own require the flag.

`--local` is for one case: you changed the Swift or Kotlin **public API** and want to integrate the RN side against it before that native version ships.

```sh
dev rn android --local        # publishes lib to ~/.m2/ then builds the sample against it
dev rn ios --local            # builds the sample against the local Swift SDK
dev rn pod-install --local    # re-resolve iOS pods against the local Swift SDK
dev rn test android --local   # RN module Android tests against the local Android SDK
```

While you do this, CI stays red and the PR is not mergeable — CI resolves published artifacts only. It becomes mergeable when the native release lands on CocoaPods and Maven Central and `nativeSdkVersions` is bumped to it. That red state is expected, not a problem to work around.

### How it works

- **Android**: every `--local` invocation runs `scripts/publish_android_snapshot`, which publishes the current local `com.shopify:embedded-checkout-protocol` and `com.shopify:checkout-kit` versions to `~/.m2/` via the Android Gradle build. The sample's `build.gradle` uses exclusive Maven Local resolution for those modules, so validation fails rather than falling back to a published artifact if the local publish is missing.
- **iOS**: with `--local`, the Podfile injects `pod "ShopifyCheckoutKit", :path => "../../../../"` (the repo root, where `ShopifyCheckoutKit.podspec` lives). CocoaPods reads Swift sources from `platforms/swift/` directly.

Internally `--local` exports `USE_LOCAL_SDK=1` before invoking the underlying tool. Pass the flag rather than exporting the variable in your shell profile — an ambient `USE_LOCAL_SDK=1` silently applies to every later build.

### CI

CI uses the published path and never sets the flag. Two guards keep it that way:

- `scripts/check_published_podfile_lock` fails the iOS jobs if a committed `Podfile.lock` resolves `ShopifyCheckoutKit` from a local path. Regenerate with `env -u USE_LOCAL_SDK dev rn pod-install`.
- `scripts/check_no_local_sdk_default` fails the Android jobs if `USE_LOCAL_SDK=1` is hardcoded into a script, `dev.yml`, or a workflow, or if `mavenLocal()` is added outside the `useLocalSdk` branch. The sample Gradle build also aborts when the variable is set while `CI` is set.

Local mode has to stay an explicit command-line choice. Hardcoding it makes local runs disagree with CI, and because Maven Local keeps the same version across republishes, it can quietly resolve a stale artifact from `~/.m2`.

### Gotchas

- **iOS**: non-local runs use `pod install`, while `dev rn ios --local` and `dev rn pod-install --local` run a targeted update for the `ShopifyCheckoutKit` pods so CocoaPods re-resolves the local SDK path.
- **Android (CLI)**: covered automatically by the publish script — every `--local` run re-publishes the local Android and Kotlin protocol artifacts before building.
- **Android (Android Studio)**: when running the sample via Android Studio's Run button after editing `platforms/android/**` or `protocol/languages/kotlin/**`, run `platforms/react-native/scripts/publish_android_snapshot` once manually (with `USE_LOCAL_SDK=1`) or run `dev rn android --local` from a terminal to refresh `~/.m2/`.
- The flag affects **only the RN build**. The standalone Swift and Android SDK builds (`dev android build`, `swift build`, etc.) are unaffected.

## Optional: Speed up builds with sccache

For faster native compilation (especially on incremental builds), you can install [sccache](https://github.com/mozilla/sccache), a shared compilation cache:

```sh
# macOS (using Homebrew)
brew install sccache

# Ubuntu/Debian
cargo install sccache

# Other systems: see https://github.com/mozilla/sccache#installation
```

The build scripts will automatically detect and use sccache if available. On Android, React Native's CMake files look for a command named `ccache`, so the sample Android scripts put an sccache-backed compatibility command first on `PATH`. If you encounter any build issues, you can temporarily disable it:

```sh
# Disable sccache for a single build
SCCACHE=false pnpm sample ios
SCCACHE=false pnpm sample android
```

## Making changes to the Native Module

If your intentions are to modify the TS code for the Native Module under
`modules/@shopify/checkout-kit-react-native`, note that you will not need to rebuild to
observe your changes in the sample app. This is because the sample app is
importing the TS files directly from the module directory (through symlinking).

However, if you're running the iOS/Android tests against the module, you will
first need to run `pnpm module build` each time you change the TS code.

## Cleaning the workspaces

There are a handful of commands to clean the individual workspaces.

```sh
# Clear the current directory from watchman
pnpm clean

# Removes the "sample/node_modules" directory
# Removes "ios/pods" directory
# Removes "ios/build" directory
pnpm sample clean

# Removes the "lib" directory for the Native Module
pnpm module clean
```

## Linting the code

Linting the codespaces will (1) compile the code with TypeScript and (2) run
eslint over the source code.

```sh
# Lint the Native Module TS code
pnpm module lint

# Lint the Sample App TS code
pnpm sample lint
```

## Testing

There are 3 types of tests in this repo: Typescript, Swift and Java - each for
testing the Native Module.

```sh
# Run Jest tests for "modules/@shopify/checkout-kit-react-native/src/**/*.tsx"
pnpm test

# Run swift tests for the Native Module
pnpm sample test:ios

# Run Java tests for the Native Module
pnpm sample test:android
```

## Running the sample app

To run the sample app in this repo with `pnpm`, first run the following commands
from `platforms/react-native`.

### Install NPM dependencies

```sh
pnpm install
```

### Install Cocoapods

```sh
pnpm run pod-install
```

### Build the local module

```sh
pnpm module build
```

### Update sample configuration

From the repo root or this platform directory, run `dev up` to create or sync
the sample app dotenv file from the root `.env`.

If you are not using `dev`, copy `.env.example` from the repo root to `.env`,
fill in local values, then run `scripts/setup_storefront_env`.

```
# Storefront Details
STOREFRONT_DOMAIN="YOUR_STORE.myshopify.com"
STOREFRONT_ACCESS_TOKEN="YOUR_PUBLIC_STOREFRONT_ACCESS_TOKEN"
API_VERSION="2026-04"
```

### Start the sample app

```sh
pnpm sample start
```
