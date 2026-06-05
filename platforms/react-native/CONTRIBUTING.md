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

The RN module wraps the Shopify Swift and Android SDKs, which live in this same monorepo at `platforms/swift/` and `platforms/android/`. By default the sample app builds against the **published** artifacts on CocoaPods / Maven Central — the same path CI takes. To build against the in-repo SDK sources instead, pass `--local` to any sample command:

```sh
dev rn android --local        # publishes lib to ~/.m2/ then builds the sample against it
dev rn ios --local            # builds the sample against the local Swift SDK
dev rn pod-install --local    # re-resolve iOS pods against the local Swift SDK
```

The flag is opt-in because the in-repo SDKs change as we develop. Default published mode is always safe; `--local` activates the in-progress API surface.

### How it works

- **Android**: every `--local` invocation runs `scripts/publish_android_snapshot`, which publishes the current local `com.shopify:checkout-kit` version to `~/.m2/` via the lib's own Gradle wrapper. The sample's `build.gradle` declares `mavenLocal()` first in the repository order, so the freshly-published AAR is picked up before falling through to Maven Central.
- **iOS**: with `--local`, the Podfile injects `pod "ShopifyCheckoutKit", :path => "../../../../"` (the repo root, where `ShopifyCheckoutKit.podspec` lives). CocoaPods reads Swift sources from `platforms/swift/` directly.

Internally `--local` exports `USE_LOCAL_SDK=1` before invoking the underlying tool. Setting the env var directly works too:

```sh
USE_LOCAL_SDK=1 dev rn android
```

### CI

CI uses the default (published) path naturally — no special flag handling. Keep `USE_LOCAL_SDK=1` scoped to local development or explicit validation against unreleased native SDK changes.

### Gotchas

- **iOS**: `dev rn ios` runs `pod install` before launching, so dropping or adding `--local` will re-resolve the pods as needed. You can still run `dev rn pod-install [--local]` directly when you only want to refresh pods.
- **Android (CLI)**: covered automatically by the publish script — every `--local` run re-publishes the AAR before building.
- **Android (Android Studio)**: when running the sample via Android Studio's Run button after editing `platforms/android/lib/src/**`, run `platforms/react-native/scripts/publish_android_snapshot` once manually (with `USE_LOCAL_SDK=1`) or run `dev rn android --local` from a terminal to refresh `~/.m2/`.
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
the sample app dotenv file from the root `.demo.env`.

If you are not using `dev`, copy `.demo.env.example` from the repo root to `.demo.env`,
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
