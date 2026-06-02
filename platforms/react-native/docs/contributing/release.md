# Release

The `@shopify/checkout-kit-react-native` module is published to the NPM package
registry with public access.

In order to publish a new version of the package, you must complete the
following steps:

1. Bump the version in `modules/@shopify/checkout-kit-react-native/package.json` to an
   appropriate value.
2. Add a [Changelog](./CHANGELOG.md) entry.
3. Merge your PR to `main`.
4. Run the [Release package workflow](/actions/workflows/release.yml).

Supported release versions are:

- Stable: `X.Y.Z`
- Prerelease: `X.Y.Z-{alpha|beta|rc}.N`

The release workflow reads the version from
`modules/@shopify/checkout-kit-react-native/package.json`, validates it, and
creates the correctly namespaced `react-native/` tag (for example,
`react-native/4.0.1`). The manually entered workflow version is only a safety
check; it must match the package version exactly.

Select `Dry run` on the first run to review the planned tag without creating a
release. Rerun with `Draft release` to create a draft GitHub Release for human
review; publish the draft release when ready to start the React Native publish
workflow.

The publish workflow cleans the module folder, builds a new version, runs
`pnpm pack --dry-run` to verify the contents, and publishes to the NPM registry.

You can follow the publish action process via
https://github.com/Shopify/checkout-kit/actions/workflows/rn-publish.yml.
