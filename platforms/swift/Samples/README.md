# Swift Samples

This directory contains iOS sample apps for Checkout Kit.

| Sample | Purpose |
| --- | --- |
| `MobileBuyIntegration` | Storefront API cart flow with Apollo iOS, checkout presentation, buyer identity modes, Customer Account API sign-in, and protocol lifecycle events. |
| `ShopifyAcceleratedCheckoutsApp` | SwiftUI Shop Pay and Apple Pay accelerated checkout buttons. |

## Prerequisites

- Xcode with Swift Package Manager support
- A Shopify store with a Storefront API access token
- Optional Customer Account API app configuration for authenticated buyer flows
- Optional Apple Pay merchant identifier and payment processing certificate for accelerated checkout

## MobileBuyIntegration

From the repo root:

```sh
cp .env.example .env
scripts/setup_storefront_env
```

Fill `.env` with:

- `STOREFRONT_DOMAIN`
- `STOREFRONT_ACCESS_TOKEN`
- `API_VERSION`
- Optional Customer Account API values
- Optional demo buyer identity values

The setup script generates `platforms/swift/Samples/MobileBuyIntegration/Storefront.xcconfig`.

Open `platforms/swift/Samples/Samples.xcworkspace` or `platforms/swift/Samples/MobileBuyIntegration/MobileBuyIntegration.xcodeproj` in Xcode, then build and run the `MobileBuyIntegration` scheme.

The project generates associated-domain entitlements from `Storefront.xcconfig` during the Xcode build pre-action.

## ShopifyAcceleratedCheckoutsApp

From the repo root:

```sh
cp .env.example .env
scripts/setup_storefront_env
```

Fill `.env` with:

- `STOREFRONT_DOMAIN`
- `STOREFRONT_ACCESS_TOKEN`
- `API_VERSION`

The setup script generates `platforms/swift/Samples/ShopifyAcceleratedCheckoutsApp/Storefront.xcconfig`.

Open `platforms/swift/Samples/Samples.xcworkspace` or `platforms/swift/Samples/ShopifyAcceleratedCheckoutsApp/ShopifyAcceleratedCheckoutsApp.xcodeproj` in Xcode, then build and run the `ShopifyAcceleratedCheckoutsApp` scheme.

## Troubleshooting

If the build pre-action fails, Xcode usually shows `exited with status code 1`. Open the build log and check the script output.

| Build log output | Cause | Fix |
| --- | --- | --- |
| `grep: Storefront.xcconfig: No such file or directory` | The sample config file is missing. | Run `scripts/setup_storefront_env` from the repo root. |
| `Error: STOREFRONT_DOMAIN is not set in Storefront.xcconfig` | `STOREFRONT_DOMAIN` is blank. | Set your shop domain without `https://`. |
| Associated domains do not work at runtime | Domain or app association is wrong. | Verify your custom storefront domain, app ID, and Universal Links setup. |
