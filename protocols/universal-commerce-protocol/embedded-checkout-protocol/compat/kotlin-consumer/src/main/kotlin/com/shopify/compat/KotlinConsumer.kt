package com.shopify.compat

import com.shopify.ucp.embedded.checkout.AddressChangeCheckout
import com.shopify.ucp.embedded.checkout.AddressChangeResult
import com.shopify.ucp.embedded.checkout.Buyer
import com.shopify.ucp.embedded.checkout.Checkout
import com.shopify.ucp.embedded.checkout.CheckoutFulfillmentClass
import com.shopify.ucp.embedded.checkout.CheckoutStatus
import com.shopify.ucp.embedded.checkout.Client
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol
import com.shopify.ucp.embedded.checkout.FulfillmentDestination
import com.shopify.ucp.embedded.checkout.FulfillmentMethod
import com.shopify.ucp.embedded.checkout.InstrumentsChangeResultUcp
import com.shopify.ucp.embedded.checkout.Item
import com.shopify.ucp.embedded.checkout.LineItem
import com.shopify.ucp.embedded.checkout.LineItemTotal
import com.shopify.ucp.embedded.checkout.MessageType
import com.shopify.ucp.embedded.checkout.PostalAddress
import com.shopify.ucp.embedded.checkout.ReadyResult
import com.shopify.ucp.embedded.checkout.Severity
import com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchemaStatus
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

// Uses the protocol package the way apps and hosts do. It must keep compiling, and keep running
// when compiled against an older protocol version, after an additive protocol change.

private val CHECKOUT = """
    {
      "id": "checkout-1",
      "currency": "USD",
      "status": "incomplete",
      "line_items": [
        {
          "id": "line-1",
          "item": {"id": "gid://shopify/ProductVariant/1", "title": "T-shirt", "price": 2500},
          "quantity": 1,
          "note": "Keep this note when copying",
          "totals": [{"type": "subtotal", "amount": 2500}]
        }
      ],
      "links": [],
      "messages": [{"type": "warning", "content": "Low stock", "severity": "recoverable"}],
      "totals": [{"type": "total", "amount": 2500}],
      "ucp": {"payment_handlers": {}, "version": "${EmbeddedCheckoutProtocol.SPEC_VERSION}"}
    }
""".trimIndent()

private val READY_REQUEST = """{"jsonrpc":"2.0","id":1,"method":"ec.ready","params":{"delegate":[]}}"""

fun main() {
    // Inbound: decode and read.
    // Named so it doesn't shadow the `checkout` builder property below: in Kotlin, local
    // variables take precedence over a DSL receiver's members.
    val decoded = Json { ignoreUnknownKeys = true }.decodeFromString(Checkout.serializer(), CHECKOUT)
    val state = when (decoded.status) {
        CheckoutStatus.Completed -> "completed"
        CheckoutStatus.Canceled -> "canceled"
        else -> "open"
    }
    check(state == "open")
    check(decoded.lineItems.single().item.title == "T-shirt")
    val blocking = decoded.messages.orEmpty().any { it.type == MessageType.Error && it.severity == Severity.Unrecoverable }
    check(!blocking)

    // Inbound: build fixtures the way tests and previews do.
    val lineItem = LineItem(
        id = "line-1",
        item = Item(id = "gid://shopify/ProductVariant/1", price = 2500, title = "T-shirt"),
        quantity = 1,
        totals = listOf(LineItemTotal(amount = 2500, type = "subtotal")),
    ) { parentID = "line-0" }
    val buyer = Buyer { email = "buyer@example.com" }
    check(lineItem.item.title == decoded.lineItems.single().item.title && buyer.email == "buyer@example.com")

    // The note is absent from the original schema. These consumers are compiled before it is
    // added, then run unchanged against the regenerated models. Copy through both languages
    // and inspect the wire result without referring to the new getter at compile time.
    val original = decoded.lineItems.single()
    val kotlinCopy = original.toBuilder().apply {
        parentID = "kotlin-bundle"
        quantity = 2
    }.build()
    val javaCopy = JavaConsumer.updateLineItem(original)
    check(original.parentID == null && original.quantity == 1L)
    check(kotlinCopy.parentID == "kotlin-bundle" && javaCopy.parentID == "java-bundle")
    for (copy in listOf(kotlinCopy, javaCopy)) {
        check(copy.quantity == 2L && copy.item == original.item && copy.totals == original.totals)
        val wire = Json.encodeToJsonElement(LineItem.serializer(), copy).jsonObject
        if (java.lang.Boolean.getBoolean("compat.additiveChange")) {
            check(wire["note"]?.jsonPrimitive?.content == "Keep this note when copying") {
                "toBuilder() dropped a field added after the consumer was compiled"
            }
        }
    }

    // Outbound: build replies with the DSL.
    val ucp = InstrumentsChangeResultUcp(status = UCPCheckoutResponseSchemaStatus.Success, version = EmbeddedCheckoutProtocol.SPEC_VERSION)
    val ready = ReadyResult(ucp = ucp) { continueURL = "https://example.com/checkout" }
    val destination = FulfillmentDestination(id = "dest-1") {
        streetAddress = "1 Main St"
        postalCode = "K1A 0B1"
        address = PostalAddress { addressCountry = "CA" }
    }
    val addressChange = AddressChangeResult(ucp = ucp) {
        checkout = AddressChangeCheckout {
            fulfillment = CheckoutFulfillmentClass {
                methods = listOf(
                    FulfillmentMethod(id = "method-1", lineItemIDS = listOf("line-1"), type = "shipping") {
                        destinations = listOf(destination)
                        selectedDestinationID = "dest-1"
                    },
                )
            }
        }
    }
    check(addressChange.checkout?.fulfillment?.methods?.single()?.destinations?.single() == destination)

    // Handshake and runtime.
    val options = EmbeddedCheckoutProtocol.Options {
        delegations = listOf(EmbeddedCheckoutProtocol.Delegation.windowOpen)
        colorScheme = "dark"
    }
    check(EmbeddedCheckoutProtocol.url("https://example.com/checkout", options).contains("ec_color_scheme=dark"))
    val response = Client().on(EmbeddedCheckoutProtocol.ready) { ready }.process(READY_REQUEST)
    check(response.orEmpty().contains("\"success\""))

    println("Kotlin consumer OK; Java consumer: ${JavaConsumer.run()}")
}
