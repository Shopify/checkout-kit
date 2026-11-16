---
"@shopify/checkout-kit-android": patch
---

Offsite pages opened inside checkout now respect their `<meta name="viewport">` tag, as in Chrome. Before this change, the checkout WebView always laid pages out at its own width, so payment pages built for a fixed design width (for example `width=750`) or scaled by `devicePixelRatio` rendered 2–3× too large and ran off screen. Shopify checkout pages declare `width=device-width` and are unaffected. Pages without a viewport tag now load zoomed out to fit the screen, as in Chrome.
