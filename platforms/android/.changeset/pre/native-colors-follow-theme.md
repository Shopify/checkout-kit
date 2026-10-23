---
"@shopify/checkout-kit-android": patch
---

Update native checkout colors when the system theme changes while checkout is open. With `ColorScheme.Automatic` and `uiMode` in the host activity's `android:configChanges`, the header, title, close icon, header border, progress bar, web view background, drag handle and navigation bar buttons switch to the new theme's colors, and checkout stays open.
