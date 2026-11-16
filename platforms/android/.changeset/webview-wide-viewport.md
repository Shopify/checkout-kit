---
"@shopify/checkout-kit-android": patch
---

The checkout WebView now respects the page's `<meta name="viewport">` tag, matching Chrome. Before this change, the WebView always laid pages out at its own width, so offsite payment pages built for a fixed design width (for example `width=750`) or scaled by `devicePixelRatio` rendered 2–3× too large and ran off screen. Shopify checkout pages declare `width=device-width` and are unaffected. Pages without a viewport tag now load as a zoomed-out 980px layout, as in Chrome.
