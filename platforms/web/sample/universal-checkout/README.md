# Universal Checkout sample

A playground for the `<shopify-universal-checkout>` element. Run `dev web sample`
from the repository root and open http://localhost:5173/universal-checkout/.

The page builds carts from one or more stores, prepares a Universal session
through the sample's local server, and presents it with
`<shopify-universal-checkout>`. Its **Open Universal Checkout** button calls
`open()` once the session is ready.

The page shares its UI and local server with the Shop Pay page. See the
[Universal session sample guide](../universal-session/README.md) for the flow,
the panels and protocol inspector, environment configuration, and
troubleshooting.
