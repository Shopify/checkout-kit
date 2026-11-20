# Checkout Kit for Web changelog

## 4.0.1

### Patch Changes

- Expose optional `actions` and `policies` types on checkout snapshots, matching the mobile SDKs and UCP schema.
- Remove the URL path warning from `<shopify-universal-checkout>` and `<shop-pay>` so continuation URLs such as `/checkouts/r/…` can be opened without a misleading warning.
- Open `mailto:` and `tel:` links from checkout in the buyer's mail or phone app. Previously, Checkout Kit ignored them and only opened `https:` links.
- Send fewer diagnostic metrics requests while the metrics endpoint fails. When the page hides more than once while Checkout Kit waits to retry an export, only the first hide sends a request. Before, every hide sent one.
- Send an element's buffered diagnostic metrics as soon as the element disconnects, without waiting for an export already in progress. If the page closed before that export finished, the buffered measurements were lost. After an element disconnects, its metrics client also sends nothing more, so `telemetry="false"` set after a disconnect now stops every later export.

## 4.0.0

Initial stable release.

## Earlier releases

Earlier release notes are on [GitHub Releases](https://github.com/Shopify/checkout-kit/releases).
