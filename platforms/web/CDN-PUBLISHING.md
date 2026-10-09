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
can request several components in one call. Nothing is loaded implicitly: an
empty list is rejected, every name is validated before anything is fetched,
and the call rejects if any component fails to load. The
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

npm and the CDN are published in two steps:

1. **`Web — Publish to npm`** in this repository runs on a `web/X.Y.Z` GitHub
   Release. It builds and verifies both the npm package (`dist/`) and the CDN
   output (`dist-cdn/`), then publishes to npm. It does not upload to the CDN.
2. **The CDN deploy** runs from Shopify's internal release tooling, which
   maintainers trigger with the same release tag once npm publication has
   succeeded. It checks out that tag of this repository, rebuilds `dist-cdn/`,
   confirms the version is on npm (the CDN never ships a version npm does not
   have), reads the npm dist-tag back, runs `scripts/cdn-release-policy.mjs`
   from the tag to select the channel, verifies the deploy identity's bucket
   permissions, and uploads content-hashed chunks before the loader. A dry run
   stops before uploading.

The channel policy is this repository's own script, so it is the same wherever
it runs:

| Release | CDN loader |
| --- | --- |
| Stable package version, not marked as a GitHub prerelease, npm tag `latest` | `v<major>/web-components.js` |
| SemVer prerelease or marked as a GitHub prerelease, with any npm tag | `v<major>/unstable/web-components.js` |
| Stable package version on any other npm tag, including `next`, `beta`, or `experimental` | `v<major>/unstable/web-components.js` |

A manual `latest` override cannot promote a prerelease to the stable CDN URL.
All preview npm channels share the same unstable CDN destination for that major;
each deployment replaces the previous preview. Stable releases do not update
the unstable URL.

Re-dispatching the deploy with an older release tag redeploys that release,
which is the rollback mechanism; a superseded version resolves to the channel
it originally shipped to. The deploy does not require versions to increase.
Rollbacks are subject to the same cache window as deployments (see below).

### Limitations

- The npm workflow runs from `main`, so it does not currently support
  patching an older major after a new major has shipped. Doing so would need a
  maintenance branch, and the stable CDN gate would need to stop depending on
  the npm `latest` tag (npm has only one `latest` across majors). This is a
  known gap; revisit before the first `5.0.0`.
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
