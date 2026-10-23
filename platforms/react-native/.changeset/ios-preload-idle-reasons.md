---
"@shopify/checkout-kit-react-native": major
---

Adapt React Native preload observation to the native idle lifecycle model. Expired and invalidated preloads now emit `{type: 'idle', reason: 'expired' | 'invalidated'}` instead of a separate `expired` state. Initial idle has no reason, and unfamiliar native idle reasons are preserved.

Update the Swift and Android SDK dependencies to `4.0.0-alpha.10` and map appearance colors to their renamed native properties.
