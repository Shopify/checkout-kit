# Swift Samples

This directory contains the iOS sample app for Checkout Kit.

The sample app reads a generated `Storefront.xcconfig` file. From the repo root
or any platform directory, run `dev up` to provision the repo and create or sync
them from the shared `.env`.

| Sample | Purpose |
| --- | --- |
| `CheckoutKitSwiftDemo` | Storefront API cart flow with Apollo iOS, checkout presentation, Shop Pay and Apple Pay accelerated checkout buttons, buyer identity modes, Customer Account API sign-in, and protocol lifecycle events. |

## Prerequisites

- Xcode with Swift Package Manager support
- A Shopify store with a Storefront API access token
- Optional Customer Account API app configuration for authenticated buyer flows
- Optional Apple Pay merchant identifier and payment processing certificate for accelerated checkout

## CheckoutKitSwiftDemo

### Getting Started

1. Create or sync the shared configuration from the repo root or this platform
   directory:

   ```sh
   dev up
   ```

2. If you are not using `dev`, copy the repo-root `.env.example` to `.env`,
fill in local values, then run `scripts/setup_storefront_env`.

The setup script generates `platforms/swift/Samples/CheckoutKitSwiftDemo/Storefront.xcconfig` and the sample Xcode project files from XcodeGen specs.

Open `Samples/CheckoutKitSwiftDemo/CheckoutKitSwiftDemo.xcodeproj` in Xcode,
then build and run the `CheckoutKitSwiftDemo` scheme.

XcodeGen generates associated-domain and Apple Pay entitlements that read values from `Storefront.xcconfig` at build time. The app's Settings tab can configure the accelerated checkout locale, Apple Pay contact fields and button style, buyer email and phone overrides, supported shipping countries, and logging.

## Troubleshooting

| Build log output | Cause | Fix |
| --- | --- | --- |
| `Storefront.xcconfig: no such file or directory` | `Storefront.xcconfig` file is missing. | Run `dev up` from the repo root or any platform directory. |
| `STOREFRONT_DOMAIN` is blank in generated entitlements | `Storefront.xcconfig` exists but `STOREFRONT_DOMAIN` is blank. | Set it in `.env.local` (Shopify employees) or `.env` (external contributors), then rerun setup. |
| Associated domains not working at runtime | Domain value is incorrect. | Correct it in `.env.local` (Shopify employees) or `.env` (external contributors), then rerun setup. |
