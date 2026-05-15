package com.shopify.reactnative.checkoutkit

import android.os.Looper
import android.util.Log
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLog

@RunWith(RobolectricTestRunner::class)
class ProtocolRelayTest {

    @Test
    fun `envelope encodes type and wire-case payload`() {
        val payload = SnakePayload(continueUrl = "https://example.com", lineItems = emptyList())
        val envelope = DispatchEnvelope(type = "ec.start", payload = payload)

        val json = Json.encodeToString(envelope)

        val parsed = Json.parseToJsonElement(json).jsonObject
        assertThat(parsed["type"]?.jsonPrimitive?.content).isEqualTo("ec.start")

        val payloadObj = parsed["payload"]!!.jsonObject
        assertThat(payloadObj["continue_url"]?.jsonPrimitive?.content).isEqualTo("https://example.com")
        assertThat(payloadObj).containsKey("line_items")
        assertThat(payloadObj).doesNotContainKey("continueUrl")
        assertThat(payloadObj).doesNotContainKey("lineItems")
    }

    @Test
    fun `relay dispatches envelope on ec start`() {
        var captured: String? = null
        val client = ProtocolRelay.makeClient(
            listOf("ec.start"),
            DispatchCallback { json -> captured = json },
        )

        client.process(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val json = captured
        assertThat(json).isNotNull()
        val parsed = Json.parseToJsonElement(json!!).jsonObject
        assertThat(parsed["type"]?.jsonPrimitive?.content).isEqualTo("ec.start")

        val payload = parsed["payload"]!!.jsonObject
        assertThat(payload["id"]?.jsonPrimitive?.content).isEqualTo("checkout-123")
        assertThat(payload["currency"]?.jsonPrimitive?.content).isEqualTo("USD")

        val lineItems = payload["line_items"]!!.jsonArray
        assertThat(lineItems).hasSize(1)
        val firstItem = lineItems[0].jsonObject["item"]!!.jsonObject
        assertThat(firstItem["image_url"]?.jsonPrimitive?.content).isEqualTo("https://example.com/image.png")
        val paymentHandlers = payload["ucp"]!!.jsonObject["payment_handlers"]!!.jsonObject
        assertThat(paymentHandlers).containsKey("com.example.loyalty_gold")
    }

    @Test
    fun `relay logs dispatch failures`() {
        val failure = RuntimeException("boom")
        ShadowLog.clear()
        val client = ProtocolRelay.makeClient(
            listOf("ec.start"),
            DispatchCallback { throw failure },
        )

        client.process(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val logs = ShadowLog.getLogsForTag("ShopifyCheckoutKit")
            .filter { it.msg == "Error dispatching protocol event \"ec.start\"" }
        assertThat(logs).hasSize(1)
        assertThat(logs.single().type).isEqualTo(Log.ERROR)
        assertThat(logs.single().throwable).isSameAs(failure)
    }

    @Test
    fun `relay ignores methods not in subscribed list`() {
        var captured: String? = null
        val client = ProtocolRelay.makeClient(
            emptyList(),
            DispatchCallback { json -> captured = json },
        )

        client.process(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(captured).isNull()
    }

    @Test
    fun `relay drops protocol envelopes after dispatch handle release`() {
        var captured: String? = null
        val dispatch = DispatchHandle(DispatchCallback { json -> captured = json })
        val client = ProtocolRelay.makeClient(
            listOf("ec.start"),
            dispatch,
        )

        dispatch.release()
        client.process(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(captured).isNull()
    }
}

@Serializable
private data class SnakePayload(
    @SerialName("continue_url") val continueUrl: String,
    @SerialName("line_items") val lineItems: List<String>,
)

private val ecStartNotificationFixture = """
{
  "jsonrpc": "2.0",
  "method": "ec.start",
  "params": {
    "checkout": {
      "ucp": {
        "version": "2026-04-08",
        "payment_handlers": {
          "com.example.loyalty_gold": []
        }
      },
      "id": "checkout-123",
      "status": "incomplete",
      "currency": "USD",
      "line_items": [
        {
          "id": "li-1",
          "quantity": 1,
          "item": {
            "id": "product-1",
            "title": "Test Product",
            "price": 2999,
            "image_url": "https://example.com/image.png"
          },
          "totals": [
            {"type": "subtotal", "amount": 2999}
          ]
        }
      ],
      "totals": [
        {"type": "total", "amount": 2999}
      ],
      "links": [
        {"type": "privacy_policy", "url": "https://example.com/privacy"}
      ]
    }
  }
}
""".trimIndent()
