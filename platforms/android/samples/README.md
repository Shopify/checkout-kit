# Android Samples

This directory contains Android sample apps for Checkout Kit.

Sample app storefront configuration is generated from the repo-root `.env`.
Run `dev up` from the repo root or any platform directory to provision the repo
and create or sync the generated sample config files.

| Sample | Purpose |
| --- | --- |
| `MobileBuyIntegration` | Storefront API cart flow with Apollo Kotlin, checkout presentation, typed protocol lifecycle events, file chooser handling, geolocation callbacks, buyer identity demo data, and Customer Account API sign-in. |

## Setup

From the repo root or this platform directory:

```sh
dev up
```

If you are not using `dev`, copy the repo-root `.env.example` to `.env`, fill
in local values, then run:

```sh
scripts/setup_storefront_env
```

The setup script generates `platforms/android/samples/MobileBuyIntegration/.env`.

Open `MobileBuyIntegration` in Android Studio, sync Gradle, then build and run
the `app` target.
