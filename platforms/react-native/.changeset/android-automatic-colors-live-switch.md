---
"@shopify/checkout-kit-react-native": patch
---

On Android, with the automatic color scheme, native checkout colors now switch when the system theme changes while checkout is open. This requires `uiMode` in the host activity's `android:configChanges`, which the React Native template includes.
