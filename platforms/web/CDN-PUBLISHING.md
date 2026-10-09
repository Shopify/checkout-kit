# Checkout Kit CDN publishing

Checkout Kit Web is published to npm today. CDN publishing adds a browser-native
ES module distribution for consumers that cannot, or prefer not to, use a
package manager.

## Public URL contract

Checkout Kit has a dedicated CDN namespace. URLs are evergreen within a
Checkout Kit major version:

```text
https://cdn.shopify.com/checkout-kit/v4/web-components.js
```

Compatible minor and patch releases replace the assets served from that major
path. A breaking Checkout Kit API or browser-support change requires a new
major URL, such as `/checkout-kit/v5/web-components.js`.

The CDN major is the Checkout Kit library major; it is not a protocol version.

### Internal testing channel

> **Not a public entrypoint.** The unstable URL exists so Checkout Kit
> maintainers can exercise prereleases through the real CDN before promotion.
> It is not documented for consumers, is not covered by any compatibility or
> availability guarantee, and may break, change, or disappear at any time. Do
> not reference it in consumer-facing documentation, samples, support replies,
> or production code.

Each major has a moving, maintainer-only loader under `v<major>/unstable/`. It
may change incompatibly on any deployment. Retest reported issues against its
current build; historical builds are not preserved at exact-version URLs. The
default npm prerelease tag remains `next`; the CDN name `unstable` describes the
compatibility contract. A new deployment reaches the channel within the CDN's
cache window (see [Caching](#caching-and-asset-retention)), typically under 30
minutes; check the loader's `version` export to confirm which build a page
received.

The directory form keeps the loader's relative imports within
`v4/unstable/assets/`, separate from stable `v4/assets/`. A filename such as
`v4/checkout-kit-unstable.js` would resolve the existing `./assets/` imports into
the stable assets directory, requiring build changes to provide the same
isolation. Both channels use the same build and loader API.

## Component versioning

### Current model

The initial loader-managed components share the Checkout Kit major. This mirrors
the current Web package: its root entrypoint and any subpath entrypoints are
published from one package version and one release stream.

This gives consumers one simple compatibility model: a component loaded from a
`v4` loader is part of Checkout Kit major 4. Adding a new compatible component
or updating an existing compatible component does not change the loader URL.

### Limitation

A breaking public change to one loader-managed component requires a new Checkout
Kit major URL for every component, even when the other components have no
breaking change. This is intentionally conservative, but it can create
unnecessary coordinated upgrades as the set of components grows.

## Module loader

`web-components.js` is a stable ES module loader rather than a bundle containing
every Checkout Kit capability. The name mirrors Storefront Web Components
(`/storefront/web-components.js`), but unlike that bundle, importing it alone
registers nothing: consumers import it and load only the component they need.
Per-component drop-in files, if added later, belong under
`v<major>/web-components/<tag>.js`.

```js
import {loadComponents} from "https://cdn.shopify.com/checkout-kit/v4/web-components.js";

await loadComponents(["shopify-checkout"]);
```

The initial supported component is `shopify-checkout`; component names are the
custom element tags they register. `loadComponents` takes an array so a page
can request several components in one call; every name is validated before
anything is fetched, and the call rejects if any component fails to load. The
loader resolves each component
to a self-contained implementation chunk under the same major-version directory
and registers `<shopify-checkout>`. Repeating a request for the same component
is safe, and concurrent requests share one load.

Browsers remember a failed dynamic import for that URL for the rest of the
page, so a single transient network error would otherwise make the component
unloadable. The loader therefore retries a failed import (up to three attempts
with backoff) through a cache-busting query string on the chunk URL, which the
browser treats as a fresh module. The chunk URL is injected into the loader at
build time; registration is idempotent, so a retry after a partial failure
cannot double-register.

The loader also exports `version`, the Checkout Kit package version it was built
from, and `supportedComponents`.

Additional components may be added to the loader in compatible releases. The
wallets work will be considered as a future component after its public
entrypoint and API are settled; it is not part of the initial CDN contract.

Implementation chunks are content-hashed deployment details, not public URLs.
Consumers should import a documented loader URL and use its API.

## Browser artifacts

The Web package owns two separate builds from the same source and version:

The npm component subpath (`@shopify/checkout-kit/shopify-checkout`) and CDN
loader (`src/cdn-loader.ts`) both use
`src/components/shopify-checkout/register.ts`, which registers the element
through `ShopifyCheckout.register()`. The npm root import registers nothing.
New components get their own npm subpaths and loader entries.
Component implementation and registration live together, with no separate CDN
component source tree.

- `pnpm build:npm` uses `vite.config.ts` to produce the npm package in `dist/`.
- `pnpm build:cdn` uses `vite.cdn.config.ts` to produce the loader and hashed
  implementation chunks in `dist-cdn/`, which is excluded from the npm package.
- `pnpm build` runs both; `pnpm verify` checks both distributions, including
  loading them together on the same page.

Each build cleans only its own output directory. The CDN build does not depend
on npm output or a published npm release. `pnpm pack` builds only the npm
distribution; the release workflow builds and verifies both before publishing.

The initial CDN release contains one ESM artifact family, built to the browser
floor declared in the package's `browserslist` (the same floor the npm package
documents and lints against). We are deliberately not publishing separate
modern and baseline builds yet. Introducing a second artifact family or raising
the supported browser floor is a compatibility decision that requires its own
review; a breaking change requires a new CDN major URL.

## Publishing

The Web release workflow builds, tests, and validates both distributions before it
selects one CDN destination:

| Release | CDN loader |
| --- | --- |
| Stable package version, not marked as a GitHub prerelease, npm tag `latest` | `v<major>/web-components.js` |
| SemVer prerelease or marked as a GitHub prerelease, with any npm tag | `v<major>/unstable/web-components.js` |
| Stable package version on any other npm tag, including `next`, `beta`, or `experimental` | `v<major>/unstable/web-components.js` |

A manual `latest` override cannot promote a prerelease to the stable CDN URL.
All preview npm channels share the same unstable CDN destination for that major;
each deployment replaces the previous preview. Stable releases do not update
the unstable URL. Dry runs report the selected channel and destination.

For a non-dry-run release the workflow:

1. derives the numeric major from `platforms/web/package.json`;
2. uploads the loader's content-hashed chunks and source maps from `dist-cdn/`
   into the selected channel's `assets/` directory;
3. uploads that channel's `web-components.js` only after its implementation chunks
   are available.

Before publishing to npm, the workflow obtains a short-lived token for the
CDN deploy identity and asks GCS to confirm it holds the `create`, `delete`,
and `list` object permissions the upload steps need on the
CDN deployment bucket, so a broken or under-privileged identity
fails the run before anything irreversible happens. That pre-flight writes no credentials file and exports no environment
variables; full authentication happens only after npm publication, immediately
before the upload steps, so package code never runs with CDN credentials
available. npm publication uses `--ignore-scripts` so the tarball contains the
`dist/` that was built and verified earlier in the job. Dry runs exercise the
pre-flight without uploading.

Re-running a release's workflow run for an already-published npm version
skips npm publication and redeploys that release's CDN assets to the channel
selected by the same rules; the checkout is the release tag, so the deployed
code matches the published tarball. Re-running an older release intentionally
replaces that channel's loader with the selected release, allowing a rollback.
A fresh manual `workflow_dispatch` builds `main`, so it fails if the version is
already published rather than deploying code to the CDN that never shipped to
npm. Re-running an existing workflow run (release or manual) is allowed, since
it rebuilds the same commit; use that to repair a run whose CDN upload failed
after npm publication.
The workflow does not require versions to increase on each deployment.
Rollbacks are subject to the same cache window as deployments (see below).

### Limitations

- Releases run from `main`, so the workflow does not currently support
  patching an older major after a new major has shipped. Doing so would need a
  maintenance branch and a CDN channel override, because the stable gate
  requires the npm `latest` tag and npm has only one `latest` across majors.
  This is a known gap; revisit before the first `5.0.0`.
- The stable URL for a major returns 404 until that major's first stable
  release has been deployed.

### Caching and asset retention

The CDN applies one caching policy to every path under `/checkout-kit/`,
regardless of per-object metadata. It is the same policy used for Storefront
Web Components:

```text
CDN edge: public, max-age=1800
Browser:  public, max-age=600, must-revalidate
```

The workflow therefore does not set `Cache-Control` on uploaded objects, and
there is no cache purge after upload. Consequences:

- A new deployment, or a rollback, is visible to all consumers within about
  30 minutes (up to 30 minutes at the edge, then up to 10 minutes in browsers
  that already hold a copy). This applies equally to the stable and unstable
  loaders.
- Content-hashed chunks are also cached for at most 10 minutes in the browser.
  Correctness does not depend on long-lived chunk caching: a loader only ever
  references chunks that were uploaded before it, and chunks are never deleted,
  so a cached loader and a fresh loader both resolve to valid chunks.
- Testers on the unstable channel should confirm the build they received using
  the loader's `version` export rather than assuming the latest deployment.

Uploads retain older chunks so cached loaders and open pages can finish lazy
loading. This workflow does not configure automatic deletion. A separate cleanup
policy can be scoped to `v<major>/unstable/assets/`: it must retain every chunk
reachable from the current loader and allow a grace period for previous loaders.
Do not apply an age-only deletion rule to the entire unstable directory, because
it could delete the current build when no new preview has shipped recently.

## npm compatibility

Only the npm component entry (`@shopify/checkout-kit/shopify-checkout`) registers
`<shopify-checkout>`; the root import (`@shopify/checkout-kit`) exports the class
without registering it. The component entry is marked side-effectful so bundlers
retain registration. Package verification bundles each import combination as a
consumer and checks which elements are registered. It also loads the
independently built npm and CDN distributions in both orders: whichever
registers `<shopify-checkout>` first keeps it, and the npm root alongside the CDN
loader leaves registration to the loader.

## Non-goals

- An unversioned Checkout Kit CDN URL.
- Exact-version CDN URLs such as `/v4.0.0/`.
- Public URLs for individual implementation chunks.
- Separate modern and baseline artifact families.
- Loading every future Checkout Kit capability by default.
