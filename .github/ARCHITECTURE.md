# Platform and component architecture

## Boundaries

The repository is platform-first: each platform owns its toolchain, SDK version,
changelog, samples, and distribution. Components are implementation/API ownership
boundaries inside a platform, not independent releases.

| Platform | Component boundary | Distribution boundary |
| --- | --- | --- |
| Swift | Targets under `platforms/swift/Sources/`, tests under `Tests/` | Root `Package.swift` products and `ShopifyCheckoutKit.podspec` subspecs |
| Android | Gradle feature modules under `platforms/android/` | One fused `com.shopify:checkout-kit` AAR from `shopify-checkout-kit/` |
| React Native | Private workspace packages under `platforms/react-native/components/` | One `@shopify/checkout-kit-react-native` package with JS and native bindings |
| Web | Private workspace packages under `platforms/web/components/` | One `@shopify/checkout-kit` package with component subpaths, plus CDN assets |

The folder shapes follow native tooling; they need not be identical to enforce
the same ownership rules:

- Components own their feature-specific code, API, and tests.
- Shared internals sit below components and must not import components or public
  facades. Extract shared code when it has actual consumers, not speculatively.
- Components may depend on another component when that is intentional and
  acyclic. For example, Swift accelerated checkouts depend on checkout.
- Distribution facades assemble components; components must not import back
  through those facades.
- JS component/internal packages are private build inputs. Bundle them into the
  platform SDK; do not add them to the published runtime dependency graph.
  `scripts/check-sdk-packages.mjs` checks manifest boundaries and
  [runtime dependencies](#runtime-dependencies), and each JS platform's
  dependency-cruiser configuration checks source dependencies. The Web build
  runs the manifest check before producing npm output.
- Protocol schemas and bindings live under
  `protocols/universal-commerce-protocol/embedded-checkout-protocol/`. Keep wire
  contracts separate from feature presentation and merchant-facing behavior.
- `platforms/shared/telemetry/` holds a cross-platform contract, not a shared
  implementation. Each platform implements it using its own tooling.

Native/protocol packages have explicit published dependency pins. Adding a
component does not change those release boundaries. React Native continues to
consume published native SDKs by default; see its
[local SDK development guide](../platforms/react-native/CONTRIBUTING.md#local-sdk-development---local)
for the narrow unreleased-API workflow.

## Runtime dependencies

### Minimize dependencies

Every runtime dependency is a liability for Checkout Kit and for every app that
embeds it. A dependency, and everything it depends on in turn, can:

- conflict with a version the host app already uses, which we cannot resolve
  on the app's behalf;
- add size to every merchant's app or page;
- add bugs and vulnerabilities we must track, patch, and ship releases for;
- expose consumers to supply-chain compromise of its maintainers or registry;
- constrain our supported OS, browser, and toolchain versions.

These principles apply to all platforms (following
[JLBP-1](https://jlbp.dev/JLBP-1)):

- Prefer platform and standard-library APIs, even at some cost in development
  time.
- Do not add a dependency to save a few lines of code. If the functionality is
  small, implement it in the SDK.
- A dependency can be justified for difficult or security-sensitive work, such
  as cryptography, where a maintained library is safer than our own
  implementation.
- Count transitive dependencies as part of the cost. Before adding one, review
  its dependency tree (`pnpm why`, `./gradlew dependencies`, or the resolved
  Swift package graph), and prefer an alternative that pulls in less.
- Pick one library for each job. Do not add a second library that duplicates
  one already in the dependency graph.
- Keep dependencies as narrowly scoped as possible: test and build tooling stays
  in development or test scope and must never ship to consumers.

### Ownership and allowed dependencies

A runtime dependency is one that ships to SDK consumers: anything declared in a
published or bundled JS package's `dependencies`, `optionalDependencies`, or
`peerDependencies`; a Gradle `api`, `implementation`, or `runtimeOnly`
dependency of a bundled Android feature; or an external Swift package used by a
shipped target or podspec. The platform owns these as part of the product, not
the component that first needs one. Test and build tooling is owned by the
package that uses it and stays in development or test scope: `devDependencies`,
Gradle test configurations, or Swift test targets.

The platforms allow these third-party runtime dependencies. Checkout Kit's own
published packages, such as the Embedded Checkout Protocol, are not third-party.

| Platform | Allowed | Why | Enforced by |
| --- | --- | --- | --- |
| Web | None | npm and CDN artifacts bundle only Checkout Kit source. | `scripts/check-sdk-packages.mjs` |
| React Native | `react` and `react-native`, as `peerDependencies` only | The host app provides the single copy React Native requires. | `scripts/check-sdk-packages.mjs` |
| Android | The modules listed in `platforms/android/gradle/runtime-dependencies.txt` | AndroidX and Kotlin libraries the SDK builds on. | `verifyRuntimeDependencies`, which runs before publication |
| Swift | None | SwiftPM and CocoaPods products use only Checkout Kit targets. | `scripts/check-swift-dependencies.mjs` |

The React Native native wrappers (`platforms/react-native/ios` and `android`)
are not yet covered by a check.

The Android check approves module identities, not versions. SDK versions are
managed in `gradle/libs.versions.toml`; sample apps may use separate aliases
and versions for the same module.

For JS dependencies, versions are coordinated across each platform:

- A bundled dependency (`dependencies` or `optionalDependencies`) is declared
  once in the platform's `pnpm-workspace.yaml` catalog, and every package
  references it as `catalog:`. Dependabot updates the catalog entry, so each
  version bump changes one place and applies to every package that uses it.
- A host peer (`peerDependencies`) uses the same range in every package.

The JS package check enforces both the allowed dependencies and their version rules.

Web runtime code must work when more than one copy of it is loaded on a page.
The CDN bundles shared runtime code into each component, and pages may load
the npm and CDN builds together. Registration must be idempotent, and state
shared across components must not depend on a single module instance. This
applies to Checkout Kit's own internal packages as well as to any future
third-party dependency.

### Adding a runtime dependency

Do not add a third-party runtime dependency to a component or internal package
by itself. Open an issue proposing it first, covering:

- why it must ship to consumers rather than being a development dependency;
- why the functionality cannot reasonably be implemented in the SDK or with
  platform APIs, and which alternatives were considered;
- the transitive dependencies it adds;
- the initial version range for the catalog;
- delivery for each distribution: for Web, bundled into npm output and into
  each CDN component that uses it, or a new shared CDN runtime design;
- why it is safe to load more than once, or why the host must provide it;
- license and supply-chain review;
- bundle-size impact against the existing budgets.

A Checkout Kit code owner approves the proposal. Then, in one change, add the
dependency, update the policy, and add integration tests for the supported
loading combinations. The policy update means the table above and the
platform's allowed list: `scripts/check-sdk-packages.mjs`,
`platforms/android/gradle/runtime-dependencies.txt`, or
`scripts/check-swift-dependencies.mjs`. CODEOWNERS requires a code owner to
review each of them.

## Dependency checks

Web components and shared modules use declared package exports when importing
across ownership boundaries. Relative imports stay inside the owning component
or module. React Native also requires package exports when accessing shared core;
checkout may not depend on accelerated checkout, and other callers use the
declared feature entrypoints. These source checks include type-only imports.

Shared telemetry may depend on protocol models, but must not depend on checkout
core or components. Checkout owns the integration and depends on telemetry.

Run the checks from the repository root:

```sh
pnpm --dir platforms/web lint:dependencies
pnpm --dir platforms/react-native lint:dependencies
```

Both commands run dependency-cruiser on the source and then test the real rules
against isolated packages containing allowed and forbidden imports. The normal
platform lint commands, including CI, run these checks.
Web checks runtime reachability separately so a type-only reference cannot make
an otherwise unshipped implementation appear reachable.

Native platforms use compiler boundaries. Kotlin `internal` is scoped to a
Gradle module. Swift `internal` is scoped to an SPM target, while `package` allows
intentional sharing such as accelerated checkout's presentation entrypoint.
CocoaPods subspecs combine these sources into one module, so they do not provide
the same implementation isolation as separate SPM targets.

## Adding a component

There is no component generator yet. Use the checklists below; a future `dev`
generator should automate these conventions rather than create a new packaging
model. Paths and commands below are relative to the repository root unless noted.

For every platform:

1. Decide the merchant-facing API and implementation ownership before extracting
   shared infrastructure.
2. Add focused tests and demonstrate the component in the platform sample.
3. Verify both source behavior and the SDK's built consumer surface. Keep
   compatibility floors and existing public API unchanged unless the change is
   intentional and documented.
4. Document installation/API usage and update platform support information where
   relevant. Add a platform changeset for a consumer-visible change; private
   component changes ship with that platform's SDK version.
5. Existing platform CI filters include new component directories automatically.
   New jobs or shared cross-platform inputs need explicit routing changes and
   tests in `scripts/test/changed_file_filters_test.rb` and, for macOS job
   selection, `e2e/test/ios_ci_run_plan_test.rb`. Do not create per-component
   workflows merely to mirror the directory tree.

### Swift

1. Add a target under `platforms/swift/Sources/<Module>/` and a matching test
   target under `platforms/swift/Tests/`. Keep shared targets under `Sources/Internal/`.
2. Register targets, dependencies, resources, tests, and any merchant-facing
   product in root `Package.swift`. Keep compatibility floors explicit.
3. Wire CocoaPods sources, resources, and dependencies through the appropriate
   root `ShopifyCheckoutKit.podspec` subspec. Not every internal target needs a
   public product/subspec.
4. Add each merchant-facing module to `MODULES` in
   `platforms/swift/Scripts/api`, then run `dev swift api dump` and review its
   baseline under `platforms/swift/api/`.
5. Update the sample's imports/product dependencies as needed. Run
   `dev swift lint`, `dev swift test`, `dev swift build`, and
   `dev swift api check`. Validate the podspec with
   `BUNDLE_GEMFILE=platforms/swift/Gemfile bundle exec pod lib lint ShopifyCheckoutKit.podspec --allow-warnings`.

### Android

1. Add a sibling feature module under `platforms/android/` and include it in
   `settings.gradle`. Apply `shopify.android-feature`; declare a feature-owned
   namespace and unique `resourcePrefix`, and provide `proguard-rules.pro`.
   Use `internal`/`private` for implementation declarations.
2. Add `include project(':<feature>')` to
   `shopify-checkout-kit/build.gradle`. Do not apply `maven-publish` to a feature.
   The umbrella retains artifact coordinates, SDK metadata, and dependency
   policy; `shopify.checkout-kit-publication` owns publication machinery.
3. The included feature list drives compile dependency metadata, sources and
   documentation archives, and final AAR class/resource validation. Keep the
   protocol external; do not bundle a second copy into a feature.
4. Run `dev android api dump`, review the new feature's `api/<feature>.api`,
   and commit it. Exclude generated `BuildConfig` classes through root
   `apiValidation.ignoredClasses` where appropriate. `dev android api check`
   and CI use the platform aggregate, so siblings are checked automatically.
5. The sample is a separate Gradle build. Include the feature in its settings
   and app dependencies when demonstrating it there.
6. Run `dev android lint`, `dev android test`, and `dev android build`.
   Run `platforms/android/scripts/check_publication` to verify a temporary sibling
   feature, the normal SDK artifact, and consumers using both Gradle module
   metadata and Maven POM metadata. This publishes only to a build-local
   verification repository, not Maven Central.

### React Native

1. Create `platforms/react-native/components/<component>/package.json` with a
   unique package name, `private: true`, placeholder version `0.0.0`, and explicit
   source `exports`. Declare actual component/core/peer dependencies.
2. Add the private package as a `workspace:*` development dependency of the
   platform root. `pnpm-workspace.yaml` already includes `components/*`; run
   `pnpm install` from the platform directory and commit lockfile changes.
3. Expose the merchant API through the platform's `src/index.ts`. Keep private
   package imports behind declared exports. Update dependency-cruiser rules to
   protect the new entrypoint and any intentional component dependencies.
4. Add native bindings/codegen specs only where required. Keep shared native
   transport/contracts in `internal/core`; do not put every component's behavior
   there. Update native registration and codegen configuration as needed.
5. Add Jest tests, native integration tests where applicable, and a packed-package
   consumer example under `test/package-consumer/`. The local sample uses source
   packages; packed-package verification must work without workspace access.
6. Run `dev rn lint`, `dev rn test`, `dev rn build`, and `dev rn api dump`;
   review/commit the public API report, then run `dev rn api check`. Review the
   packed-files snapshot and update it only for intended package-content changes.

### Web

1. Create `platforms/web/components/<component>/package.json` with a unique
   package name, `private: true`, placeholder version `0.0.0`, and explicit API
   and registration exports. Keep registration in `src/register.ts` and list it
   in the component's `sideEffects`.
2. Add the private package as a `workspace:*` development dependency of the
   platform root. `pnpm-workspace.yaml` includes `components/*`; run `pnpm install`
   there and commit lockfile changes. Shared implementation belongs in `internal/`
   with explicit workspace membership when needed.
3. Re-export public classes/types from platform `src/index.ts` without registering
   elements. Add a platform registration entry, its public package subpath,
   `sideEffects`, Vite entry, and declaration wiring. Use the class's `register()`
   for registration and `@tagname` for the custom elements manifest.
4. Wire the CDN loader's supported components/imports and the chunk-URL injection
   in `vite.cdn.config.ts`. Both currently name checkout explicitly; adding a
   directory alone does not expose a new CDN component.
5. Review dependency-cruiser rules, including entrypoint reachability. Add unit,
   registration, package-consumer, and browser tests as appropriate. Verify that
   importing one component does not register unrelated elements.
6. Run `dev web check` and review `dev web snapshot compare`. Update the snapshot
   only for intended package-content changes. This platform's check includes
   lint, unit/browser tests, npm package verification, and the sample build.
