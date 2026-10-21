---
"@shopify/checkout-kit": patch
---

Keep checkout telemetry local when running the source with the Vite dev server. Log metrics to the console by default and require `VITE_CK_TELEMETRY=production` to send them to production during development. Built packages retain production reporting.
