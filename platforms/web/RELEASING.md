# Releasing `@shopify/checkout-kit`

This guide covers how to publish a new version of the web package to npm.

The `Release package` workflow creates a platform-prefixed GitHub Release, then
publishes the package in a protected environment with SLSA provenance.

## Day-to-day: publishing a release

### 1. Bump the version (in a PR)

```bash
cd platforms/web
pnpm version <new-version> --no-git-tag-version
```

Use a [semver](https://semver.org/) string. Examples:

- `4.0.0-alpha.3` — next alpha prerelease
- `4.0.0-beta.1` — first beta
- `4.0.0-rc.1` — release candidate
- `4.0.0` — stable

`--no-git-tag-version` is intentional — the tag is created by the release
workflow in step 2, not by `pnpm version`.

Open a PR titled like `chore(web): bump to 4.0.0-alpha.3`. Get it reviewed
and merged into `main`. Wait for CI to be green on `main`.

### 2. Draft a GitHub Release

Run the [Release package workflow](../../actions/workflows/release.yml):

1. Select `Web` as the platform.
2. Enter the expected version. The workflow reads the version from
   `platforms/web/package.json` and fails if the typed version does not match.
3. Select `Dry run` first to review the release plan.
4. From the dry-run summary, run the generated GitHub CLI command to create a
   draft release without retyping the validated version.
5. Review the generated notes, then publish the draft release.

The workflow creates a `web/<version>` tag and marks versions containing a
prerelease identifier such as `-alpha`, `-beta`, or `-rc` as prereleases.

### 3. Approve the publish

Publishing the draft triggers the Web publish job in
`.github/workflows/release.yml`. The job uses the `npm-web` environment, which
requires a maintainer to approve before the publish actually runs.

You'll see a banner on the workflow run page: _Review pending deployments_.
Click through and approve.

### 4. Verify

Once approved, the workflow:

1. Validates the tag's version matches `package.json`
2. Runs the full pipeline (lint, test, build, publint)
3. Packs the tarball and prints its contents
4. Publishes to npm with the appropriate dist-tag and SLSA provenance

After it's green, sanity check:

```bash
# For a prerelease (published under the `next` dist-tag):
npm view @shopify/checkout-kit@next version

# For a stable release:
npm view @shopify/checkout-kit version
```

The package page on npm shows a _Provenance_ badge linking to the workflow
run that built it.

## Tag and dist-tag conventions

| Release type | Example tag | npm dist-tag | `npm install` resolves to |
| --- | --- | --- | --- |
| Stable | `web/4.0.0` | `latest` | `npm i @shopify/checkout-kit` |
| Alpha / beta / rc | `web/4.0.0-alpha.3` | `next` | `npm i @shopify/checkout-kit@next` |

The dist-tag is derived from the checked-in package version. Versions with a
prerelease identifier publish under `next`; stable versions publish under
`latest`.

The `web/` tag prefix is required so the publish workflow knows the release
is for the web platform. Other platforms have their own prefixes:

- Web: `web/X.Y.Z`
- Android: `android/X.Y.Z`
- Swift: bare `X.Y.Z`
- React Native: `react-native/X.Y.Z`

## Manual / emergency publish

Use `Production release` mode in the `Release package` workflow to create the
GitHub Release and run the protected Web publish job in the same workflow. Use
`Dry run` first to validate the package version and inspect the release plan.

## Required npm configuration

> [!IMPORTANT]
> Before the first Web release using `.github/workflows/release.yml`, update
> the npm Trusted Publisher to use `release.yml`. npm binds trusted publishing
> to the exact workflow filename; leaving it configured for the removed
> `web-publish.yml` workflow will cause publishing to fail.

These are the admin settings required to enable Trusted Publishing.

### npm Trusted Publisher

On <https://www.npmjs.com/package/@shopify/checkout-kit>:

1. _Settings → Trusted Publishers → Add a trusted publisher_
2. Configure:
   - **Provider**: GitHub Actions
   - **Owner**: `Shopify`
   - **Repository**: `checkout-kit`
   - **Workflow filename**: `release.yml`
   - **Environment name**: `npm-web`

This tells npm to accept publishes that present an OIDC token from this exact
workflow file in this environment. No long-lived `NPM_TOKEN` is needed. Verify
this setting after merging any workflow rename and before publishing.

### GitHub environment

In the repo's _Settings → Environments → New environment_:

- **Name**: `npm-web`
- **Required reviewers**: 1+ maintainers from the package owners list
- **Deployment branches and tags**: allow `main` and tags matching `web/*`

The required-reviewer rule means every publish requires explicit human
approval, even if the workflow somehow ran without authorization.

## Troubleshooting

### "Tag implies version X but package.json has Y"

You created a GitHub Release tagged `web/4.0.1` but forgot to bump
`package.json` first. Fix: bump in a PR (step 1 above), wait for it on main,
then delete and re-create the release with the same tag.

### "OIDC token exchange failed" / "Trusted publisher not found"

The npm Trusted Publisher configuration doesn't match the workflow. Common
causes:

- Workflow file was renamed (npm trusts the exact filename)
- Environment name was changed
- Workflow is running on a fork PR (Trusted Publishing only works on the
  base repo)

Confirm the npm Trusted Publisher settings match the workflow's
`environment: name:` and the workflow's filename exactly.

### Publish failed mid-way; some files showed up on npm

npm doesn't allow republishing the same version, even if the previous
publish was incomplete. Bump to the next patch (e.g. `4.0.0-alpha.3` →
`4.0.0-alpha.4`) and run the release again. Don't try to delete and
re-publish.

### "ENEEDAUTH" or other auth errors despite Trusted Publishing being set up

Check that:

- `permissions: id-token: write` is present on the job (it is in the
  current workflow)
- The job is running on a public GitHub-hosted runner (not self-hosted
  without OIDC support)
- The Trusted Publisher on npm is for the **same workflow file path** —
  npm matches `release.yml` exactly

## What gets published

The `files` field in `package.json` controls what's in the tarball:

```
LICENSE
README.md
package.json
dist/                       (built JS, .d.ts, custom-elements.json, source map)
src/                        (TypeScript source for consumers who want to read it)
```

Test files (`*.test.ts`), the playground (`sample/`), the `consumer-test`
harness, dev configs, and lockfiles are all excluded.

You can preview exactly what will be published before tagging a release:

```bash
cd platforms/web
pnpm pack --dry-run
```

## Related

- Workflow: [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
- Release validator: [`.github/scripts/validate-release-version`](../../.github/scripts/validate-release-version)
- Pattern reference: [`.github/workflows/android-publish.yml`](../../.github/workflows/android-publish.yml),
  [`.github/workflows/swift-publish.yml`](../../.github/workflows/swift-publish.yml)
- npm Trusted Publishers docs: <https://docs.npmjs.com/trusted-publishers>
- npm Provenance docs: <https://docs.npmjs.com/generating-provenance-statements>
