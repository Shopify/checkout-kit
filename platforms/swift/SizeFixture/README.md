# Swift size fixture

A fixed consumer for SDK size regression checks. It is built, never launched by
CI, and uses only synthetic configuration. It does not need signing, a merchant
account, or a simulator.

The same SwiftUI app shell is compiled in three variants:

- **Baseline:** no SDK linked.
- **Core:** Checkout Kit presentation, preloading, and invalidation.
- **Accelerated:** the core integration plus Apple Pay and Shop Pay buttons.

Both SDK budgets subtract the baseline app's size. The accelerated budget includes
core Checkout Kit, rather than subtracting it. The measurement sums logical file
bytes in the `.app`, including linked dependencies and SDK resources. It excludes
external build products and debug symbols. Framework symlinks are not counted twice.

The build uses Xcode 26.2 (17C52), iOS 16 minimum deployment, device arm64, Release
optimization, dead stripping, and no signing. This measures a representative
integration, not every public API or a merchant's exact app-size increase. It is
uncompressed and does not estimate App Store download or installation sizes.

From the repository root, run `dev swift size /tmp/swift-size.tsv`. The output is
replaced only by a complete measurement; a failed run removes any stale output.
The generated Xcode project and build products live in a temporary directory.
XcodeGen is pinned by the existing Swift Mintfile. Package dependencies use the
measured revision's committed `Package.resolved`, with automatic resolution disabled.

`PACKAGE_SIZE_REPO_ROOT` can select another SDK checkout. The collector always
uses the current fixture, project settings, and tools for both head and base so
the comparison also works when the base predates this fixture. A consistently named
package symlink keeps directory-derived resource bundle identifiers stable. Changes to fixture
API usage or the toolchain change the measurement contract and may require new
budget baselines. See [budget policy](../../../.ci/bundle-size-budgets.md).
