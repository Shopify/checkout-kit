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

The setup script generates `platforms/swift/Samples/CheckoutKitSwiftDemo/Storefront.xcconfig`.

Open `Samples/Samples.xcworkspace` or
`Samples/CheckoutKitSwiftDemo/CheckoutKitSwiftDemo.xcodeproj` in Xcode, then
build and run the `CheckoutKitSwiftDemo` scheme.

The project generates associated-domain entitlements from
`Storefront.xcconfig` during the Xcode build pre-action.

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

If the build pre-action fails, Xcode usually shows `exited with status code 1`.
Open the build log and check the script output.

| Build log output | Cause | Fix |
| --- | --- | --- |
| `grep: Storefront.xcconfig: No such file or directory` | `Storefront.xcconfig` file is missing. | Run `dev up` from the repo root or any platform directory. |
| `Error: STOREFRONT_DOMAIN is not set in Storefront.xcconfig` | `Storefront.xcconfig` exists but `STOREFRONT_DOMAIN` is blank. | Update root `.env`, then run `dev up`. |
| Associated domains not working at runtime | Domain value is incorrect. | Update root `.env`, then run `dev up`. |
