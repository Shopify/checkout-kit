---
"@shopify/checkout-kit-swift": minor
---

Restore separate ShopifyAcceleratedCheckouts.Customer initializers for authenticated buyers and guest contacts. The initializer that accepts both contact details and a customer access token is deprecated; use init(customerAccessToken:) or init(email:phoneNumber:) to avoid conflicting buyer identities.
