# AGENTS.md

Guidance for AI agents when working in the Android platform.

## Project overview

Shopify Checkout Kit for Android publishes Maven artifacts that are consumed by third-party Android apps via Maven Central, so changes to public surfaces have real consumer impact and real reversal cost once released.

The main modules are:

- **`lib/`** — the Checkout Kit library, published as `com.shopify:checkout-kit`. It presents Shopify checkouts as a native, dialog-hosted WebView in consumer apps.
- **`../../protocol/languages/kotlin/embedded-checkout-protocol/`** — the Embedded Checkout Protocol Kotlin artifact, published as `com.shopify:embedded-checkout-protocol`. The Android Gradle project path is `:embedded-checkout-protocol`, and the Kotlin package is `com.shopify.ucp.embedded.checkout`.
- **`samples/CheckoutKitAndroidDemo/`** — a demo app that consumes Checkout Kit and the Kotlin protocol artifact as source dependencies. Changes here never reach consumers; this module is for internal testing and developer onboarding.

The sample is a separate Gradle composite (`samples/CheckoutKitAndroidDemo/settings.gradle`) that includes `:lib` and the Kotlin protocol `:embedded-checkout-protocol` as source dependencies. The sample's `gradle.properties` and Gradle wrapper are independent of the Android root's. The standalone Kotlin protocol Gradle root also has its own wrapper at `../../protocol/languages/kotlin/gradlew`; keep its Gradle version aligned with the Android root wrapper.

## Where to make changes

- Checkout Kit source: `lib/src/main/java/com/shopify/checkoutkit/`.
- Embedded Checkout Protocol source, generated models, and generated event catalog: `../../protocol/languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/`.
- Library tests: `lib/src/test/java/com/shopify/checkoutkit/`. "No test, no merge" is a listed reject criterion in the repo-root `.github/CONTRIBUTING.md`.
- Protocol tests: `../../protocol/languages/kotlin/embedded-checkout-protocol/src/test/java/com/shopify/ucp/embedded/checkout/`.
- Java interop is a first-class concern — the library is commonly consumed from Java code. `lib/src/test/java/com/shopify/checkoutkit/InteropTest.java` exercises the public API from Java specifically; treat breakage there as a consumer-facing issue.

## Key components

- **`ShopifyCheckoutKit.kt`** — the public singleton. Entry point for all consumer interactions (configure, present).
- **`CheckoutDialog.kt`** — the dialog that hosts the WebView, including the progress indicator and checkout error coordination.
- **`CheckoutWebView.kt`** — primary WebView. Instruments page loads and attaches the ECP JavaScript interface.
- **`BaseWebView.kt`** — abstract base class. Any new WebView variant must extend this so shared configuration (user agent suffix, WebChromeClient hooks, navigation error handling) is consistent.
- **`CheckoutProtocol.kt`** — the curated consumer-facing Checkout Kit protocol API. This is where supported events/delegations are intentionally exposed.
- **`EmbeddedCheckoutProtocolBridge.kt`** — the internal JavaScript interface attached to the WebView. Handles `ec.ready`, ECP notifications, and request/response delegations.
- **`../../protocol/languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/EmbeddedCheckoutProtocol.kt`** — the generated low-level Embedded Checkout Protocol event catalog.
- **`../../protocol/languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/ProtocolCodec.kt`** — hand-written JSON-RPC request/response helpers.
- **`../../protocol/languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/Descriptors.kt`** — reusable protocol descriptor and codec types.
- **`Configuration.kt`** — runtime config container (color scheme, log level).
- **`CheckoutListener.kt`** + **`DefaultCheckoutListener`** — consumer-implemented lifecycle interface (failure, cancellation, permission prompts, file chooser). Changes here are consumer API changes.
- **`CheckoutPresentation.kt`** — Kotlin-first builder for per-presentation callbacks (`onFail`, `onCancel`, browser/system hooks, ECP `connect(...)`). Builds a `DefaultCheckoutListener` internally.

## Testing patterns

- Tests use **Robolectric** (`@RunWith(RobolectricTestRunner::class)`) to exercise Android framework code without a device.
- Main-thread tasks are drained with `shadowOf(Looper.getMainLooper()).runToEndOfTasks()`. If a test involves posted work and seems flaky, check whether this is being called.
- Assertion library is **AssertJ**; mocking is **Mockito** + **Mockito-Kotlin**. Mockito is on 5.x because the library targets JVM 11. Don't introduce new assertion/mocking libraries without discussion.
- Tests live in the same package as the class under test (file name: `ClassNameTest.kt`).

## Conventions

- **`-Xexplicit-api=strict`** is on for both published Kotlin artifacts. Every public class, method, field, and property must have an explicit visibility modifier. "Accidentally public" is not a thing here. This is a consumer-protection rule — if you see a public-by-default declaration, it was deliberate.
- **Max line length: 140** (detekt-enforced). Detekt config: `lib/detekt.config.yml`.
- **Library JVM target: 11.** Consumers must build with JDK 11+ to consume the published artifacts. Raising further is a major-version discussion.
- **Library Kotlin `apiVersion` / `languageVersion` are pinned at 2.0.** Set through `gradle/android-library-versions.gradle` so the published artifacts stay consumable by Kotlin 2.0+ projects even though the compiler itself is on a newer 2.x. Bumping this pin is the consumer-facing breaking change, not bumping the compiler - treat it as a planned major-version event.
- **Kotlin/JVM compatibility values live in `gradle/android-library-versions.gradle`.** Android SDK levels live in `lib/build.gradle`. Dependency, plugin, and Android artifact versions live in `gradle/libs.versions.toml`.
- **Protocol vs kit boundary:** the protocol artifact should own generated raw wire names, generated models, thin descriptors, and encoding/decoding helpers. Checkout Kit should own curation, default behavior, WebView integration, and the higher-level consumer API.
- **Prefer generated protocol models.** Before adding hand-written protocol DTOs, check the generated models in `../../protocol/languages/kotlin/embedded-checkout-protocol/src/main/java/com/shopify/ucp/embedded/checkout/Models.kt` and the OpenRPC schema. Use generated UCP/ECP types for wire payloads; reserve local DTOs for Android-internal transport helpers that are not represented in the schema.

## Public API surface

The Android public APIs are captured by the [binary-compatibility-validator](https://github.com/Kotlin/binary-compatibility-validator) Gradle plugin:

- `lib/api/lib.api` for `com.shopify:checkout-kit`.
- `../../protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` for `com.shopify:embedded-checkout-protocol`.

Every PR is gated in CI by `./gradlew :lib:apiCheck` from `platforms/android` and `./gradlew :embedded-checkout-protocol:apiCheck` from `protocol/languages/kotlin` — the build fails if either compiled public API diverges from the committed baselines.

If a change intentionally modifies public API (adding, removing, or changing any public class, method, field, or property):

1. Run `dev android api dump` to regenerate both baselines. For project-scoped updates, run `./gradlew :lib:apiDump` from `platforms/android` or `./gradlew :embedded-checkout-protocol:apiDump` from `protocol/languages/kotlin`.
2. Review the `.api` diffs — they are the single best indicator of consumer impact, and reviewers will focus on them.
3. Commit the updated `.api` file in the same PR as the code change.

If `apiCheck` fails and you did *not* intend to change public API, the diff tells you what inadvertently leaked out. Fix the leak rather than updating the baseline — you've accidentally shifted the consumer contract.

## Common commands

- Tests: `./gradlew test` (or `dev android test`)
- API surface: `./gradlew :lib:apiCheck` / `./gradlew :lib:apiDump` for Checkout Kit, `./gradlew :embedded-checkout-protocol:apiCheck` / `./gradlew :embedded-checkout-protocol:apiDump` from `protocol/languages/kotlin` for protocol, or `dev android api check` / `dev android api dump` for both.
- Lint: `./gradlew detekt lintRelease` (or `dev android lint`)
- Format: `./gradlew detekt --auto-correct` (or `dev android format`)
- Full local verification: `./gradlew clean test detekt lintRelease assembleRelease`
- Kotlin protocol only: from the repo root, `cd protocol/languages/kotlin && ./gradlew test apiCheck`
- Sample app build (from `samples/CheckoutKitAndroidDemo/`): `./gradlew assembleDebug`

## Consumer requirements

Raising any of these is a consumer-facing breaking change and needs visible release notes:

- `minSdk` (library's minimum supported Android API level at runtime)
- `compileSdk` floor for consumers (enforced via `aarMetadata.minCompileSdk` on the library, or implicitly raised by any transitive `androidx` dependency whose own metadata demands a newer `compileSdk`)
- Kotlin compiler / `apiVersion` / `languageVersion`
- JVM target

**Transitive `androidx` bumps can silently raise the `compileSdk` floor** — review dependabot PRs with this in mind, and run `./gradlew :lib:apiCheck` and check `aarMetadata` output when bumping any `androidx.*` dependency.

## Release process

Published Android artifact versions are bumped via:

1. `gradle/libs.versions.toml` (`checkoutKitAndroid` and `embeddedCheckoutProtocolAndroid`).
2. The install snippets in `README.md` (Gradle and Maven).
3. `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json` (`checkoutKit.nativeSdkVersions.android`) for the published `com.shopify:checkout-kit` SemVer that RN CI resolves from Maven.

Android releases are tagged `android/X.Y.Z` (Swift releases use bare `X.Y.Z`). The publish workflow filters on the `android/` prefix — without it, nothing publishes on the Android side.

Publishing goes through GitHub Releases → the repo-root `.github/workflows/android-publish.yml` → manual approval gate before Maven Central deploy. Full procedure: the repo-root `.github/CONTRIBUTING.md` "Releasing a new version".

## Things not to touch without discussion

- **Library Kotlin `apiVersion` / `languageVersion` pin (2.0).** Consumer compatibility floor; raising it is a deliberate major-version decision. The compiler version itself is not the lever.
- **`minSdk` / JVM target.** Same story.
- **`-Xexplicit-api=strict`.** Removing this would let implicit public declarations ship; keeping it is a consumer-protection invariant.
