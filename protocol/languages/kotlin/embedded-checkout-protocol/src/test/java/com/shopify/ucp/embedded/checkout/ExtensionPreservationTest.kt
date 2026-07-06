package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ExtensionPreservationTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `preserves unknown extension keys on Signals`() {
        val wire = """{"dev.ucp.buyer_ip":"203.0.113.7","com.example.device_id":"abc-123"}"""

        val signals = json.decodeFromString(Signals.serializer(), wire)
        val reEncoded = json.parseToJsonElement(json.encodeToString(Signals.serializer(), signals)).jsonObject

        assertThat(reEncoded["dev.ucp.buyer_ip"]?.jsonPrimitive?.content).isEqualTo("203.0.113.7")
        assertThat(reEncoded["com.example.device_id"]?.jsonPrimitive?.content).isEqualTo("abc-123")
    }

    @Test
    fun `preserves unknown extension keys on Checkout`() {
        val wire = """
            {
              "id": "checkout-123",
              "currency": "USD",
              "line_items": [],
              "links": [],
              "status": "incomplete",
              "totals": [],
              "ucp": {"payment_handlers": {}, "version": "2026-04-08"},
              "com.example.foo": "bar"
            }
        """.trimIndent()

        val checkout = json.decodeFromString(Checkout.serializer(), wire)
        val reEncoded = json.parseToJsonElement(json.encodeToString(Checkout.serializer(), checkout)).jsonObject

        assertThat(reEncoded["com.example.foo"]?.jsonPrimitive?.content).isEqualTo("bar")
    }
}
