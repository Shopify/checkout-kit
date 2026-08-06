# EmbeddedCheckoutProtocol - Kotlin

`com.shopify:embedded-checkout-protocol` is the Kotlin client for UCP-backed checkout messages emitted by Shopify checkout. Checkout Kit uses it to decode lifecycle notifications such as checkout start, completion, totals changes, line item changes, checkout messages, and checkout errors.

See the [UCP shopping embedded protocol schema](../../../services/shopping/embedded.openrpc.json) for method and payload definitions.

Most Android apps consume this product through the [Checkout Kit Android package](../../../../platforms/android/README.md), which provides a curated protocol API and manages the WebView transport.

## Requirements

- Kotlin 2.0+
- JVM 11+

## Install

Add the protocol artifact from Maven Central:

```kotlin
dependencies {
    implementation("com.shopify:embedded-checkout-protocol:2026.04.08.1-alpha.2")
}
```

For local protocol development, use the standalone Gradle project in `protocol/languages/kotlin`.

## Usage

Register typed handlers, then pass incoming JSON-RPC messages to the client. Request handlers return an encoded response that the host transport must send back to checkout.

```kotlin
import com.shopify.ucp.embedded.checkout.Client
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol

val client = Client()
    .on(EmbeddedCheckoutProtocol.start) { params ->
        println("Checkout started: ${params.checkout.id}")
    }
    .on(EmbeddedCheckoutProtocol.complete) { params ->
        println("Checkout completed: ${params.checkout.id}")
    }
    .on(EmbeddedCheckoutProtocol.totalsChange) { params ->
        println("Checkout totals changed: ${params.checkout.totals}")
    }

val response = client.process(incomingMessage)
response?.let(transport::send)
```

Handlers run synchronously on the calling thread. The client does not provide a WebView or another transport; host SDKs are responsible for receiving messages and returning request responses.

## Connect to Checkout Kit

Android apps using Checkout Kit should use its curated `com.shopify.checkoutkit.CheckoutProtocol` API instead of constructing the low-level protocol client directly:

```kotlin
import com.shopify.checkoutkit.CheckoutProtocol
import com.shopify.checkoutkit.ShopifyCheckoutKit

val protocolClient = CheckoutProtocol.Client()
    .on(CheckoutProtocol.start) { checkout ->
        println("Checkout started: ${checkout.id}")
    }
    .on(CheckoutProtocol.complete) { checkout ->
        println("Checkout completed: ${checkout.id}")
    }

ShopifyCheckoutKit.present(checkoutUrl, activity) {
    connect(protocolClient)
}
```

See the Android README's [checkout lifecycle](../../../../platforms/android/README.md#checkout-lifecycle) section for the supported Checkout Kit descriptors and presentation callbacks.

## Protocol notifications

Raw notification descriptors include:

- `EmbeddedCheckoutProtocol.start`
- `EmbeddedCheckoutProtocol.complete`
- `EmbeddedCheckoutProtocol.error`
- `EmbeddedCheckoutProtocol.lineItemsChange`
- `EmbeddedCheckoutProtocol.messagesChange`
- `EmbeddedCheckoutProtocol.buyerChange`
- `EmbeddedCheckoutProtocol.totalsChange`
- `EmbeddedCheckoutProtocol.paymentChange`
- `EmbeddedCheckoutProtocol.fulfillmentChange`

Checkout Kit intentionally exposes a curated subset of these descriptors to app developers.

## Protocol delegations

Raw request descriptors include:

- `EmbeddedCheckoutProtocol.ready`
- `EmbeddedCheckoutProtocol.auth`
- `EmbeddedCheckoutProtocol.paymentInstrumentsChange`
- `EmbeddedCheckoutProtocol.paymentCredential`
- `EmbeddedCheckoutProtocol.windowOpen`
- `EmbeddedCheckoutProtocol.fulfillmentAddressChange`

Register a request handler only when the host supports the corresponding behavior. Checkout Kit supplies default behavior for its supported delegations.
