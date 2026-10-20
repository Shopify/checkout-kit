---
"@shopify/checkout-kit-react-native": patch
---

Fix taps near the top and bottom edges of `AcceleratedCheckoutButtons` being ignored when its parent has a bounded height, such as a `View` with only `minHeight`.
