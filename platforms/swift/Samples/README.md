# Swift Samples

This directory contains iOS sample apps for Checkout Kit.

The sample apps read generated `Storefront.xcconfig` files. From the repo root
or any platform directory, run `dev up` to provision the repo and create or sync
them from the shared `.env`.

| Sample | Purpose |
| --- | --- |
| `CheckoutKitSwiftDemo` | Storefront API cart flow with Apollo iOS, checkout presentation, buyer identity modes, Customer Account API sign-in, and protocol lifecycle events. |
| `ShopifyAcceleratedCheckoutsApp` | SwiftUI Shop Pay and Apple Pay accelerated checkout buttons. |

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

Open `Samples/Samples.xcworkspace` or
`Samples/CheckoutKitSwiftDemo/CheckoutKitSwiftDemo.xcodeproj` in Xcode, then
build and run the `CheckoutKitSwiftDemo` scheme.

XcodeGen generates associated-domain entitlements that read `STOREFRONT_DOMAIN` from `Storefront.xcconfig` at build time.

## ShopifyAcceleratedCheckoutsApp

To get started:

1. Create or sync the shared configuration from the repo root or this platform
   directory:

   ```sh
   dev up
   ```

2. If you are not using `dev`, copy the repo-root `.env.example` to `.env`,
fill in local values, then run `scripts/setup_storefront_env`.

The setup script generates `platforms/swift/Samples/ShopifyAcceleratedCheckoutsApp/Storefront.xcconfig`.

Open `Samples/Samples.xcworkspace` or
`Samples/ShopifyAcceleratedCheckoutsApp/ShopifyAcceleratedCheckoutsApp.xcodeproj`
in Xcode, then build and run the `ShopifyAcceleratedCheckoutsApp` scheme.

## Troubleshooting

| Build log output | Cause | Fix |
| --- | --- | --- |
| `Storefront.xcconfig: no such file or directory` | `Storefront.xcconfig` file is missing. | Run `dev up` from the repo root or any platform directory. |
| `STOREFRONT_DOMAIN` is blank in generated entitlements | `Storefront.xcconfig` exists but `STOREFRONT_DOMAIN` is blank. | Set it in `.env.local`, then run `dev up`. Root `.env` is generated, so an edit there is lost. |
| Associated domains not working at runtime | Domain value is incorrect. | Set the right value in `.env.local`, then run `dev up`. |
