---
"@shopify/checkout-kit-swift": major
---

Replace the `Wallet` enum with an extensible value type. Existing `.applePay` and `.shopPay` values remain available; update exhaustive `switch` statements to handle unknown wallet values.
