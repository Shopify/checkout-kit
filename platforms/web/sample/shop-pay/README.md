# Shop Pay sample

A playground for the `<shop-pay>` element. Run `dev web sample` from the
repository root and open http://localhost:5173/shop-pay/.

The page builds carts from one or more stores, prepares a Universal session
through the sample's local server, and presents it with `<shop-pay>`. With the
`button` setting on, the session appears as Shop Pay's button, and a tap opens
checkout. With it off, the page's own **Buy with Shop Pay** button calls `open()`.

The page shares its UI and local server with the Universal Checkout page. See the
[Universal session sample guide](../universal-session/README.md) for the flow,
the panels and protocol inspector, environment configuration, and
troubleshooting.
