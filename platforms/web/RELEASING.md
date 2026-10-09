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
2. Runs lint and tests, builds npm and CDN separately, and verifies both outputs
3. Packs the tarball and prints its contents
4. Verifies the CDN deploy identity holds the bucket permissions the upload
   needs (no credentials are left on disk at this point)
5. Publishes the verified `dist/` to npm with the appropriate dist-tag and
   SLSA provenance (`--ignore-scripts`, so `prepack` does not rebuild)
6. Deploys the matching major-version CDN loader and its private implementation
   chunks from `dist-cdn/`: stable versions on `latest` that are not marked as
   GitHub prereleases go to `v<major>/web-components.js`; all other releases go
   to the testing-only `v<major>/unstable/web-components.js`

See [CDN publishing](./CDN-PUBLISHING.md) for the CDN URL contract and loader behavior.

After it's green, sanity check:

```bash
# For a prerelease (published under the `next` dist-tag):
npm view @shopify/checkout-kit@next version

# For a stable release:
npm view @shopify/checkout-kit version
```

The package page on npm shows a _Provenance_ badge linking to the workflow
run that built it.

The CDN caches `/checkout-kit/` paths for up to 30 minutes at the edge and 10
minutes in the browser, with no purge on upload. Allow for that before checking
the deployed loader, and confirm the build with its `version` export:

```js
// In a browser console (the loader is minified, so grep is not reliable):
(await import("https://cdn.shopify.com/checkout-kit/v4/unstable/web-components.js")).version;
(await import("https://cdn.shopify.com/checkout-kit/v4/web-components.js")).version;
```

### Bad deploy

A bad stable deploy stays live for up to ~40 minutes (30 at the edge, then 10
in browsers) unless purged. To roll back:

1. Re-run the workflow run of the release you want to restore (Actions → the
   release's run → "Re-run all jobs"). It skips the already-published npm
   version and redeploys that release's CDN assets. A *fresh* manual dispatch
   refuses to deploy an already-published version, because `main` may no
   longer match the published tarball; re-running an existing run is fine.
2. Purge the loader URL (`/checkout-kit/v<major>/web-components.js`) from the CDN
   edge using the internal CDN purge process. Only the loader needs purging;
   chunks are content-hashed. Browser caches cannot be purged and expire within
   10 minutes.
3. Fix forward with a new patch release; `npm deprecate` the bad version if it
   also shipped to npm.

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

The `tag` override controls npm publication. Even if a prerelease is explicitly
published under npm's `latest` tag, it still goes to the unstable CDN URL.
Non-`latest` tags all share that same unstable destination within the major.

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
   - **Dry run** — runs validation and reports the selected CDN URL without
     publishing to npm or uploading CDN assets. Use this
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

#### CDN deployment secrets

The CDN deploy identity and destination are **environment secrets** on
`npm-web`, not values in the workflow file. They are identifiers rather than
credentials (authentication is OIDC, minted per run), but keeping them out of
the public repository and masked in logs limits what a reader learns about the
deployment. The workflow fails early, without printing values, if any is
missing.

| Secret | Contents |
| --- | --- |
| `CDN_GCP_PROJECT_ID` | Google Cloud project that owns the deployment bucket and identity |
| `CDN_GCP_WORKLOAD_IDENTITY_PROVIDER` | Full resource name of the GitHub Actions workload identity provider |
| `CDN_GCP_SERVICE_ACCOUNT` | Email of the deploy service account |
| `CDN_BUCKET` | Name of the CDN deployment bucket |

The values live in the internal infrastructure configuration for Checkout Kit;
ask a maintainer rather than reconstructing them. Because they are secrets,
GitHub masks them in logs; the workflow additionally avoids echoing them.

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

### "Missing npm-web environment secrets"

The CDN deployment secrets above are not set on the `npm-web` environment, or
the job is not running with that environment. Add them in _Settings →
Environments → npm-web → Environment secrets_. Dry runs need them too, since
the pre-flight exercises the deploy identity.

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
```

The separate CDN output (`dist-cdn/`), TypeScript source, test files, the
playground (`sample/`), dev configs, and lockfiles are all excluded. `prepack`
runs `pnpm build:npm` only; `pnpm build` builds both npm and CDN artifacts.

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
