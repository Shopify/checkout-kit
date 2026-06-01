# CheckoutKitAndroidDemo Sample App

This sample demonstrates how to integrate Checkout Kit with the Shopify Storefront API using Apollo Kotlin.

## What it covers

- Product and collection browsing from the Storefront API
- Cart create, add, update, remove, and fetch operations
- `cart.checkoutUrl` presentation with `ShopifyCheckoutKit`
- Typed checkout lifecycle events through `CheckoutProtocol.Client`
- Checkout fail/cancel callbacks through the presentation builder
- File chooser, geolocation, and web permission host callbacks
- Buyer identity demo data for checkout prefill
- Customer Account API sign-in and customer access token cart identity

## Checkout flow

The sample's cart flow demonstrates the Kotlin-first `ShopifyCheckoutKit.present(checkoutUrl, activity) { ... }` API. It connects a typed `CheckoutProtocol.Client` to observe checkout state changes, including completion, and uses the presentation builder for fail/cancel plus the sample's file chooser, geolocation, and web permission host callbacks.

## Architecture

The app uses Apollo Kotlin for Storefront API communication. GraphQL operations are defined as `.graphql` files, and Apollo Kotlin's code generation tool produces type-safe Kotlin data classes from them.

```text
CheckoutKitAndroidDemo/
|-- app/
|   |-- src/main/graphql/                    Source of truth - edit these files
|   |   |-- schema.graphqls                  Storefront API schema, downloaded
|   |   |-- CartFragment.graphql             Reusable cart fields
|   |   |-- CartCreate.graphql               Create a new cart
|   |   |-- CartLinesAdd.graphql             Add items to cart
|   |   |-- CartLinesUpdate.graphql          Update item quantities
|   |   |-- CartLinesRemove.graphql          Remove items from cart
|   |   |-- FetchProducts.graphql            Product listing query
|   |   |-- FetchProduct.graphql             Single product query
|   |   |-- FetchCollections.graphql         Collection listing query
|   |   |-- FetchCollection.graphql          Single collection query
|   |   |-- ProductFragment.graphql          Reusable product fields
|   |   `-- ProductVariantFragment.graphql   Reusable product variant fields
|   |-- build/generated/source/apollo/       Apollo-generated Kotlin types
|   |   `-- storefront/.../graphql/
|   |       |-- CartCreateMutation.kt
|   |       |-- FetchProductsQuery.kt
|   |       |-- fragment/CartFragment.kt
|   |       |-- type/CartInput.kt
|   |       `-- type/CartLineInput.kt
|   `-- src/main/java/.../
|       |-- common/client/StorefrontApiClient.kt  Apollo client wrapper and Storefront operations
|       |-- cart/data/CartRepository.kt       Cart state, buyer identity, and cart mutations
|       |-- products/product/data/            Product detail repository
|       |-- products/collection/data/         Collection repository
|       |-- settings/authentication/          Customer Account API sign-in flow
|       |-- cart/CartViewModel.kt             Checkout presentation and protocol handlers
|       `-- MainActivity.kt                   File chooser and geolocation permission callbacks
`-- .env                                      Local store configuration, not checked in
```

Do not edit files in `app/build/generated/source/apollo/` by hand. Update `.graphql` files and regenerate Apollo types instead.

### How it works

1. `StorefrontApiClient.kt` wraps an `ApolloClient`, points it at the configured Storefront API endpoint, and executes generated query and mutation types.
2. Repository classes such as `CartRepository`, `ProductRepository`, and `ProductCollectionRepository` map generated Storefront API responses into local UI state.
3. `CartViewModel.kt` presents checkout with `ShopifyCheckoutKit.present`, connects `CheckoutProtocol.Client`, and forwards browser/system callbacks to `MainActivity`.
4. Apollo decodes responses into generated Kotlin types, so schema or operation changes surface as compile errors.

## Setup

1. From the repo root or this platform directory, create or sync the shared
   sample configuration:

   ```bash
   dev up
   ```

   If you are not using `dev`, copy the repo-root `.env.example` to `.env`,
   fill in local values, then run:

   ```bash
   scripts/setup_storefront_env
   ```

Optional values enable Customer Account API and buyer identity demo flows:

```text
CUSTOMER_ACCOUNT_API_CLIENT_ID=your-client-id
CUSTOMER_ACCOUNT_API_SHOP_ID=your-shop-id
CUSTOMER_ACCOUNT_API_VERSION=2026-04
EMAIL=test.buyer@example.com
PHONE=+16135550123
```

The setup script generates this sample's local `.env`.

Open the project in Android Studio, sync Gradle, then build and run.

## Updating the Storefront API version

1. Update `API_VERSION` in the repo-root `.env`.
2. Sync the generated platform config:

   ```sh
   dev up
   ```

3. Download the schema. This introspects your store's Storefront API and writes `schema.graphqls` into `app/src/main/graphql/`.

   ```sh
   dev apollo download_schema android
   ```

4. Update GraphQL operations in `app/src/main/graphql/` if the schema changed. For example, add a product field to `FetchProducts.graphql` before regenerating types:

   ```graphql
   query FetchProducts(...) {
     products(first: $numProducts) {
       nodes {
         id
         title
         myNewField
       }
     }
   }
   ```

5. Regenerate Kotlin types with Apollo Kotlin. This reads the schema and `.graphql` files, then regenerates Kotlin code in `app/build/generated/source/apollo/`.

   ```sh
   dev apollo codegen android
   ```

6. Build and fix any compile errors from schema changes:

   ```sh
   ./gradlew :app:assembleDebug
   ```

## Key files

| File | Purpose |
| --- | --- |
| `.env` | Generated sample config from the repo-root `.env` (not checked into git). |
| `app/build.gradle` | Apollo plugin configuration and `BuildConfig` values from `.env`. |
| `app/src/main/graphql/schema.graphqls` | Storefront API schema. |
| `common/client/StorefrontApiClient.kt` | Apollo client setup and Storefront API auth header. |
| `cart/data/CartRepository.kt` | Cart state and Storefront API mutations. |
| `products/product/data/ProductRepository.kt` | Product detail Storefront API calls. |
| `products/collection/data/ProductCollectionRepository.kt` | Collection Storefront API calls. |
| `settings/authentication/data/CustomerRepository.kt` | Customer Account API token exchange and customer lookup. |
| `common/navigation/CheckoutKitNavHost.kt` | App navigation. |
| `cart/CartViewModel.kt` | Checkout presentation, fail/cancel callbacks, and protocol lifecycle handlers. |
| `MainActivity.kt` | File chooser and geolocation permission callbacks. |
| `settings/authentication/` | Customer Account API sign-in screens and WebView flow. |
