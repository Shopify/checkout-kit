/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.reactnative.checkoutkit

import android.os.Looper
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class ProtocolRelayTest {

    @Test
    fun `envelope encodes type and camelCase payload`() {
        val payload = SnakePayload(continueUrl = "https://example.com", lineItems = emptyList())
        val envelope = DispatchEnvelope(type = "ec.start", payload = payload)

        val json = CasingTransform.encodeForJS(envelope)

        val parsed = Json.parseToJsonElement(json).jsonObject
        assertThat(parsed["type"]?.jsonPrimitive?.content).isEqualTo("ec.start")

        val payloadObj = parsed["payload"]!!.jsonObject
        assertThat(payloadObj["continueUrl"]?.jsonPrimitive?.content).isEqualTo("https://example.com")
        assertThat(payloadObj).containsKey("lineItems")
        assertThat(payloadObj).doesNotContainKey("continue_url")
        assertThat(payloadObj).doesNotContainKey("line_items")
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

        val lineItems = payload["lineItems"]!!.jsonArray
        assertThat(lineItems).hasSize(1)
        val firstItem = lineItems[0].jsonObject["item"]!!.jsonObject
        assertThat(firstItem["imageUrl"]?.jsonPrimitive?.content).isEqualTo("https://example.com/image.png")
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
        "payment_handlers": {}
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
