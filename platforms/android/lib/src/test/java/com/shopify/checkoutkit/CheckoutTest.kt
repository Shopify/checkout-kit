package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.CheckoutDiscounts
import com.shopify.ucp.embedded.checkout.CheckoutFulfillment
import com.shopify.ucp.embedded.checkout.Payment
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.jsonObject
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import com.shopify.ucp.embedded.checkout.Checkout as ProtocolCheckout

class CheckoutTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `protocol projection preserves every domain field and nested extension`() {
        val wire = json.parseToJsonElement(fullCheckout).jsonObject
        val protocolCheckout = json.decodeFromJsonElement<ProtocolCheckout>(wire)

        val checkout = Checkout.fromProtocol(protocolCheckout)
        val encoded = json.encodeToJsonElement(checkout).jsonObject

        assertThat(encoded).isEqualTo(JsonObject(wire - "ucp"))
        assertThat(encoded).doesNotContainKeys("ucp", "additionalProperties")
        assertThat(encoded["line_items"]).isInstanceOf(JsonArray::class.java)
        assertThat(checkout.lineItems).containsExactlyElementsOf(protocolCheckout.lineItems)
        assertThat(checkout.additionalProperties["com.example.extension"]).isEqualTo(wire["com.example.extension"])
    }

    @Test
    fun `snapshot serialization round trips without protocol metadata`() {
        val checkout = Checkout.fromProtocol(json.decodeFromString<ProtocolCheckout>(fullCheckout))

        val encoded = json.encodeToString(checkout)
        val decoded = json.decodeFromString<Checkout>(encoded)

        assertThat(decoded).isEqualTo(checkout)
        assertThat(json.decodeFromString<Checkout>(fullCheckout)).isEqualTo(checkout)
    }

    @Test
    fun `empty optional collections remain distinct from absent values`() {
        val protocolCheckout = json.decodeFromString<ProtocolCheckout>(minimalCheckout)
        val absent = Checkout.fromProtocol(protocolCheckout)
        val empty = Checkout.fromProtocol(
            protocolCheckout.copy(
                attribution = emptyMap(),
                discounts = CheckoutDiscounts(applied = emptyList(), codes = emptyList()),
                fulfillment = CheckoutFulfillment(availableMethods = emptyList(), methods = emptyList()),
                messages = emptyList(),
                payment = Payment(instruments = emptyList()),
                signals = JsonObject(emptyMap()),
            ),
        )

        assertThat(absent.messages).isNull()
        assertThat(empty.messages).isEmpty()
        assertThat(empty).isNotEqualTo(absent)
        assertThat(json.encodeToJsonElement(absent).jsonObject).doesNotContainKeys(
            "attribution",
            "discounts",
            "fulfillment",
            "messages",
            "payment",
            "signals",
        )
        val encoded = json.encodeToJsonElement(empty).jsonObject
        assertThat(encoded["attribution"]).isEqualTo(JsonObject(emptyMap()))
        assertThat(encoded["signals"]).isEqualTo(JsonObject(emptyMap()))
        assertThat(encoded["messages"]).isEqualTo(JsonArray(emptyList()))
        assertThat(encoded["discounts"]?.jsonObject?.get("applied")).isEqualTo(JsonArray(emptyList()))
        assertThat(encoded["fulfillment"]?.jsonObject?.get("methods")).isEqualTo(JsonArray(emptyList()))
        assertThat(encoded["payment"]?.jsonObject?.get("instruments")).isEqualTo(JsonArray(emptyList()))
        assertThat(json.decodeFromJsonElement<Checkout>(encoded)).isEqualTo(empty)
    }

    @Test
    fun `optional checkout nulls decode without becoming default values`() {
        val fields = json.parseToJsonElement(minimalCheckout).jsonObject
        val nullFields = listOf(
            "attribution", "buyer", "context", "continue_url", "discounts", "expires_at", "fulfillment",
            "messages", "order", "payment", "signals",
        ).associateWith { JsonNull }

        val checkout = json.decodeFromJsonElement<Checkout>(JsonObject(fields + nullFields))

        assertThat(checkout).isEqualTo(json.decodeFromJsonElement<Checkout>(fields))
        assertThat(json.encodeToJsonElement(checkout).jsonObject.keys).doesNotContainAnyElementsOf(nullFields.keys)
    }

    @Test
    fun `required checkout fields cannot be absent or null`() {
        val fields = json.parseToJsonElement(minimalCheckout).jsonObject

        listOf("currency", "id", "line_items", "links", "status", "totals").forEach { key ->
            assertThatThrownBy {
                json.decodeFromJsonElement<Checkout>(JsonObject(fields - key))
            }.describedAs("Missing %s", key).isInstanceOf(SerializationException::class.java)

            assertThatThrownBy {
                json.decodeFromJsonElement<Checkout>(JsonObject(fields + (key to JsonNull)))
            }.describedAs("Null %s", key).isInstanceOf(SerializationException::class.java)
        }
    }

    @Test
    fun `unknown checkout statuses are not coerced to known defaults`() {
        val fields = json.parseToJsonElement(minimalCheckout).jsonObject

        assertThatThrownBy {
            json.decodeFromJsonElement<Checkout>(JsonObject(fields + ("status" to JsonPrimitive("future_status"))))
        }.isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `reserved extensions cannot override fields or restore protocol metadata`() {
        val protocolCheckout = json.decodeFromString<ProtocolCheckout>(minimalCheckout)
        val extensions = mapOf(
            "id" to JsonPrimitive("extension-checkout"),
            "buyer" to JsonObject(mapOf("email" to JsonPrimitive("synthetic@example.com"))),
            "line_items" to JsonObject(emptyMap()),
            "ucp" to JsonObject(mapOf("version" to JsonPrimitive("future-version"))),
            "com.example.empty" to JsonNull,
        )

        val projected = Checkout.fromProtocol(protocolCheckout.copy(additionalProperties = extensions))
        val constructed = projected.copy(additionalProperties = extensions)
        val encoded = json.encodeToJsonElement(constructed).jsonObject

        assertThat(projected.additionalProperties).containsOnlyKeys("com.example.empty")
        assertThat(encoded["id"]).isEqualTo(JsonPrimitive(protocolCheckout.id))
        assertThat(encoded["line_items"]).isEqualTo(JsonArray(emptyList()))
        assertThat(encoded["com.example.empty"]).isEqualTo(JsonNull)
        assertThat(encoded).doesNotContainKeys("buyer", "ucp")
        assertThat(json.decodeFromJsonElement<Checkout>(encoded)).isEqualTo(projected)
    }

    @Test
    fun `snapshot equality includes nested values and extensions but excludes protocol metadata`() {
        val protocolCheckout = json.decodeFromString<ProtocolCheckout>(fullCheckout)
        val checkout = Checkout.fromProtocol(protocolCheckout)
        val newProtocolVersion = protocolCheckout.copy(ucp = protocolCheckout.ucp.copy(version = "2027-01-01"))
        val newLineItem = protocolCheckout.lineItems.first().copy(quantity = 3)
        val changedItems = protocolCheckout.copy(lineItems = listOf(newLineItem))
        val changedExtension = protocolCheckout.copy(additionalProperties = mapOf("com.example.extension" to JsonNull))

        assertThat(Checkout.fromProtocol(newProtocolVersion)).isEqualTo(checkout)
        assertThat(Checkout.fromProtocol(changedItems)).isNotEqualTo(checkout)
        assertThat(Checkout.fromProtocol(changedExtension)).isNotEqualTo(checkout)
    }

    private val minimalCheckout = """
        {
          "id": "checkout-example",
          "currency": "USD",
          "line_items": [],
          "links": [],
          "status": "incomplete",
          "totals": [],
          "ucp": {"payment_handlers": {}, "version": "2026-04-08"}
        }
    """.trimIndent()

    private val fullCheckout = """
        {
          "attribution": {"com.example.campaign": "example-campaign"},
          "buyer": {
            "email": "synthetic@example.com",
            "first_name": "Example",
            "last_name": "Buyer",
            "phone_number": "+12025550123",
            "com.example.buyer": {"verified": true, "value": null}
          },
          "context": {"language": "en", "currency": "USD", "com.example.context": [1, false, null]},
          "continue_url": "https://example.com/checkout",
          "currency": "USD",
          "discounts": {
            "codes": ["EXAMPLE"],
            "applied": [{"amount": 200, "title": "Example discount", "code": "EXAMPLE", "method": "across"}]
          },
          "expires_at": "2026-09-14T12:00:00Z",
          "fulfillment": {
            "available_methods": [{"line_item_ids": ["line-example"], "type": "shipping", "com.example.stock": true}],
            "methods": [{
              "id": "fulfillment-example",
              "line_item_ids": ["line-example"],
              "type": "shipping",
              "com.example.fulfillment": {"value": null}
            }]
          },
          "id": "checkout-example",
          "line_items": [{
            "id": "line-example",
            "item": {"id": "item-example", "title": "Example item", "price": 1500, "image_url": "https://example.com/item.png"},
            "parent_id": "parent-example",
            "quantity": 2,
            "totals": [{"amount": 3000, "type": "subtotal", "display_text": "Subtotal"}]
          }],
          "links": [{"title": "Example policy", "type": "com.example.policy", "url": "https://example.com/policy"}],
          "messages": [{
            "code": "example_message",
            "content": "Example message",
            "content_type": "plain",
            "path": "$.line_items[0]",
            "severity": "requires_buyer_review",
            "type": "warning",
            "image_url": "https://example.com/message.png",
            "presentation": "disclosure",
            "url": "https://example.com/message"
          }],
          "order": {"id": "order-example", "label": "Example order", "permalink_url": "https://example.com/order"},
          "payment": {"instruments": [{
            "handler_id": "handler-example",
            "id": "instrument-example",
            "type": "example_instrument",
            "selected": true,
            "display": {"label": "Example payment", "value": null},
            "credential": {"type": "example_credential", "com.example.credential": [false, null]},
            "com.example.instrument": {"custom": true}
          }]},
          "signals": {"com.example.signal": {"flag": false, "value": null}},
          "status": "ready_for_complete",
          "totals": [{
            "amount": 2800,
            "type": "total",
            "display_text": "Total",
            "lines": [{"amount": 2800, "display_text": "Example breakdown"}]
          }],
          "ucp": {"payment_handlers": {}, "version": "2026-04-08"},
          "com.example.extension": {"array": [1, false, null], "large_number": 9223372036854775806, "empty": {}}
        }
    """.trimIndent()
}
