package com.shopify.reactnative.checkoutkit

import android.os.Looper
import android.util.Log
import com.shopify.checkoutkit.CheckoutProtocol
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

        client.processForTest(ecStartNotificationFixture)
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

        client.processForTest(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val logs = ShadowLog.getLogsForTag("ShopifyCheckoutKit")
            .filter { it.msg == "Error dispatching protocol event \"ec.start\"" }
        assertThat(logs).hasSize(1)
        assertThat(logs.single().type).isEqualTo(Log.ERROR)
        assertThat(logs.single().throwable).isSameAs(failure)
    }

    @Test
    fun `relay dispatches envelope for every public checkout state event`() {
        val methods = listOf(
            "ec.complete",
            "ec.fulfillment.change",
            "ec.line_items.change",
            "ec.messages.change",
            "ec.start",
            "ec.totals.change",
        )

        for (method in methods) {
            var captured: String? = null
            val client = ProtocolRelay.makeClient(
                listOf(method),
                DispatchCallback { json -> captured = json },
            )

            client.processForTest(checkoutNotificationFixture(method))
            shadowOf(Looper.getMainLooper()).runToEndOfTasks()

            val json = captured
            assertThat(json).isNotNull()
            val parsed = Json.parseToJsonElement(json!!).jsonObject
            assertThat(parsed["type"]?.jsonPrimitive?.content).isEqualTo(method)
            assertThat(parsed["payload"]!!.jsonObject["id"]?.jsonPrimitive?.content).isEqualTo("checkout-123")
        }
    }

    @Test
    fun `relay dispatches envelope on ec error`() {
        var captured: String? = null
        val client = ProtocolRelay.makeClient(
            listOf("ec.error"),
            DispatchCallback { json -> captured = json },
        )

        client.processForTest(ecErrorNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val json = captured
        assertThat(json).isNotNull()
        val parsed = Json.parseToJsonElement(json!!).jsonObject
        assertThat(parsed["type"]?.jsonPrimitive?.content).isEqualTo("ec.error")

        val payload = parsed["payload"]!!.jsonObject
        assertThat(payload["messages"]!!.jsonArray[0].jsonObject["content"]?.jsonPrimitive?.content)
            .isEqualTo("Something went wrong")
        assertThat(payload["ucp"]!!.jsonObject["status"]?.jsonPrimitive?.content).isEqualTo("error")
    }

    @Test
    fun `relay ignores methods not in subscribed list`() {
        var captured: String? = null
        val client = ProtocolRelay.makeClient(
            emptyList(),
            DispatchCallback { json -> captured = json },
        )

        client.processForTest(ecStartNotificationFixture)
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
        client.processForTest(ecStartNotificationFixture)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(captured).isNull()
    }
}

private fun CheckoutProtocol.Client.processForTest(message: String): String? {
    // `process` is intentionally internal; tests invoke it reflectively to simulate bridge delivery.
    val process = javaClass.methods
        .filter { it.parameterTypes.contentEquals(arrayOf(String::class.java)) }
        .firstOrNull { it.name == "process" }
        ?: javaClass.methods.single {
            it.name.startsWith("process\$") &&
                it.parameterTypes.contentEquals(arrayOf(String::class.java))
        }
    return process.invoke(this, message) as String?
}

@Serializable
private data class SnakePayload(
    @SerialName("continue_url") val continueUrl: String,
    @SerialName("line_items") val lineItems: List<String>,
)

private fun checkoutNotificationFixture(method: String) = ecStartNotificationFixture.replace(
    "\"method\": \"ec.start\"",
    "\"method\": \"$method\"",
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

private val ecErrorNotificationFixture = """
{
  "jsonrpc": "2.0",
  "method": "ec.error",
  "params": {
    "error": {
      "ucp": {
        "version": "2026-04-08",
        "status": "error"
      },
      "messages": [
        {
          "type": "error",
          "content": "Something went wrong",
          "severity": "recoverable"
        }
      ]
    }
  }
}
""".trimIndent()
