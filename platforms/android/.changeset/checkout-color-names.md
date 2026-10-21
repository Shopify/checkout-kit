---
"@shopify/checkout-kit-android": major
---

Rename the checkout color properties so that each name ends in `Color`. The old names are removed. Update Kotlin and Java callers as follows:

| Old name | New name |
| --- | --- |
| `Colors.webViewBackground`, `ColorsBuilder.webViewBackground` | `webViewBackgroundColor` |
| `Colors.headerBackground`, `ColorsBuilder.headerBackground` | `headerBackgroundColor` |
| `Colors.headerFont`, `ColorsBuilder.headerFont` | `headerTitleColor` |
| `Colors.progressIndicator`, `ColorsBuilder.progressIndicator` | `progressIndicatorColor` |
| `Colors.closeIconTint`, `ColorsBuilder.closeIconTint` | `closeIconTintColor` |
| `ColorsBuilder.withWebViewBackground(...)` | `withWebViewBackgroundColor(...)` |
| `ColorsBuilder.withHeaderBackground(...)` | `withHeaderBackgroundColor(...)` |
| `ColorsBuilder.withHeaderFont(...)` | `withHeaderTitleColor(...)` |
| `ColorsBuilder.withProgressIndicator(...)` | `withProgressIndicatorColor(...)` |
| `ColorsBuilder.withCloseIconTint(...)` | `withCloseIconTintColor(...)` |
| `CheckoutSheetOptions.closeIconTint`, `CheckoutSheetOptions.Builder.closeIconTint` | `closeIconTintColor` |

Java accessors follow the same names, for example `getHeaderFont()` becomes `getHeaderTitleColor()` and `setCloseIconTint(...)` becomes `setCloseIconTintColor(...)`. `closeIcon`, `dragHandleColor`, `headerBorderColor`, and `scrimColor` are unchanged.

The `@Serializable` key names of `Colors` also change to the new property names. Color schemes that were serialized with an earlier version do not decode with this version. Serialize them again after you upgrade.
