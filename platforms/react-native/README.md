# Shopify Checkout Kit - React Native

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?style=flat)](https://github.com/Shopify/checkout-kit/blob/main/LICENSE)

<img width="3200" height="800" alt="gradients" src="https://github.com/user-attachments/assets/156492b7-5a64-43d2-b574-2e8f29ed8780" />

> [!WARNING]
> **Alpha — early preview.** This software is an early preview and is **not**
> production-ready. Stability is not guaranteed, and breaking changes may
> occur in any release. Published under the `next` dist-tag — see
> [Installation](#1-installation).

**Shopify Checkout Kit** is a Native Module that enables React Native apps
to provide the world’s highest converting, customizable, one-page checkout
within the app. The presented experience is a fully-featured checkout that
preserves all of the store customizations: Checkout UI extensions, Functions,
branding, and more. It also provides platform idiomatic defaults such as support
for light and dark mode, and convenient developer APIs to embed, customize, and
follow the lifecycle of the checkout experience.

Check out our blog to
[learn how and why we built the Shopify Checkout Kit](https://www.shopify.com/partners/blog/mobile-checkout-sdks-for-ios-and-android).

The React Native SDK is part of
[Shopify's Mobile Kit](https://shopify.dev/docs/custom-storefronts/mobile-kit)
which enables developers to delivery best-in-class iOS and Android commerce
experiences.

- [Platform Requirements](#platform-requirements)
- [Version Compatibility](#version-compatibility)
- [Getting Started](#getting-started)
  - [1. Installation](#1-installation)
  - [2. Minimum Android requirements](#2-minimum-android-requirements)
  - [3. Minimum iOS requirements](#3-minimum-ios-requirements)
- [Basic Usage](#basic-usage)
- [Programmatic Usage](#programmatic-usage)
- [Usage with the Shopify Storefront API](#usage-with-the-shopify-storefront-api)
- [Configuration](#configuration)
  - [Colors](#colors)
  - [Localization](#localization)
    - [Checkout Sheet title](#checkout-sheet-title)
      - [iOS - Localization](#ios---localization)
      - [Android - Localization](#android---localization)
    - [Currency](#currency)
    - [Language](#language)
- [Preloading](#preloading)
  - [Important considerations](#important-considerations)
  - [Flash Sales](#flash-sales)
  - [When to preload](#when-to-preload)
  - [Cache invalidation](#cache-invalidation)
- [Checkout lifecycle](#checkout-lifecycle)
  - [SDK callbacks on `present()`](#sdk-callbacks-on-present)
- [Identity \& customer accounts](#identity--customer-accounts)
  - [Cart: buyer bag, identity, and preferences](#cart-buyer-bag-identity-and-preferences)
    - [Multipass](#multipass)
    - [Shop Pay](#shop-pay)
    - [Customer Account API](#customer-account-api)
- [Offsite Payments](#offsite-payments)
  - [Universal Links - iOS](#universal-links---ios)
- [Pickup points / Pickup in store](#pickup-points--pickup-in-store)
  - [Geolocation - iOS](#geolocation---ios)
  - [Geolocation - Android](#geolocation---android)
    - [Opting out of the default behavior](#opting-out-of-the-default-behavior)
- [Contributing](#contributing)
- [License](#license)

## Platform Requirements

- **React Native** - Minimum version `0.77` (v4+) / `0.70` (v3 and earlier)
- **iOS** - Minimum version iOS 15
- **Android** - Minimum Java 11, Android SDK version `24`, and Kotlin `2.0+`

## Version Compatibility

Starting with **v4.0.0**, `@shopify/checkout-kit-react-native` requires the React Native
**New Architecture** (TurboModules + Fabric). Apps on the old architecture must
stay on the `v3.x` line until they migrate.

| Package version | React Native   | Architecture       |
| --------------- | -------------- | ------------------ |
| `4.x`           | `>= 0.77`      | New Architecture   |
| `3.x`           | `>= 0.70`      | Old Architecture   |

See the [React Native upgrade guide](https://reactnative.dev/docs/the-new-architecture/use-the-new-architecture)
for help enabling the New Architecture in your app.

## Getting Started

Shopify Checkout Kit is an open-source NPM package.

Use the following steps to get started with adding it to your React Native
application:

### 1. Installation

Install the Shopify Checkout Kit package dependency:

```sh
pnpm add @shopify/checkout-kit-react-native

# or using yarn
yarn add @shopify/checkout-kit-react-native

# or using npm
npm install @shopify/checkout-kit-react-native
```

### 2. Minimum Android requirements

Check the `minSdkVersion` property in your `android/build.gradle` file is at
least `24`.

The Android package also requires Kotlin `2.0+`. React Native `0.77+` templates
use compatible Kotlin defaults (`2.0.21` for React Native `0.77`–`0.79`, and
`2.1.20` for React Native `0.80+`). If your app defines a Kotlin version, the
package will use `rootProject.ext.kotlinVersion`, `rootProject.ext.kotlin_version`,
or matching Gradle properties before falling back to `2.0.21`.

```diff
// android/build.gradle
buildscript {
    ext {
        buildToolsVersion = "33.0.0"
-       minSdkVersion = 21
+       minSdkVersion = 24
        compileSdkVersion = 33
        targetSdkVersion = 33
    }
  // ...
}
```

### 3. Minimum iOS requirements

Check the `platform :ios` property of your `ios/Podfile` to ensure that the
minimum version number is at least `15`.

```diff
# ios/Podfile
- platform :ios, min_ios_version_supported
+ platform :ios, 15
```

## Basic Usage

Once the SDK has been added as a package dependency and the minimum platform
requirements have been checked, you can begin by importing the library in your
application code:

```tsx
import {ShopifyCheckoutProvider} from '@shopify/checkout-kit-react-native';

function AppWithContext() {
  return (
    <ShopifyCheckoutProvider>
      <App />
    </ShopifyCheckoutProvider>
  );
}
```

Doing so will now allow you to access the Native Module anywhere in your
application using React hooks:

```tsx
import {useShopifyCheckout} from '@shopify/checkout-kit-react-native';

function App() {
  const shopifyCheckout = useShopifyCheckout();

  // Present the checkout
  shopifyCheckout.present(checkoutUrl);
}
```

See [usage with the Storefront API](#usage-with-the-storefront-api) below for details on how
to obtain a checkout URL to pass to the kit.

> [!NOTE]
> The recommended usage of the library is through a
> `ShopifyCheckoutProvider` Context provider, but see
> [Programmatic usage](#programamatic-usage) below for details on how to use the
> library without React context.

## Programmatic Usage

To use the library without React context, import the `ShopifyCheckout`
class from the package and instantiate it. We recommend to instantiating the
class at a relatively high level in your application, and exporting it for use
throughout your app.

```tsx
// shopify.ts
import {ShopifyCheckout} from '@shopify/checkout-kit-react-native';

export const shopifyCheckout = new ShopifyCheckout({
  // optional configuration
});
```

Similar to the context approach, you can consume the instance as you would using
hooks.

```tsx
import {shopifyCheckout} from './shopify.ts';

shopifyCheckout.present(checkoutUrl);
```

## Usage with the Shopify Storefront API

To present a checkout to the buyer, your application must first obtain a
checkout URL. The most common way is to use the
[Storefront GraphQL API](https://shopify.dev/docs/api/storefront), to create a
cart, add line items, and retrieve a
[checkoutUrl](https://shopify.dev/docs/api/storefront/2023-10/objects/Cart#field-cart-checkouturl)
value. Alternatively, a [cart permalink](https://help.shopify.com/en/manual/products/details/cart-permalink) can be provided.

You can use any GraphQL client to accomplish this - but as an example, our
[sample app](./sample) uses Apollo.

Here's an example of how to get started with Apollo:

```tsx
import {ApolloClient, gql, ApolloProvider} from '@apollo/client';
import {API_VERSION, STOREFRONT_DOMAIN, STOREFRONT_ACCESS_TOKEN} from '@env';

// Create a new instance of the ApolloClient
const client = new ApolloClient({
  uri: `https://${STOREFRONT_DOMAIN}/api/${API_VERSION}/graphql.json`,
  headers: {
    'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
  },
});

// Create Cart Mutation
const createCartMutation = gql`
  mutation CreateCart {
    cartCreate {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;

// Add to Cart Mutation
const addToCartMutation = gql`
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;

function YourReactNativeApp() {
  return (
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  );
}
```

The `checkoutUrl` object is a standard web checkout URL that can be opened in
any browser. To present a native checkout sheet in your application, provide the
`checkoutUrl` alongside optional runtime configuration settings to the
`present(checkoutUrl)` function provided by the SDK:

```tsx
function App() {
  const [createCart] = useMutation(createCartMutation)
  const [addToCart] = useMutation(addToCartMutation)

  return (
    // React native app code
  )
}
```

The `checkoutUrl` value is a standard web checkout URL that can be opened in any
browser. To present a native checkout sheet in your application, provide the
`checkoutUrl` to the `present(checkoutUrl)` function provided by the SDK:

```tsx
function App() {
  const shopifyCheckout = useShopifyCheckout()
  const checkoutUrl = useRef<string>(null)
  const [createCart] = useMutation(createCartMutation)
  const [addToCart] = useMutation(addToCartMutation)

  const handleAddToCart = useCallback((merchandiseId) => {
    // Create a cart
    const {data: cartCreateResponse} = await createCart()
    // Add an item to the cart
    const {data: addToCartResponse} = await addToCart({
      variables: {
        cartId: cartCreateResponse.cartCreate.cart.id,
        lines: [{quantity: 1, merchandiseId}]
      }
    })
    // Retrieve checkoutUrl from the Storefront response
    checkoutUrl.current = addToCartResponse.cartLinesAdd.cart.checkoutUrl

    // Preload the checkout in the background for faster presentation
    shopifyCheckout.preload(checkoutUrl.current)
  }, []);

  const handleCheckout = useCallback(() => {
    if (checkoutURL.current) {
      // Present the checkout to the buyer
      shopifyCheckout.present(checkoutURL.current)
    }
  }, [])

  return (
    <Catalog>
      <Product onAddToCart={handleAddToCart} />
      <Button onPress={handleCheckout}>
        <Text>Checkout</Text>
      </Button>
    <Catalog>
  )
}
```

> [!TIP]
> To help optimize and deliver the best experience the SDK also provides
> a [preloading API](#preloading) that can be used to initialize the checkout
> session in the background and ahead of time.

## Configuration

The SDK provides a way to customize the presented checkout experience through a
`configuration` object in the Context Provider or a `setConfig` method on an
instance of the `ShopifyCheckout` class.

| Name          | Required | Default     | Description                                                                                                                                                    |
| ------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colorScheme` |          | `automatic` | Sets the color scheme for the checkout.                                                                                                                        |
| `preloading`  |          | `true`      | Enable/disable [preloading](#preloading).                                                                                                                      |
| `colors`      |          | `{}`        | An object with `ios` and `android` properties to override the colors for iOS and Android platforms individually. See [`colors`](#colors) for more information. |
| `logLevel`    |          | `error`     | Sets the log level for the native SDK. Use `LogLevel.debug` for verbose logging during development, or `LogLevel.error` for production.                        |

Here's an example of how a fully customized configuration object might look:

```tsx
import {
  ColorScheme,
  Configuration,
  LogLevel,
  ShopifyCheckoutProvider,
} from '@shopify/checkout-kit-react-native';

const config: Configuration = {
  colorScheme: ColorScheme.storefront,
  preloading: true,
  logLevel: LogLevel.error,
  colors: {
    ios: {
      backgroundColor: '#f0f0e8',
      tintColor: '#2d2a38',
    },
    android: {
      backgroundColor: '#f0f0e8',
      progressIndicator: '#2d2a38',
      headerBackgroundColor: '#f0f0e8',
      headerTextColor: '#2d2a38',
    },
  },
};

// If using React Context
function AppWithContext() {
  return (
    <ShopifyCheckoutProvider configuration={config}>
      <App />
    </ShopifyCheckoutProvider>
  );
}

// If using ShopifyCheckout directly
const shopifyCheckout = new ShopifyCheckout(config);
```

### Colors

The SDK defaults to the `automatic` color scheme option, will switches between
idiomatic `light` and `dark` themes depending on the users preference. This
behavior can be customized via the `colorScheme` property:

| Name        | Default | Description                                                                                      |
| ----------- | ------- | ------------------------------------------------------------------------------------------------ |
| `automatic` | ✔      | Alternates between an idiomatic light and dark theme - depending on the users device preference. |
| `light`     |         | Force the idomatic light theme.                                                                  |
| `dark`      |         | Force the idomatic dark theme.                                                                   |
| `storefront` |        | Force your storefront web checkout branding.                                                     |

The `colors` configuration property can be used to provide overrides for iOS and
Android applications separately.

Each `setConfig` call replaces the color overrides for the platform. Omit a
color to restore the SDK default for it.

```tsx
const config: Configuration = {
  colorScheme: ColorScheme.light,
  colors: {
    ios: {
      backgroundColor: '#ffffff',
      tintColor: '#000000',
      closeButtonColor: '#333333',
    },
    android: {
      backgroundColor: '#ffffff',
      progressIndicator: '#2d2a38',
      headerBackgroundColor: '#ffffff',
      headerTextColor: '#000000',
      closeButtonColor: '#333333',
    },
  },
};
```

Note that when using the `automatic` option, the `colors.android` interface is
slightly different, as you can specify different overrides for `light` and
`dark` modes:

```tsx
import {
  ColorScheme,
  Configuration,
  ShopifyCheckoutProvider,
} from '@shopify/checkout-kit-react-native';

const config: Configuration = {
  colorScheme: ColorScheme.automatic,
  colors: {
    // Custom light/dark overrides for Android
    android: {
      light: {
        backgroundColor: '#ffffff',
        progressIndicator: '#2d2a38',
        headerBackgroundColor: '#ffffff',
        headerTextColor: '#000000',
        closeButtonColor: '#000000',
      },
      dark: {
        backgroundColor: '#000000',
        progressIndicator: '#0087ff',
        headerBackgroundColor: '#000000',
        headerTextColor: '#ffffff',
        closeButtonColor: '#ffffff',
      },
    },
  },
};

function AppWithContext() {
  return (
    <ShopifyCheckoutProvider configuration={config}>
      <App />
    </ShopifyCheckoutProvider>
  );
}
```

### Localization

#### Checkout Sheet title

##### iOS - Localization

On iOS, you can set a localized value on the `title` attribute of the
configuration.

Alternatively, use a Localizable.xcstrings file in your app by doing the
following:

1. Create a `Localizable.xcstrings` file under "ios/{YourApplicationName}"
2. Add an entry for the key `"shopify_checkout_sheet_title"`

##### Android - Localization

On Android, you can add a string entry for the key `"checkout_web_view_title"`
to the "android/app/src/res/values/strings.xml" file for your application.

```diff
<resources>
    <string name="app_name">Your App Name</string>
+    <string name="checkout_web_view_title">Checkout</string>
</resources>
```

> [!IMPORTANT]
> The `title` configuration attribute will only affect iOS. For Android you **must** use
> `res/values/strings.xml`.

#### Currency

To set an appropriate currency for a given cart, the Storefront API offers an
`@inContext(country)` directive which will ensure the correct currency is
presented.

```tsx
const CREATE_CART_MUTATION = gql`
  mutation CreateCart($input: CartInput, $country: CountryCode = CA)
  @inContext(country: $country) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;
```

See [Storefront Directives](https://shopify.dev/docs/api/storefront#directives)
for more information.

#### Language

Similarly to currency, you can use an `@inContext(language)` directive to set
the language for your checkout.

```tsx
const CREATE_CART_MUTATION = gql`
  mutation CreateCart($input: CartInput, $language: Language = EN)
  @inContext(language: $language) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;
```

See [Storefront Directives](https://shopify.dev/docs/api/storefront#directives)
for more information.

## Preloading

Initializing a checkout session requires communicating with Shopify servers,
thus depending on the network quality and bandwidth available to the buyer can
result in undesirable waiting time for the buyer. To help optimize and deliver
the best experience, the SDK provides a `preloading` "hint" that allows
developers to signal that the checkout session should be initialized in the
background, ahead of time.

Preloading is an advanced feature that can be disabled by setting the
`preloading` configuration value to `false`. It is enabled by default.

Once enabled, preloading a checkout is as simple as calling
`preload(checkoutUrl)` with a valid `checkoutUrl`.

```tsx
// using hooks
const shopifyCheckout = useShopifyCheckout();
shopifyCheckout.preload(checkoutUrl);

// using a class instance
const shopifyCheckout = new ShopifyCheckout();
shopifyCheckout.preload(checkoutUrl);
```

### Important considerations

1. Initiating preload results in background network requests and additional
   CPU/memory utilization for the client, and should be used when there is a
   high likelihood that the buyer will soon request to checkout—e.g. when the
   buyer navigates to the cart overview or a similar app-specific experience.
2. A preloaded checkout session reflects the cart contents at the time when
   `preload` is called. If the cart is updated after `preload` is called, the
   application needs to call `preload` again to reflect the updated checkout
   session.
3. Calling `preload(checkoutUrl)` is a hint, **not a guarantee**: the library
   may debounce or ignore calls to this API depending on various conditions; the
   preload may not complete before `present(checkoutUrl)` is called, in which
   case the buyer may still see a spinner while the checkout session is
   finalized.

### Flash Sales

It is important to note that during Flash Sales or periods of high amounts of traffic, buyers may be entered into a queue system.

**Calls to preload which result in a buyer being enqueued will be rejected.** This means that a buyer will never enter the queue without their knowledge.

### When to preload

Calling `preload()` each time an item is added to a buyer's cart can put significant strain on Shopify systems, which in return can result in rejected requests. Rejected requests will not result in a visual error shown to users, but will degrade the experience since they will need to load checkout from scratch.

Instead, a better approach is to call `preload()` when you have a strong enough signal that the buyer intends to check out. In some cases this might mean a buyer has navigated to a "cart" screen.

### Cache invalidation

Should you wish to manually clear the preload cache, call `invalidate()` on your `ShopifyCheckout` instance or the value returned by `useShopifyCheckout()`.

## Checkout lifecycle

Lifecycle callbacks are passed per-call to `present()`. The bridge holds the
handles for the duration of that one presentation and releases them on
terminal events; nothing needs to be subscribed or torn down explicitly.

### SDK callbacks on `present()`

```tsx
shopify.present(checkoutUrl, {
  onClose: () => {
    // The sheet was dismissed without a terminal error
  },
  onFail: (error: CheckoutException) => {
    // A terminal error occurred — inspect `error.code`, `error.message`, etc.
  },
});
```

| Name                   | Callback                                   | Fires                                                                                                            |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `onClose`              | `() => void`                               | Once, when the buyer dismisses the sheet without a terminal error.                                               |
| `onFail`               | `(error: CheckoutException) => void`       | Once, when the checkout terminates with an error.                                                                |
| `onGeolocationRequest` | `(event: GeolocationRequestEvent) => void` | Android only. Fired each time the webview requests geolocation permissions. See [Opting out of the default behavior](#opting-out-of-the-default-behavior). |

`onClose` and `onFail` are mutually exclusive — exactly one of them fires
per `present(...)` call, after which both handles are released.

## Identity & customer accounts

Buyer-aware checkout experience reduces friction and increases conversion.
Depending on the context of the buyer (guest or signed-in), knowledge of buyer
preferences, or account/identity system, the application can use one of the
following methods to initialize a personalized and contextualized buyer
experience.

### Cart: buyer bag, identity, and preferences

In addition to specifying the line items, the Cart can include buyer identity
(name, email, address, etc.), and delivery and payment preferences: see
[guide](https://shopify.dev/docs/custom-storefronts/building-with-the-storefront-api/cart/manage).
Included information will be used to present pre-filled and pre-selected choices
to the buyer within checkout.

#### Multipass

[Shopify Plus](https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/shopify-plus-plan)
merchants using
[Classic Customer Accounts](https://help.shopify.com/en/manual/customers/customer-accounts/classic-customer-accounts)
can use [Multipass](https://shopify.dev/docs/api/multipass)
([API documentation](https://shopify.dev/docs/api/multipass)) to integrate an
external identity system and initialize a buyer-aware checkout session.

> [!WARNING]
> [Multipass](https://shopify.dev/docs/api/customer-authentication/multipass) is now deprecated, consider using Customer Accounts API for new integrations.

```json
{
  "email": "<Customer's email address>",
  "created_at": "<Current timestamp in ISO8601 encoding>",
  "remote_ip": "<Client IP address>",
  "return_to": "<Checkout URL obtained from Storefront API>"
}
```

1. Follow the [Multipass documentation](https://shopify.dev/docs/api/multipass)
   to create a Multipass URL and set `return_to` to be the obtained
   `checkoutUrl`
2. Provide the Multipass URL to `present(checkoutUrl)`

> [!IMPORTANT]
> The above JSON omits useful customer attributes that should be
> provided where possible and encryption and signing should be done server-side
> to ensure Multipass keys are kept secret.

#### Shop Pay

To initialize accelerated Shop Pay checkout, the cart can set a
[walletPreference](https://shopify.dev/docs/api/storefront/latest/mutations/cartBuyerIdentityUpdate#field-cartbuyeridentityinput-walletpreferences)
to 'shop_pay'. The sign-in state of the buyer is app-local. The buyer will be
prompted to sign in to their Shop account on their first checkout, and their
sign-in state will be remembered for future checkout sessions.

#### Customer Account API

We are working on a library to provide buyer sign-in and authentication powered
by the
[new Customer Account API](https://www.shopify.com/partners/blog/introducing-customer-account-api-for-headless-stores)—stay
tuned.

## Offsite Payments

Certain payment providers finalize transactions by redirecting customers to
external banking apps. To enhance the user experience for your buyers, you can
set up your storefront to support Universal Links on iOS and App links on
Android, allowing customers to be redirected back to your app once the payment
is completed.

### Universal Links - iOS

See the
[Universal Links guide](https://github.com/Shopify/checkout-kit/blob/main/documentation/universal_links_ios.md)
for information on how to get started with adding support for Offsite Payments
in your app.

It is crucial for your app to be configured to handle URL clicks during the
checkout process effectively. By default, the kit includes the following
delegate method to manage these interactions. This code ensures that external
links, such as HTTPS and deep-links, are opened correctly by iOS.

```swift
public func checkoutDidClickLink(url: URL) {
  if UIApplication.shared.canOpenURL(url) {
    UIApplication.shared.open(url)
  }
}
```

## Pickup points / Pickup in store

### Geolocation - iOS

Geolocation permission requests are handled out of the box by iOS, provided you've added the required location usage description to your `Info.plist` file:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your location is required to locate pickup points near you.</string>
```

> [!TIP]
> Consider also adding `NSLocationAlwaysAndWhenInUseUsageDescription` if your app needs background location access for other features.

### Geolocation - Android

Android differs to iOS in that permission requests must be handled in two places:
(1) in your `AndroidManifest.xml` and (2) at runtime.

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

When the webview requests geolocation information, the Checkout Kit native
module surfaces it to JS so the app can respond. By default, the kit handles
the request itself and asks for both coarse and fine access on the buyer's
behalf.

The geolocation request flow follows this sequence:

1. When checkout needs location data (e.g., to show nearby pickup points), it triggers a geolocation request.
2. If you've passed an `onGeolocationRequest` callback to `present()`, that callback is invoked. Request or check Android permissions, then call `event.respond(allow)`.
3. Otherwise, with `features.handleGeolocationRequests: true` (the default), the module automatically handles the Android runtime permission request.
4. The response is passed back to checkout, which then proceeds to show relevant pickup points if permission was granted.

> [!NOTE]
> If the user denies location permissions, the checkout will still function but will not be able to show nearby pickup points. Users can manually enter their location instead.

#### Opting out of the default behavior

> [!NOTE]
> This section is only applicable for Android.

There are two ways to customize Android geolocation handling, depending on
whether you want to override the behavior for one presentation or disable the
fallback globally.

**Per-call override.** Pass an `onGeolocationRequest` callback to
`present()`. When set, the callback fires instead of the default handler
for that one presentation; the consumer is responsible for resolving
permissions and calling `event.respond(allow)`:

```tsx
shopify.present(checkoutUrl, {
  onGeolocationRequest: async (event: GeolocationRequestEvent) => {
    const coarse = 'android.permission.ACCESS_COARSE_LOCATION';
    const fine = 'android.permission.ACCESS_FINE_LOCATION';

    const results = await PermissionsAndroid.requestMultiple([coarse, fine]);
    const granted =
      results[coarse] === 'granted' || results[fine] === 'granted';

    event.respond(granted);
  },
});
```

`event.respond(...)` resolves checkout's pending WebView geolocation request.
It does not request OS permissions by itself.

**Process-wide default-handler opt-out.** Set
`features.handleGeolocationRequests` to `false` when you instantiate the
`ShopifyCheckout` class to disable the default handler entirely. When this is
set, pass `onGeolocationRequest` to any `present()` call that may need
geolocation; otherwise the checkout geolocation request will not be resolved.

```tsx
const shopifyCheckout = new ShopifyCheckout(config, {handleGeolocationRequests: false});
```

If you're using the context provider, pass the same `features` object as a prop:

```tsx
<ShopifyCheckoutProvider configuration={config} features={{handleGeolocationRequests: false}}>
  {children}
</ShopifyCheckoutProvider>
```

Custom permission handling lets you:

- Customize the permission request UI/UX
- Coordinate location permissions with other app features
- Implement custom fallback behavior when permissions are denied

---

## Accelerated Checkouts

Accelerated checkout buttons surface Apple Pay and Shop Pay options earlier in the buyer journey so more orders complete without leaving your app.

### Prerequisites

- iOS 16 or later
- The `write_cart_wallet_payments` access scope ([request access](https://www.appsheet.com/start/1ff317b6-2da1-4f39-b041-c01cfada6098))
- Apple Pay payment processing certificates ([setup guide](https://shopify.dev/docs/storefronts/mobile/create-apple-payment-processing-certificates))
- A device configured for Apple Pay ([Apple setup instructions](https://developer.apple.com/documentation/passkit/setting-up-apple-pay))

### Configure the integration

Pass an `acceleratedCheckouts` configuration when setting up the provider or `ShopifyCheckout` instance. This connects the accelerated checkout buttons to your storefront.

```tsx
import {ShopifyCheckoutProvider} from '@shopify/checkout-kit-react-native';

const config = {
  acceleratedCheckouts: {
    storefrontDomain: 'your-shop.myshopify.com',
    storefrontAccessToken: 'your-storefront-access-token',
    // Identify the buyer using exactly one of the supported modes:
    customer: {
      // For buyers authenticated with Shopify Customer Accounts
      accessToken: 'customer-access-token',
    },
    // OR, for buyers identified by contact fields:
    // customer: {
    //   email: 'customer@example.com',
    //   phoneNumber: '0123456789',
    // },
    wallets: {
      applePay: {
        merchantIdentifier: 'merchant.com.yourcompany',
        contactFields: ['email', 'phone'],
        // Optionally restrict shipping countries (ISO 3166-1 alpha-2)
        // supportedShippingCountries: ['US', 'CA'],
      },
    },
  },
};

function App() {
  return (
    <ShopifyCheckoutProvider configuration={config}>
      <YourApp />
    </ShopifyCheckoutProvider>
  );
}
```

`customer` accepts either `{accessToken}` for authenticated Customer Account buyers, or `{email, phoneNumber}` for contact-field identification. These modes are mutually exclusive.

### Render accelerated checkout buttons

Use `AcceleratedCheckoutButtons` to attach accelerated checkout calls-to-action to product or cart surfaces once you have a valid cart ID or product variant ID from the Storefront API.

```tsx
import {
  AcceleratedCheckoutButtons,
  AcceleratedCheckoutWallet,
} from '@shopify/checkout-kit-react-native';

function CartFooter({cartId}: {cartId: string}) {
  return (
    <AcceleratedCheckoutButtons
      cartId={cartId}
      wallets={[AcceleratedCheckoutWallet.shopPay, AcceleratedCheckoutWallet.applePay]}
    />
  );
}
```

You can also render buttons for a single product variant:

```tsx
<AcceleratedCheckoutButtons
  variantId={variantId}
  quantity={1}
  wallets={[AcceleratedCheckoutWallet.applePay]}
/>
```

#### Customize wallet options

Accelerated checkout buttons display every available wallet by default. Use `wallets` to show a subset or adjust the order.

```tsx
// Display only Shop Pay
<AcceleratedCheckoutButtons
  cartId={cartId}
  wallets={[AcceleratedCheckoutWallet.shopPay]}
/>

// Display Shop Pay first, then Apple Pay
<AcceleratedCheckoutButtons
  cartId={cartId}
  wallets={[AcceleratedCheckoutWallet.shopPay, AcceleratedCheckoutWallet.applePay]}
/>
```

#### Modify the Apple Pay button label

Use `applePayLabel` to map to the native `PayWithApplePayButtonLabel` values. The default is `plain`.

```tsx
import {ApplePayLabel} from '@shopify/checkout-kit-react-native';

<AcceleratedCheckoutButtons
  cartId={cartId}
  applePayLabel={ApplePayLabel.buy}
/>
```

#### Customize the Apple Pay button style

Use `applePayStyle` to set the color style of the Apple Pay button. The default is `automatic`, which adapts to the current appearance (light/dark mode).

```tsx
import {ApplePayStyle} from '@shopify/checkout-kit-react-native';

<AcceleratedCheckoutButtons
  cartId={cartId}
  applePayStyle={ApplePayStyle.whiteOutline}
/>
```

Available styles: `automatic`, `black`, `white`, `whiteOutline`.

#### Customize button corners

The `cornerRadius` prop lets you match the buttons to other calls-to-action in your app. Buttons default to an 8pt radius.

```tsx
// Pill-shaped buttons
<AcceleratedCheckoutButtons cartId={cartId} cornerRadius={16} />

// Square buttons
<AcceleratedCheckoutButtons cartId={cartId} cornerRadius={0} />
```

### Handle loading, errors, and lifecycle events

Attach lifecycle handlers to respond when buyers finish, cancel, or encounter an error.

```tsx
<AcceleratedCheckoutButtons
  cartId={cartId}
  onComplete={(event) => {
    // Clear cart after successful checkout
    clearCart();
  }}
  onFail={(error) => {
    console.error('Accelerated checkout failed:', error);
  }}
  onCancel={() => {
    analytics.track('accelerated_checkout_cancelled');
  }}
  onRenderStateChange={(event) => {
    // event.state: 'loading' | 'rendered' | 'error'
    setRenderState(event.state);
  }}
  onClickLink={(url) => {
    Linking.openURL(url);
  }}
/>
```

---

## Contributing

See the [contributing documentation](CONTRIBUTING.md) for details on how to get started.

## License

Shopify's Checkout Kit is provided under an [MIT License](LICENSE).
