---
"@shopify/checkout-kit-swift": major
---

Rename the `CheckoutColors` color properties and their `init` labels so that each color name ends in `Color`. The old names are removed without deprecated aliases. `closeIcon` and `headerBorderColor` keep their names.

| Before | After |
| --- | --- |
| `webViewBackground` | `webViewBackgroundColor` |
| `headerBackground` | `headerBackgroundColor` |
| `headerFont` | `headerTitleColor` |
| `progressIndicator` | `progressIndicatorColor` |
| `closeIconTint` | `closeIconTintColor` |

The initializer is now `CheckoutColors(webViewBackgroundColor:headerBackgroundColor:headerTitleColor:progressIndicatorColor:closeIcon:closeIconTintColor:headerBorderColor:)`. For example, replace `CheckoutColors(progressIndicator: .systemBlue)` with `CheckoutColors(progressIndicatorColor: .systemBlue)`, and `$0.headerFont = .label` with `$0.headerTitleColor = .label`.
