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
> - [ ] I've updated the relevant platform README (`swift/README.md` and/or `android/README.md`)

---

<details>
<summary>Releasing a new Swift version?</summary>

- [ ] I have bumped the version in `swift/ShopifyCheckoutSheetKit.podspec`
- [ ] I have bumped the version in `swift/Sources/ShopifyCheckoutSheetKit/ShopifyCheckoutSheetKit.swift`
- [ ] I have updated `swift/CHANGELOG.md`
- [ ] I have updated the SwiftPM/CocoaPods version snippets in `swift/README.md` (major version only)

</details>

<details>
<summary>Releasing a new Android version?</summary>

- [ ] I have bumped the `versionName` in `android/lib/build.gradle`
- [ ] I have updated `android/CHANGELOG.md`
- [ ] I have updated the Gradle/Maven version snippets in `android/README.md`

</details>

> [!TIP]
> See the [Contributing documentation](./CONTRIBUTING.md) for the full release process per platform.
