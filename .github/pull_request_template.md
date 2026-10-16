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
> - [ ] I've added a changeset (`pnpm changeset <platform>`) for each affected platform, or an empty one (`--empty`) if no release note is needed

---

<details>
<summary>Merging a platform release pull request?</summary>

- [ ] I've reviewed the generated `CHANGELOG.md` entry
- [ ] I've updated the platform's installation snippets and the root README version table
- [ ] React Native: I've regenerated both React Native `Podfile.lock` files without `--local`

</details>

<details>
<summary>Releasing a new Embedded Checkout Protocol version?</summary>

- [ ] I have bumped `embeddedCheckoutProtocolAndroidRelease` in `platforms/android/gradle/libs.versions.toml`
- [ ] I have updated `protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin/embedded-checkout-protocol/api/embedded-checkout-protocol.api` if the public API changed
- [ ] Kit's `embeddedCheckoutProtocolAndroid` still references an available Maven Central release

</details>

<details>
<summary>Adopting new native SDK or protocol versions?</summary>

- [ ] Android: the ECP version in `embeddedCheckoutProtocolAndroid` is published, and normal Android CI passes against it
- [ ] React Native: updated `checkoutKit.nativeSdkVersions` pins are available on Maven Central/CocoaPods
- [ ] React Native: normal RN Android tests and the sample build pass against the published SDK, without `--local` or `USE_LOCAL_SDK=1`

</details>

> [!TIP]
> See the [Contributing documentation](./CONTRIBUTING.md) for the full release process per platform.
> Changes spanning ECP, Android, and RN follow the [dependency release sequence](./CONTRIBUTING.md#coordinating-ecp-android-and-react-native-releases).
