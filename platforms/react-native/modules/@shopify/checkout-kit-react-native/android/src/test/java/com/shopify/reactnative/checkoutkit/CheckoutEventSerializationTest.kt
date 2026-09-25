package com.shopify.reactnative.checkoutkit

import android.net.Uri
import com.shopify.checkoutkit.*
import kotlinx.serialization.json.*
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutEventSerializationTest {
    private val checkout = Json.decodeFromString<Checkout>("""
        {"id":"checkout-1","currency":"USD","status":"incomplete",
         "line_items":[],"links":[],"totals":[],
         "expires_at":"2026-09-25T12:00:00.123Z",
         "actions":{"com.example.verify":[{"config":{"custom_key":true}}]},
         "policies":[{"id":"policy-1","type":"return","description":{"plain":"Returns accepted"},"applies_to":["$.line_items[0]"]}],
         "buyer":{"first_name":"Test"},"custom_extension":{"nested_key":true}}
    """.trimIndent())

    @Test
    fun `serializes checkout snapshots without protocol metadata`() {
        val envelope = Json.parseToJsonElement(CheckoutEventSerialization.checkout("start", "request-1", checkout)).jsonObject
        assertThat(envelope["requestId"]?.jsonPrimitive?.content).isEqualTo("request-1")
        val snapshot = envelope["payload"]!!.jsonObject["checkout"]!!.jsonObject
        assertThat(snapshot).doesNotContainKey("ucp")
        assertThat(snapshot).containsKeys("line_items", "custom_extension", "policies", "actions")
        assertThat(snapshot["expires_at"]?.jsonPrimitive?.content).isEqualTo("2026-09-25T12:00:00.123Z")
        assertThat(snapshot["buyer"]?.jsonObject?.get("first_name")?.jsonPrimitive?.content).isEqualTo("Test")
    }

    @Test
    fun `completion retains callbacks until dismissal`() {
        val events = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { events.add(it) })
        listener.configure("request-1", "open") {}
        listener.onCheckoutStarted(CheckoutStartEvent(checkout))
        listener.onCheckoutUpdated(CheckoutUpdateEvent(checkout))
        listener.onCheckoutCompleted(CheckoutCompleteEvent(checkout))
        assertThat(listener.isReleased).isFalse()
        listener.onCheckoutDismissed()
        listener.onCheckoutUpdated(CheckoutUpdateEvent(checkout))
        assertThat(events.map { Json.parseToJsonElement(it).jsonObject["type"]?.jsonPrimitive?.content })
            .containsExactly("start", "update", "complete", "dismiss")
    }

    @Test
    fun `repeated presentation updates the existing listener session`() {
        val events = mutableListOf<String>()
        val listener = CustomCheckoutListener(DispatchCallback { events.add(it) })
        listener.configure("old", "open") {}
        listener.configure("new", "handled") {}
        listener.onCheckoutUpdated(CheckoutUpdateEvent(checkout))
        assertThat(Json.parseToJsonElement(events.single()).jsonObject["requestId"]?.jsonPrimitive?.content).isEqualTo("new")
        assertThat(listener.matchesRequest("old")).isFalse()
    }

    @Test
    fun `link policy returns synchronously and also notifies JS`() {
        val constructor = CheckoutLink::class.java.getDeclaredConstructor(Uri::class.java)
        constructor.isAccessible = true
        val link = constructor.newInstance(Uri.parse("https://example.test/policy"))
        listOf("open" to CheckoutLinkAction.Open, "handled" to CheckoutLinkAction.Handled, "cancel" to CheckoutLinkAction.Cancel).forEach { (action, expected) ->
            val events = mutableListOf<String>()
            val listener = CustomCheckoutListener(DispatchCallback { events.add(it) })
            listener.configure("request-1", action) {}
            assertThat(listener.onCheckoutLinkClicked(link)).isEqualTo(expected)
            val envelope = Json.parseToJsonElement(events.single()).jsonObject
            assertThat(envelope["type"]?.jsonPrimitive?.content).isEqualTo("linkClick")
            assertThat(envelope["payload"]?.jsonObject?.get("url")?.jsonPrimitive?.content).isEqualTo("https://example.test/policy")
        }
    }
}
