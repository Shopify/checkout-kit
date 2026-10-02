### What changes are you making?

<!-- Please describe why you are making these changes -->

### How to test

<!-- Please outline the steps to test your changes -->

---

### Before you merge

> [!IMPORTANT]
>
> - [ ] I've added tests to support my implementation
> - [ ] I have read and agree with the [Contribution Guidelines](./CONTRIBUTING.md)
> - [ ] I have read and agree with the [Code of Conduct](./CODE_OF_CONDUCT.md)
> - [ ] I've updated the relevant platform README (`platforms/swift/README.md` and/or `platforms/android/README.md`)

---

<details>
<summary>Releasing a new Swift version?</summary>

- [ ] I have bumped the version in `ShopifyCheckoutKit.podspec`
- [ ] I have bumped the version in `platforms/swift/Sources/ShopifyCheckoutKit/ShopifyCheckoutKit.swift`
- [ ] I have updated the SwiftPM/CocoaPods version snippets in `platforms/swift/README.md` (major version only)

</details>

<details>
<summary>Releasing a new Embedded Checkout Protocol version?</summary>

- [ ] I have bumped `embeddedCheckoutProtocolAndroidRelease` in `platforms/android/gradle/libs.versions.toml`
- [ ] I have updated `protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` if the public API changed
- [ ] Kit's `embeddedCheckoutProtocolAndroid` still references an available Maven Central release

</details>

<details>
<summary>Releasing a new Android version?</summary>

- [ ] I have bumped `checkoutKitAndroid` in `platforms/android/gradle/libs.versions.toml`
- [ ] I have updated the Gradle/Maven version snippets in `platforms/android/README.md`
- [ ] The ECP version in `embeddedCheckoutProtocolAndroid` is published, and normal Android CI passes against it

</details>

<details>
<summary>Releasing a new React Native version?</summary>

- [ ] I have bumped `version` in `platforms/react-native/modules/@shopify/checkout-kit-react-native/package.json`
- [ ] Any updated `checkoutKit.nativeSdkVersions` pins are available on Maven Central/CocoaPods
- [ ] Normal RN Android tests and the sample build pass against the published SDK, without `--local` or `USE_LOCAL_SDK=1`

</details>

> [!TIP]
> See the [Contributing documentation](./CONTRIBUTING.md) for the full release process per platform.
> Changes spanning ECP, Android, and RN follow the [dependency release sequence](./CONTRIBUTING.md#coordinating-ecp-android-and-react-native-releases).
