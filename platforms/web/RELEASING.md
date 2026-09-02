# Releasing `@shopify/checkout-kit`

This guide covers how to publish a new version of the web package to npm.

The release flow mirrors the existing Android (`android-publish.yml`) and
Swift (`swift-publish.yml`) workflows: a maintainer drafts a GitHub Release
with a platform-prefixed tag, a workflow runs in a protected environment, and
the package is published to npm with SLSA provenance.

## Day-to-day: publishing a release

### 1. Bump the version (in a PR)

```bash
cd platforms/web
pnpm version <new-version> --no-git-tag-version
```

Use a [semver](https://semver.org/) string. Examples:

- `4.0.0-alpha.4` — next alpha prerelease
- `4.0.0-beta.1` — first beta
- `4.0.0-rc.1` — release candidate
- `4.0.0` — stable

`--no-git-tag-version` is intentional — the tag is created by the GitHub
Release UI in step 2, not by `pnpm version`.

Open a PR titled like `chore(web): bump to 4.0.0-alpha.4`. Get it reviewed
and merged into `main`. Wait for CI to be green on `main`.

### 2. Draft a GitHub Release

Go to <https://github.com/Shopify/checkout-kit/releases/new>:

- **Tag**: `web/<version>` — e.g. `web/4.0.0-alpha.4`. Create the tag from `main`.
- **Title**: `Web <version>` — e.g. `Web 4.0.0-alpha.4`.
- **Notes**: click _Generate release notes_ and edit as needed. Highlight
  any breaking changes at the top.
- **Set as a pre-release**: ✅ check this box for any version containing
  `-alpha`, `-beta`, or `-rc`. Leave unchecked for stable releases.
- **Set as the latest release**: ✅ check for stable releases only. Don't
  check for prereleases.

Click _Publish release_.

### 3. Approve the publish

The release event triggers `.github/workflows/web-publish.yml`. The job uses
the `npm-web` environment, which requires a maintainer to approve before the
publish actually runs.

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
| Alpha / beta / rc | `web/4.0.0-alpha.4` | `next` | `npm i @shopify/checkout-kit@next` |
| Manual override | any | whatever you pass to `workflow_dispatch` | depends on tag |

The dist-tag is computed from three layered signals, in priority order:

1. **Explicit override** — if you set the `tag` input on `workflow_dispatch`,
   that value wins (`latest`, `next`, `beta`, etc.).
2. **GitHub Release's pre-release flag** — if you checked "Set as a
   pre-release" in the Releases UI, the workflow uses `next`.
3. **Defensive fallback from `package.json` version** — if the version
   contains a `-` (a semver prerelease identifier like `4.0.0-alpha.1`),
   the workflow uses `next` regardless of the release flag. This catches:
   - `workflow_dispatch` runs (where there's no release event so the
     prerelease flag is empty)
   - Release events where the maintainer forgot to check the
     "pre-release" box for an obviously-prerelease version.

If none of the above applies (stable version, no override, not flagged as
pre-release), the workflow publishes under `latest`.

If you ever genuinely want to publish a `-alpha.X` version under `latest`
(rare — usually a mistake), use the `tag` `workflow_dispatch` input to
explicitly override.

The `web/` tag prefix is required so the publish workflow knows the release
is for the web platform. Other platforms have their own prefixes:

- Web: `web/X.Y.Z`
- Android: `android/X.Y.Z`
- Swift: bare `X.Y.Z`
- React Native: TBD

## Manual / emergency publish

You can trigger the workflow directly without creating a GitHub Release:

1. Go to _Actions → Web — Publish to npm → Run workflow_
2. Choose the branch (usually `main`)
3. Optionally:
   - **Override dist-tag** — e.g. `latest`, `next`, `beta`, `experimental`
   - **Dry run** — runs everything except the final `npm publish`. Use this
     to sanity-check the pipeline before a real publish, or to verify a
     misconfigured release.

The tag-vs-package.json validation is skipped on `workflow_dispatch` runs
(since there's no tag to validate against). Make sure `package.json`'s
version is correct before running.

## One-time setup (already done — for reference)

These are the one-time admin tasks required to enable Trusted Publishing.
Documented here so this guide remains complete if the configuration ever
needs to be re-created.

### npm Trusted Publisher

On <https://www.npmjs.com/package/@shopify/checkout-kit>:

1. _Settings → Trusted Publishers → Add a trusted publisher_
2. Configure:
   - **Provider**: GitHub Actions
   - **Owner**: `Shopify`
   - **Repository**: `checkout-kit`
   - **Workflow filename**: `web-publish.yml`
   - **Environment name**: `npm-web`

This tells npm to accept publishes that present an OIDC token from this exact
workflow file in this environment. No long-lived `NPM_TOKEN` is needed.

### GitHub environment

In the repo's _Settings → Environments → New environment_:

- **Name**: `npm-web`
- **Required reviewers**: 1+ maintainers from the package owners list
- **Deployment branches**: restrict to `main`

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
publish was incomplete. Bump to the next patch (e.g. `4.0.0-alpha.4` →
`4.0.0-alpha.5`) and run the release again. Don't try to delete and
re-publish.

### "ENEEDAUTH" or other auth errors despite Trusted Publishing being set up

Check that:

- `permissions: id-token: write` is present on the job (it is in the
  current workflow)
- The job is running on a public GitHub-hosted runner (not self-hosted
  without OIDC support)
- The Trusted Publisher on npm is for the **same workflow file path** —
  npm matches `web-publish.yml` exactly

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

- Workflow: [`.github/workflows/web-publish.yml`](../../.github/workflows/web-publish.yml)
- Pattern reference: [`.github/workflows/android-publish.yml`](../../.github/workflows/android-publish.yml),
  [`.github/workflows/swift-publish.yml`](../../.github/workflows/swift-publish.yml)
- npm Trusted Publishers docs: <https://docs.npmjs.com/trusted-publishers>
- npm Provenance docs: <https://docs.npmjs.com/generating-provenance-statements>
