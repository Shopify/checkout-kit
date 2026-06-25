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
- [ ] I have updated `platforms/swift/CHANGELOG.md`
- [ ] I have updated the SwiftPM/CocoaPods version snippets in `platforms/swift/README.md` (major version only)

</details>

<details>
<summary>Releasing a new Embedded Checkout Protocol version?</summary>

- [ ] I have bumped `embeddedCheckoutProtocolAndroid` in `platforms/android/gradle/libs.versions.toml`
- [ ] I have updated `protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` if the public API changed

</details>

<details>
<summary>Releasing a new Android version?</summary>

- [ ] I have bumped `checkoutKitAndroid` in `platforms/android/gradle/libs.versions.toml`
- [ ] I have updated `platforms/android/CHANGELOG.md`
- [ ] I have updated the Gradle/Maven version snippets in `platforms/android/README.md`

</details>

> [!TIP]
> See the [Contributing documentation](./CONTRIBUTING.md) for the full release process per platform.
