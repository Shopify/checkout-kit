## Repository layout

```
platforms/
  swift/         # iOS Swift Package and CocoaPods sources
  android/       # Android library and sample apps
  react-native/  # React Native wrapper
  web/           # Web component package and sample app
protocol/        # cross-platform communication layer and protocol language artifacts based on UCP
e2e/             # cross-platform end-to-end tests
.github/         # workflows, issue templates, CODEOWNERS
```

## Dev workflow

> **AI agents:** All commands require the `shadowenv exec --` prefix to run inside the shadowenv-managed environment.
>
> ```
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev up
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev test [ARGS]
> ```

Run `dev` commands from the repo root or any platform directory. Use `dev up`
before running commands when the environment may not be provisioned.

For platform-scoped work, prefer the root `dev.yml` commands:

- Android: `dev android <command>`
- Swift: `dev swift <command>`
- React Native: `dev react-native <command>` or `dev rn <command>`
- Web: `dev web <command>`

Use `dev up` for setup and setup recovery.

For protocol schema/model work, use `dev protocol <command>`.

For cross-platform changes, use the repo-wide aggregates: `dev lint`,
`dev test`, `dev check`, `dev format`, and `dev build`. Use
`dev <platform> format` for formatting; `fix` remains an alias for existing
workflows.

## Swift Xcode builds

Prefer the `dev swift ...` commands for Swift package and sample builds. When
running `xcodebuild` directly for Swift package, Swift sample, or React Native
iOS sample work, always include `-disableAutomaticPackageResolution` so Xcode
uses the committed `Package.resolved` files instead of silently updating package
pins. This prevents sample app dependencies such as Apollo iOS from being
written into the repo-root Swift package lockfile.

## React Native and the native SDKs

**Default: do not pass `--local`, and do not set `USE_LOCAL_SDK=1`.** React Native builds
resolve the published native SDKs from CocoaPods and Maven Central. That is what CI does, and
it is what almost all React Native work needs.

### The question that decides it

Does the native API you need already exist in the published version pinned at
`checkoutKit.nativeSdkVersions` in
`platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json`?

- **Yes** — do not use `--local`. Editing files under `platforms/swift/` or
  `platforms/android/` does not on its own require it.
- **No** — you are adding that API in this PR. Only then is `--local` correct.

### The one workflow that needs it

`--local` covers a single case: you changed the Swift or Kotlin **public API**, and you want to
integrate the React Native side against it now, before that native SDK version ships.

1. Make the Swift or Kotlin public API change and submit it in a PR.
2. Use `--local` to build the React Native side against those in-repo sources.

Expect this state while you do it:

- CI stays red and the PR is not mergeable. CI resolves published artifacts only. It does not
  accept a `Podfile.lock` or a Maven resolution produced by `--local`.
- The PR becomes mergeable once the native release reaches CocoaPods and Maven Central and
  `checkoutKit.nativeSdkVersions` is bumped to it.

This is a local development aid for early integration. It is not part of normal development.

### Scope

`--local` concerns the native SDK sources:

- `platforms/swift/` — the iOS Swift SDK / CocoaPods sources
- `platforms/android/` — the Android SDK / Maven artifact sources
- `protocol/languages/kotlin/` — Kotlin protocol artifacts consumed by the Android SDK

It does **not** concern the React Native wrapper platform folders, which build from source
either way:

- `platforms/react-native/modules/@shopify/checkout-kit-react-native/ios/`
- `platforms/react-native/modules/@shopify/checkout-kit-react-native/android/`

### What it does

- iOS: wires CocoaPods to the in-repo `platforms/swift/` sources via a local path instead of a released pod version.
- Android: publishes the in-repo Android SDK and Kotlin protocol artifacts to Maven Local, then resolves `com.shopify:checkout-kit` and `com.shopify:embedded-checkout-protocol` from there.

```bash
dev rn ios --local
dev rn android --local
dev rn test android --local
```

Re-run the relevant command whenever `platforms/swift/`, `platforms/android/`, or
`protocol/languages/kotlin/` changes, so the build re-resolves those sources.

### Rules

- Never commit a `Podfile.lock` generated with `--local`. It records a local path, and
  `platforms/react-native/scripts/check_published_podfile_lock` fails CI on it. Regenerate with
  `env -u USE_LOCAL_SDK dev rn pod-install`.
- Never hardcode `USE_LOCAL_SDK=1` into a script, `dev.yml`, or a workflow. It has to stay an
  explicit choice made on the command line, or local runs stop matching CI and can resolve a
  stale artifact from `~/.m2`. `platforms/react-native/scripts/check_no_local_sdk_default` fails
  CI on it.
- The React Native Android sample uses exclusive Maven Local resolution for those two
  `com.shopify` modules when `USE_LOCAL_SDK=1`. Keep that filtering in the sample Gradle build;
  duplicating exclusive repository filters for the same modules elsewhere can break dependency
  resolution.

## Sensitive configuration

Treat storefront environment and generated sample app configuration values as
sensitive. Never print, commit, paste, or document real values from `.env`,
generated platform config, access tokens, merchant identifiers, shop IDs,
account IDs. Use synthetic placeholders for docs and
verification.
