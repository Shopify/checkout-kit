package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.CheckoutDiscounts
import com.shopify.ucp.embedded.checkout.CheckoutFulfillment
import com.shopify.ucp.embedded.checkout.CheckoutStatus
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
                actions = emptyMap(),
                attribution = emptyMap(),
                discounts = CheckoutDiscounts(applied = emptyList(), codes = emptyList()),
                fulfillment = CheckoutFulfillment(availableMethods = emptyList(), methods = emptyList()),
                messages = emptyList(),
                payment = Payment(instruments = emptyList()),
                policies = emptyList(),
                signals = JsonObject(emptyMap()),
            ),
        )

        assertThat(absent.messages).isNull()
        assertThat(empty.messages).isEmpty()
        assertThat(empty).isNotEqualTo(absent)
        assertThat(json.encodeToJsonElement(absent).jsonObject).doesNotContainKeys(
            "actions",
            "attribution",
            "discounts",
            "fulfillment",
            "messages",
            "payment",
            "policies",
            "signals",
        )
        val encoded = json.encodeToJsonElement(empty).jsonObject
        assertThat(encoded["actions"]).isEqualTo(JsonObject(emptyMap()))
        assertThat(encoded["policies"]).isEqualTo(JsonArray(emptyList()))
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
            "actions", "attribution", "buyer", "context", "continue_url", "discounts", "expires_at", "fulfillment",
            "messages", "order", "payment", "policies", "signals",
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
            "actions" to JsonObject(emptyMap()),
            "policies" to JsonArray(emptyList()),
            "id" to JsonPrimitive("extension-checkout"),
            "buyer" to JsonObject(mapOf("email" to JsonPrimitive("synthetic@example.com"))),
            "line_items" to JsonObject(emptyMap()),
            "ucp" to JsonObject(mapOf("version" to JsonPrimitive("future-version"))),
            "com.example.empty" to JsonNull,
        )

        val projected = Checkout.fromProtocol(protocolCheckout.copy(additionalProperties = extensions))
        val constructed = projected.toBuilder().additionalProperties(extensions).build()
        val encoded = json.encodeToJsonElement(constructed).jsonObject

        assertThat(projected.additionalProperties).containsOnlyKeys("com.example.empty")
        assertThat(constructed).isEqualTo(projected)
        assertThat(encoded["id"]).isEqualTo(JsonPrimitive(protocolCheckout.id))
        assertThat(encoded["line_items"]).isEqualTo(JsonArray(emptyList()))
        assertThat(encoded["com.example.empty"]).isEqualTo(JsonNull)
        assertThat(encoded).doesNotContainKeys("actions", "policies", "buyer", "ucp")
        assertThat(json.decodeFromJsonElement<Checkout>(encoded)).isEqualTo(projected)
    }

    @Test
    fun `snapshot equality includes nested values and extensions but excludes protocol metadata`() {
        val protocolCheckout = json.decodeFromString<ProtocolCheckout>(fullCheckout)
        val checkout = Checkout.fromProtocol(protocolCheckout)
        val newProtocolVersion = protocolCheckout.copy(ucp = protocolCheckout.ucp.copy(version = "different-version"))
        val newLineItem = protocolCheckout.lineItems.first().copy(quantity = 3)
        val changedItems = protocolCheckout.copy(lineItems = listOf(newLineItem))
        val changedExtension = protocolCheckout.copy(additionalProperties = mapOf("com.example.extension" to JsonNull))

        assertThat(Checkout.fromProtocol(newProtocolVersion)).isEqualTo(checkout)
        assertThat(Checkout.fromProtocol(changedItems)).isNotEqualTo(checkout)
        assertThat(Checkout.fromProtocol(changedExtension)).isNotEqualTo(checkout)
    }

    @Test
    fun `builder creates a fixture with only required values`() {
        val checkout = Checkout.Builder()
            .id("checkout-example")
            .currency("USD")
            .lineItems(emptyList())
            .links(emptyList())
            .status(CheckoutStatus.Incomplete)
            .totals(emptyList())
            .build()

        val expected = json.decodeFromString<Checkout>(minimalCheckout)
        assertThat(checkout).isEqualTo(expected)
        assertThat(checkout.hashCode()).isEqualTo(expected.hashCode())
        assertThat(checkout.additionalProperties).isEmpty()
        assertThat(json.encodeToJsonElement(checkout)).isEqualTo(json.encodeToJsonElement(expected))
    }

    @Test
    fun `builder reports each missing required value`() {
        val setters: Map<String, (Checkout.Builder) -> Unit> = linkedMapOf(
            "id" to { it.id("checkout-example") },
            "currency" to { it.currency("USD") },
            "lineItems" to { it.lineItems(emptyList()) },
            "links" to { it.links(emptyList()) },
            "status" to { it.status(CheckoutStatus.Incomplete) },
            "totals" to { it.totals(emptyList()) },
        )

        setters.keys.forEach { missingField ->
            val builder = Checkout.Builder()
            setters.filterKeys { it != missingField }.values.forEach { setField -> setField(builder) }

            assertThatThrownBy { builder.build() }
                .describedAs("Missing %s", missingField)
                .isInstanceOf(IllegalStateException::class.java)
                .hasMessage("Missing required checkout field: $missingField")
        }
    }

    @Test
    fun `builder variants preserve every field and leave earlier snapshots unchanged`() {
        val original = json.decodeFromString<Checkout>(fullCheckout)
        val builder = original.toBuilder()
        val rebuilt = builder.build()

        assertThat(rebuilt).isNotSameAs(original).isEqualTo(original)
        assertThat(rebuilt.hashCode()).isEqualTo(original.hashCode())
        assertThat(json.encodeToJsonElement(rebuilt)).isEqualTo(json.encodeToJsonElement(original))

        val changed = builder.id("checkout-variant").messages(null).lineItems(emptyList()).build()
        val changedAgain = builder.id("checkout-another-variant").build()

        assertThat(changed.id).isEqualTo("checkout-variant")
        assertThat(changed.messages).isNull()
        assertThat(changed.lineItems).isEmpty()
        assertThat(changedAgain.id).isEqualTo("checkout-another-variant")
        assertThat(original.id).isEqualTo("checkout-example")
        assertThat(original.messages).isNotEmpty()
        assertThat(original.lineItems).isNotEmpty()
        assertThat(rebuilt).isEqualTo(original)
    }

    @Test
    fun `snapshot equality accounts for every builder field`() {
        val checkout = json.decodeFromString<Checkout>(fullCheckout)
        val changes: Map<String, (Checkout.Builder) -> Unit> = linkedMapOf(
            "actions" to { it.actions(null) },
            "attribution" to { it.attribution(null) },
            "buyer" to { it.buyer(null) },
            "context" to { it.context(null) },
            "continueURL" to { it.continueURL(null) },
            "currency" to { it.currency("EUR") },
            "discounts" to { it.discounts(null) },
            "expiresAt" to { it.expiresAt(null) },
            "fulfillment" to { it.fulfillment(null) },
            "id" to { it.id("checkout-variant") },
            "lineItems" to { it.lineItems(emptyList()) },
            "links" to { it.links(emptyList()) },
            "messages" to { it.messages(null) },
            "order" to { it.order(null) },
            "payment" to { it.payment(null) },
            "policies" to { it.policies(null) },
            "signals" to { it.signals(null) },
            "status" to { it.status(CheckoutStatus.Incomplete) },
            "totals" to { it.totals(emptyList()) },
            "additionalProperties" to { it.additionalProperties(emptyMap()) },
        )

        changes.forEach { (field, change) ->
            val builder = checkout.toBuilder()
            change(builder)
            assertThat(builder.build()).describedAs("Changed %s", field).isNotEqualTo(checkout)
        }
        assertThat(checkout).isEqualTo(checkout).isNotEqualTo(null).isNotEqualTo("checkout-example")
        assertThat(setOf(checkout, checkout.toBuilder().build())).hasSize(1)
    }

    private val minimalCheckout = """
        {
          "id": "checkout-example",
          "currency": "USD",
          "line_items": [],
          "links": [],
          "status": "incomplete",
          "totals": [],
          "ucp": {"payment_handlers": {}, "version": "${CheckoutProtocol.SPEC_VERSION}"}
        }
    """.trimIndent()

    private val fullCheckout = """
        {
          "actions": {"com.example.review": [{"id": "action-1", "config": {"required": true, "value": null}}]},
          "policies": [{"type": "com.example.return", "description": {"plain": "Return within 30 days"}}],
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
          "ucp": {"payment_handlers": {}, "version": "${CheckoutProtocol.SPEC_VERSION}"},
          "com.example.extension": {"array": [1, false, null], "large_number": 9223372036854775806, "empty": {}}
        }
    """.trimIndent()
}
