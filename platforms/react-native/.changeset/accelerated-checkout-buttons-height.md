---
"@shopify/checkout-kit-react-native": patch
---

Fix taps near the top and bottom edges of `AcceleratedCheckoutButtons` being ignored when its parent has no explicit height, such as a plain `View` or a `View` with only `minHeight`.
