# Android Samples

This directory contains Android sample apps for Checkout Kit.

| Sample | Purpose |
| --- | --- |
| `MobileBuyIntegration` | Storefront API cart flow with Apollo Kotlin, checkout presentation, typed protocol lifecycle events, file chooser handling, geolocation callbacks, buyer identity demo data, and Customer Account API sign-in. |

## Setup

From `platforms/android/samples/MobileBuyIntegration`:

```sh
cp .env.example .env
```

Fill in:

- `STOREFRONT_DOMAIN`
- `STOREFRONT_ACCESS_TOKEN`
- `API_VERSION`
- Optional Customer Account API values
- Optional demo buyer identity values

Open `MobileBuyIntegration` in Android Studio, sync Gradle, then build and run the `app` target.
