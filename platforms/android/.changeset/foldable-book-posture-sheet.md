---
"@shopify/checkout-kit-android": patch
---

Keep the checkout sheet off the fold on foldables. When a foldable is half opened in book posture, with the fold running vertically, the sheet moves to the start side of the fold and returns to the center when the device opens flat. In tabletop posture the sheet stays centered. Checkout Kit now depends on Jetpack WindowManager (`androidx.window:window` and `androidx.window:window-java` 1.5.1) to read the fold position.
