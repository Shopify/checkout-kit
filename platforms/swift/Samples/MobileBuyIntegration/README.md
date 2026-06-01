# MobileBuyIntegration Sample App

This sample demonstrates how to integrate Checkout Kit with the Shopify Storefront API using Apollo iOS.

## What it covers

- Product listing from the Storefront API
- Cart create, add, update, and fetch operations
- `cart.checkoutUrl` presentation with `ShopifyCheckoutKit`
- Checkout lifecycle and completion through `CheckoutProtocol.Client`
- Buyer identity demo data for checkout prefill
- Customer Account API sign-in and customer access token cart identity
- Universal Links entitlement generation for checkout/offsite-payment returns

## Architecture

The app uses Apollo iOS for Storefront API communication. GraphQL operations are defined as `.graphql` files, and Apollo's code generation tool produces type-safe Swift code from them.

```text
MobileBuyIntegration/
|-- MobileBuyIntegration/
|   |-- Sources/
|   |   |-- Api/                         Source of truth - edit these files
|   |   |   |-- Queries/
|   |   |   |   |-- GetProducts.graphql    Product listing query
|   |   |   |   |-- CartQuery.graphql      Fetch cart by ID
|   |   |   |   |-- CartFragment.graphql   Reusable cart fields
|   |   |   |   |-- CartLineFragment.graphql
|   |   |   |   |-- CartDeliveryGroupFragment.graphql
|   |   |   |   `-- CartUserErrorFragment.graphql
|   |   |   |-- Mutations/
|   |   |   |   |-- CartCreate.graphql     Create a new cart
|   |   |   |   |-- CartLinesAdd.graphql   Add items to cart
|   |   |   |   `-- CartLinesUpdate.graphql
|   |   |   |-- Network.swift            Apollo client setup and auth interceptor
|   |   |   `-- StorefrontClient.swift   Cart input and buyer identity mapping
|   |   |-- Generated/                   Apollo-generated Swift types
|   |   |   |-- Storefront.graphql.swift  Namespace and schema metadata
|   |   |   |-- Fragments/                Swift fragment types
|   |   |   |-- Operations/
|   |   |   |   |-- Mutations/              CartCreateMutation, CartLinesAddMutation, etc.
|   |   |   |   `-- Queries/               GetProductsQuery, GetCartQuery
|   |   |   `-- Schema/                   Enums, input objects, objects, interfaces, unions
|   |   |-- App/                         App configuration, cart state, and checkout coordination
|   |   |   |-- AppConfiguration.swift    Values loaded from Storefront.xcconfig
|   |   |   |-- CartManager.swift         Cart create, add, update, and fetch operations
|   |   |   |-- CheckoutCoordinator.swift Checkout presentation
|   |   |   `-- CartResettingCheckoutDelegate.swift
|   |   `-- Scenes/                      SwiftUI screens
|-- Scripts/
|   `-- generate_entitlements.sh         Universal Links entitlement generation
`-- Storefront.xcconfig                  Local store configuration, not checked in
```

Do not edit files in `Generated/` by hand. Update `.graphql` files and regenerate Apollo types instead.

### How it works

1. `Network.swift` creates an `ApolloClient` that points at the configured Storefront API endpoint and attaches the Storefront access token.
2. `StorefrontClient.swift` and `CartManager.swift` call Apollo using generated operation types such as `Storefront.CartCreateMutation` and `Storefront.GetCartQuery`.
3. `CheckoutCoordinator.swift` presents `cart.checkoutUrl` with `ShopifyCheckoutKit`, while `CheckoutProtocolClient.swift` handles typed checkout lifecycle events.
4. Apollo decodes responses into generated Swift types, so schema or operation changes surface as compile errors.

## Setup

From `platforms/swift`:

```sh
cp Samples/MobileBuyIntegration/Storefront.xcconfig.example \
  Samples/MobileBuyIntegration/Storefront.xcconfig
```

Edit `Storefront.xcconfig`:

```text
STOREFRONT_DOMAIN = your-store.myshopify.com
STOREFRONT_ACCESS_TOKEN = your-token
API_VERSION = 2026-04
```

Optional values enable Customer Account API and buyer identity demo flows:

```text
CUSTOMER_ACCOUNT_API_CLIENT_ID = your-client-id
CUSTOMER_ACCOUNT_API_SHOP_ID = your-shop-id
EMAIL = test.buyer@example.com
PHONE = +16135550123
```

Open the project in Xcode, let Swift Package Manager resolve dependencies, then build and run.

## Updating the Storefront API version

1. Update `API_VERSION` in `Storefront.xcconfig`.
2. Download the schema with Rover. This introspects your store's Storefront API and writes `schema.<version>.graphqls` into the sample app directory.

   ```sh
   rover graph introspect \
     "https://$STOREFRONT_DOMAIN/api/$API_VERSION/graphql" \
     --header="X-Shopify-Storefront-Access-Token: $STOREFRONT_ACCESS_TOKEN" \
     --output "schema.$API_VERSION.graphqls"
   ```

3. Update `.graphql` operations if the schema changed. For example, add a product field to `MobileBuyIntegration/Sources/Api/Queries/GetProducts.graphql` before regenerating types:

   ```graphql
   query GetProducts(...) {
     products(first: $first) {
       nodes {
         id
         title
         myNewField
       }
     }
   }
   ```

4. Regenerate Swift types with the Apollo iOS CLI and this sample's `apollo-codegen-config.json`. This reads the schema and `.graphql` files, then regenerates Swift code in `MobileBuyIntegration/Sources/Generated/`.

   ```sh
   ./apollo-ios-cli generate --path apollo-codegen-config.json
   ```

5. Build in Xcode and fix any compile errors from schema changes.

## Dev commands reference

All commands are run from the **repo root** (`checkout-kit/`):

| Command | Description |
|---------|-------------|
| `dev apollo download_schema swift mobile-buy` | Download the Storefront API schema for this sample app |
| `dev apollo codegen swift mobile-buy` | Regenerate Swift types from `.graphql` files |
| `dev apollo codegen swift all` | Regenerate for all sample apps |
| `dev swift lint` | Run SwiftLint + SwiftFormat checks |
| `dev swift format` | Auto-format and apply safe lint autocorrections |
| `dev swift build samples` | Build all sample apps |

## Key files

| File | Purpose |
| --- | --- |
| `Storefront.xcconfig` | Store credentials, API version, Customer Account API values, and demo buyer identity. |
| `schema.<version>.graphqls` | Storefront API schema downloaded with the Apollo iOS CLI. |
| `apollo-codegen-config.json` | Apollo code generation configuration. |
| `MobileBuyIntegration/Sources/Api/Network.swift` | Apollo client setup and authentication interceptor. |
| `MobileBuyIntegration/Sources/Api/StorefrontClient.swift` | Cart input creation and buyer identity mapping. |
| `MobileBuyIntegration/Sources/App/CartManager.swift` | Cart state and Storefront API mutations. |
| `MobileBuyIntegration/Sources/App/CheckoutCoordinator.swift` | Checkout presentation. |
| `MobileBuyIntegration/Sources/CheckoutProtocolClient.swift` | Typed checkout lifecycle handlers. |
| `Scripts/generate_entitlements.sh` | Generates Associated Domains entitlements for checkout and offsite-payment return links. |
