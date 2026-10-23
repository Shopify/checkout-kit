---
"@shopify/checkout-kit": patch
---

Import `@shopify/checkout-kit` and `@shopify/checkout-kit/shopify-checkout` during server rendering without errors. Importing registers nothing on the server; `<shopify-checkout>` registers when the same import runs in the browser.
