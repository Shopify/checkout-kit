# CheckoutKitAndroidDemo Sample App

This sample demonstrates how to integrate Checkout Kit with the Shopify Storefront API using Apollo Kotlin.

## What it covers

- Product and collection browsing from the Storefront API
- Cart create, add, update, remove, and fetch operations
- `cart.checkoutUrl` presentation with either the Checkout Kit sheet or an app-owned Compose sheet
- Typed checkout lifecycle events through `CheckoutProtocol.Client`
- Checkout fail/dismiss callbacks and configurable sheet presentation
- Default intent and custom Chrome Custom Tabs handling for checkout window-open requests
- File chooser and geolocation host callbacks
- Buyer identity demo data for checkout prefill
- Customer Account API sign-in through Android Auth Tab (with a Custom Tabs fallback), secure token storage, and customer access token cart identity

## Checkout flow

The sample's cart flow can use the Kotlin-first `ShopifyCheckoutKit.present(checkoutUrl, activity) { ... }` API or embed `ShopifyCheckout` in an app-owned Compose sheet. Both modes connect a typed `CheckoutProtocol.Client` to observe checkout state changes, including completion, and configure fail/dismiss, file chooser, and geolocation callbacks. Settings also demonstrate Checkout Kit sheet presets and dismissal behavior, plus the SDK's default window-open handling or a custom Chrome Custom Tabs protocol handler.

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
|       |-- cart/AppOwnedCheckoutSheet.kt     App-owned Compose sheet integration
|       |-- settings/                         Presentation and window-open settings
|       `-- MainActivity.kt                   File chooser and geolocation permission callbacks
`-- .env                                      Local store configuration, not checked in
```

Do not edit files in `app/build/generated/source/apollo/` by hand. Update `.graphql` files and regenerate Apollo types instead.

### How it works

1. `StorefrontApiClient.kt` wraps an `ApolloClient`, points it at the configured Storefront API endpoint, and executes generated query and mutation types.
2. Repository classes such as `CartRepository`, `ProductRepository`, and `ProductCollectionRepository` map generated Storefront API responses into local UI state.
3. `CartViewModel.kt` configures `ShopifyCheckoutKit.present` and the shared protocol client; `AppOwnedCheckoutSheet.kt` demonstrates embedding the same checkout in app-owned Compose UI. Both forward browser/system callbacks to `MainActivity`.
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
CUSTOMER_ACCOUNT_API_REDIRECT_URI=https://example.com/customer-account/callback
EMAIL=test.buyer@example.com
PHONE=+16135550123
```

The setup script generates this sample's local `.env`.

Use a verified HTTPS App Link for `CUSTOMER_ACCOUNT_API_REDIRECT_URI` in a production app. A custom URI scheme also works and Auth Tab protects its callback on supported browsers, but an App Link prevents another installed app from claiming the Custom Tabs fallback redirect. Authentication uses the browser's shared session by default so it participates in browser SSO; logout uses the same browser surface and then always clears the local session.

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
| `cart/CartViewModel.kt` | Checkout Kit sheet presentation, fail/dismiss callbacks, protocol lifecycle handlers, and window-open routing. |
| `cart/AppOwnedCheckoutSheet.kt` | App-owned Compose sheet containing an embedded `ShopifyCheckout`. |
| `MainActivity.kt` | File chooser, geolocation, E2E control-link, and Auth Tab/Custom Tabs result callbacks. |
| `settings/` | Checkout presentation mode, sheet style and dismissal, and window-open handler controls. |
| `settings/authentication/` | Customer Account API browser sign-in, OAuth validation, and encrypted credential storage. |
