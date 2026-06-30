package com.shopify.checkoutkit

import android.os.Looper
import com.shopify.ucp.embedded.checkout.Checkout
import com.shopify.ucp.embedded.checkout.DiscountMethod
import com.shopify.ucp.embedded.checkout.EmbeddedColorScheme
import com.shopify.ucp.embedded.checkout.EmbeddedTransportConfig
import com.shopify.ucp.embedded.checkout.ErrorResponse
import com.shopify.ucp.embedded.checkout.ErrorStatus
import com.shopify.ucp.embedded.checkout.FulfillmentMethodType
import com.shopify.ucp.embedded.checkout.LineItemQuantity
import com.shopify.ucp.embedded.checkout.LineItemStatus
import com.shopify.ucp.embedded.checkout.Message
import com.shopify.ucp.embedded.checkout.MessageType
import com.shopify.ucp.embedded.checkout.NotificationDescriptor
import com.shopify.ucp.embedded.checkout.OrderLineItem
import com.shopify.ucp.embedded.checkout.RequestDescriptor
import com.shopify.ucp.embedded.checkout.Severity
import com.shopify.ucp.embedded.checkout.WindowOpenRequest
import com.shopify.ucp.embedded.checkout.WindowOpenResult
import com.shopify.ucp.embedded.checkout.windowOpenSuccess
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class CheckoutProtocolTest {

    // region NotificationDescriptor

    @Test
    fun `start descriptor has correct method`() {
        assertThat(CheckoutProtocol.start.method).isEqualTo("ec.start")
    }

    @Test
    fun `complete descriptor has correct method`() {
        assertThat(CheckoutProtocol.complete.method).isEqualTo("ec.complete")
    }

    @Test
    fun `messagesChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.messagesChange.method).isEqualTo("ec.messages.change")
    }

    @Test
    fun `lineItemsChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.lineItemsChange.method).isEqualTo("ec.line_items.change")
    }

    @Test
    fun `fulfillmentChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.fulfillmentChange.method).isEqualTo("ec.fulfillment.change")
    }

    @Test
    fun `error descriptor has correct method`() {
        assertThat(CheckoutProtocol.error.method).isEqualTo("ec.error")
    }

    @Test
    fun `window open descriptor has correct method and delegation`() {
        assertThat(CheckoutProtocol.windowOpen.method).isEqualTo("ec.window.open_request")
        assertThat(CheckoutProtocol.windowOpen.delegation).isEqualTo("window.open")
    }

    @Test
    fun `windowOpen is a kit-owned request descriptor`() {
        assertThat(CheckoutProtocol.windowOpen.method).isEqualTo("ec.window.open_request")
        assertThat(CheckoutProtocol.windowOpen.delegation).isEqualTo("window.open")
    }

    @Test
    fun `ready is exposed as a request descriptor`() {
        assertThat(CheckoutProtocol.ready.method).isEqualTo("ec.ready")
        assertThat(CheckoutProtocol.ready.delegation).isNull()
    }

    // endregion

    // region supported protocol methods

    @Test
    fun `supported protocol methods include ready notifications and delegations`() {
        assertThat(CheckoutProtocol.supportedProtocolMethods).containsExactlyInAnyOrder(
            CheckoutProtocol.ready.method,
            CheckoutProtocol.start.method,
            CheckoutProtocol.complete.method,
            CheckoutProtocol.error.method,
            CheckoutProtocol.lineItemsChange.method,
            CheckoutProtocol.messagesChange.method,
            CheckoutProtocol.totalsChange.method,
            CheckoutProtocol.fulfillmentChange.method,
            CheckoutProtocol.windowOpen.method,
        )
    }

    @Test
    fun `supported protocol methods exclude internal or unsupported methods`() {
        assertThat(CheckoutProtocol.supportedProtocolMethods).doesNotContain(
            "ec.buyer.change",
            "ec.payment.credential_request",
            "ep.cart.ready",
        )
    }

    @Test
    fun `supported protocol method parses valid supported message`() {
        val message = """{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}"""

        assertThat(CheckoutProtocol.supportedProtocolMethod(message)).isEqualTo(CheckoutProtocol.start.method)
    }

    @Test
    fun `supported protocol method rejects unsupported or invalid message`() {
        assertThat(CheckoutProtocol.supportedProtocolMethod("""{"jsonrpc":"2.0","method":"custom"}""")).isNull()
        assertThat(CheckoutProtocol.supportedProtocolMethod("""{"jsonrpc":"1.0","method":"ec.start"}""")).isNull()
        assertThat(CheckoutProtocol.supportedProtocolMethod("not json")).isNull()
    }

    @Test
    fun `supported protocol method rejects invalid request ids`() {
        assertThat(
            CheckoutProtocol.supportedProtocolMethod(
                """{"jsonrpc":"2.0","method":"ec.start","id":true,"params":{"checkout":{}}}"""
            )
        ).isNull()
        assertThat(
            CheckoutProtocol.supportedProtocolMethod(
                """{"jsonrpc":"2.0","method":"ec.start","id":{},"params":{"checkout":{}}}"""
            )
        ).isNull()
        assertThat(
            CheckoutProtocol.supportedProtocolMethod(
                """{"jsonrpc":"2.0","method":"ec.start","id":1.5,"params":{"checkout":{}}}"""
            )
        ).isNull()
    }

    // endregion

    // region process — notification dispatch

    @Test
    fun `process dispatches ec start to registered handler on main thread`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout -> received.add(checkout) }

        client.process(ecStartMessage(currency = "USD"))
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).hasSize(1)
        assertThat(received[0].currency).isEqualTo("USD")
    }

    @Test
    fun `process dispatches ec complete to registered handler`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { checkout -> received.add(checkout) }

        client.process(ecCompleteMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).hasSize(1)
    }

    @Test
    fun `process dispatches ec fulfillment change to registered handler`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.fulfillmentChange) { checkout -> received.add(checkout) }

        client.process(checkoutMessage(method = CheckoutProtocol.fulfillmentChange.method))
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).hasSize(1)
    }

    @Test
    fun `process does not dispatch to unregistered method`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { checkout -> received.add(checkout) }

        client.process(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isEmpty()
    }

    @Test
    fun `process does not dispatch custom uncurated descriptor`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(NotificationDescriptor<Checkout>("ec.buyer.change")) { checkout -> received.add(checkout) }

        client.process("""{"jsonrpc":"2.0","method":"ec.buyer.change","params":{"checkout":${checkoutJson()}}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isEmpty()
    }

    @Test
    fun `process does not dispatch custom descriptor with supported method`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(NotificationDescriptor<Checkout>(CheckoutProtocol.start.method)) { checkout -> received.add(checkout) }

        client.process(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isEmpty()
    }

    // endregion

    // region process — return value semantics

    @Test
    fun `process returns null for registered notifications`() {
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { /* no-op */ }

        assertThat(client.process(ecStartMessage())).isNull()
    }

    @Test
    fun `process returns null for unknown method`() {
        val client = CheckoutProtocol.Client()
        assertThat(client.process("""{"jsonrpc":"2.0","method":"unknown.method","params":{}}""")).isNull()
    }

    @Test
    fun `process returns null for malformed JSON`() {
        val client = CheckoutProtocol.Client()
        assertThat(client.process("not valid json {{{")).isNull()
    }

    @Test
    fun `process preserves null id for registered delegations`() {
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { windowOpenSuccess() }

        val response = client.process(windowOpenMessage(id = "null"))

        assertThat(response).contains("\"id\":null")
        assertThat(response).contains("\"status\":\"success\"")
    }

    @Test
    fun `process preserves integer id for registered delegations`() {
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { windowOpenSuccess() }

        val response = client.process(windowOpenMessage(id = "7"))

        assertThat(response).contains("\"id\":7")
        assertThat(response).contains("\"status\":\"success\"")
    }

    @Test
    fun `process ignores registered delegations with fractional id`() {
        var handled = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                handled = true
                windowOpenSuccess()
            }

        val response = client.process(windowOpenMessage(id = "1.5"))

        assertThat(response).isNull()
        assertThat(handled).isFalse()
    }

    @Test
    fun `process ignores registered delegations without id`() {
        var handled = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                handled = true
                windowOpenSuccess()
            }

        val response = client.process(
            """{"jsonrpc":"2.0","method":"ec.window.open_request","params":{"url":"https://example.com"}}"""
        )

        assertThat(response).isNull()
        assertThat(handled).isFalse()
    }

    @Test
    fun `process does not dispatch custom delegation descriptor with unsupported delegation`() {
        var handled = false
        val client = CheckoutProtocol.Client()
            .on(
                RequestDescriptor<WindowOpenRequest, WindowOpenResult>(
                    method = CheckoutProtocol.windowOpen.method,
                    delegation = "custom.delegation",
                )
            ) {
                handled = true
                windowOpenSuccess()
            }

        val response = client.process(windowOpenMessage(id = "7"))

        assertThat(response).isNull()
        assertThat(handled).isFalse()
    }

    @Test
    fun `process does not dispatch custom delegation descriptor with supported identity`() {
        var handled = false
        val client = CheckoutProtocol.Client()
            .on(
                RequestDescriptor<WindowOpenRequest, WindowOpenResult>(
                    method = CheckoutProtocol.windowOpen.method,
                    delegation = CheckoutProtocol.windowOpen.delegation,
                )
            ) {
                handled = true
                windowOpenSuccess()
            }

        val response = client.process(windowOpenMessage(id = "7"))

        assertThat(response).isNull()
        assertThat(handled).isFalse()
    }

    // endregion

    // region process — message without checkout in params

    @Test
    fun `process dispatches ec error to registered handler with decoded payload`() {
        var received: ErrorResponse? = null
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { received = it }

        val errorMsg = """{"jsonrpc":"2.0","method":"ec.error","params":""" +
            """{"error":{"ucp":{"version":"2026-04-08","status":"error"},"messages":[""" +
            """{"type":"error","code":"unknown_error","content":"fail","severity":"unrecoverable"},""" +
            """{"type":"error","code":"session_expired","content":"expired","severity":"recoverable"}""" +
            """],"continue_url":"https://example.com/retry"}}}"""
        client.process(errorMsg)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received?.ucp?.version).isEqualTo("2026-04-08")
        assertThat(received?.ucp?.status).isEqualTo(ErrorStatus.Error)
        assertThat(received?.messages).hasSize(2)
        assertThat(received?.messages?.get(0)?.type).isEqualTo(MessageType.Error)
        assertThat(received?.messages?.get(0)?.code).isEqualTo("unknown_error")
        assertThat(received?.messages?.get(0)?.content).isEqualTo("fail")
        assertThat(received?.messages?.get(0)?.severity).isEqualTo(Severity.Unrecoverable)
        assertThat(received?.messages?.get(1)?.code).isEqualTo("session_expired")
        assertThat(received?.messages?.get(1)?.severity).isEqualTo(Severity.Recoverable)
        assertThat(received?.continueURL).isEqualTo("https://example.com/retry")
    }

    @Test
    fun `message model decodes all message types`() {
        val cases = listOf(
            "error" to MessageType.Error,
            "warning" to MessageType.Warning,
            "info" to MessageType.Info,
        )

        cases.forEach { (wireValue, expected) ->
            val message = Json.decodeFromString<Message>(
                """{"content":"$wireValue message","type":"$wireValue"}""",
            )

            assertThat(message.content).isEqualTo("$wireValue message")
            assertThat(message.type).isEqualTo(expected)
        }
    }

    @Test
    fun `checkout model decodes extension fields`() {
        val checkout = Json.decodeFromString<Checkout>(
            """
            {
              "id": "checkout-123",
              "currency": "USD",
              "discounts": {
                "codes": ["SUMMER20"],
                "applied": [
                  {
                    "amount": 500,
                    "code": "SUMMER20",
                    "method": "across",
                    "title": "Summer sale",
                    "allocations": [
                      {
                        "amount": 500,
                        "path": "${'$'}.line_items[0]"
                      }
                    ]
                  }
                ]
              },
              "fulfillment": {
                "available_methods": [
                  {
                    "line_item_ids": ["li-1"],
                    "type": "shipping"
                  }
                ],
                "methods": [
                  {
                    "id": "pickup-main",
                    "line_item_ids": ["li-1"],
                    "type": "pickup"
                  }
                ]
              },
              "line_items": [],
              "links": [],
              "status": "incomplete",
              "totals": [],
              "ucp": {
                "payment_handlers": {},
                "version": "2026-04-08"
              }
            }
            """.trimIndent(),
        )

        assertThat(checkout.discounts?.codes).containsExactly("SUMMER20")
        assertThat(checkout.discounts?.applied?.get(0)?.method).isEqualTo(DiscountMethod.Across)
        assertThat(checkout.discounts?.applied?.get(0)?.allocations?.get(0)?.path)
            .isEqualTo("\$.line_items[0]")
        assertThat(checkout.fulfillment?.availableMethods?.get(0)?.type)
            .isEqualTo(FulfillmentMethodType.Shipping)
        assertThat(checkout.fulfillment?.methods?.get(0)?.id).isEqualTo("pickup-main")
        assertThat(checkout.fulfillment?.methods?.get(0)?.type)
            .isEqualTo(FulfillmentMethodType.Pickup)
    }

    @Test
    fun `order line item decodes quantity model`() {
        val lineItem = Json.decodeFromString<OrderLineItem>(
            """
            {
              "id": "li-1",
              "item": {
                "id": "sku-1",
                "price": 1000,
                "title": "Socks"
              },
              "quantity": {
                "fulfilled": 1,
                "original": 2,
                "total": 2
              },
              "status": "partial",
              "totals": []
            }
            """.trimIndent(),
        )
        val quantity: LineItemQuantity = lineItem.quantity

        assertThat(quantity.fulfilled).isEqualTo(1L)
        assertThat(quantity.original).isEqualTo(2L)
        assertThat(quantity.total).isEqualTo(2L)
        assertThat(lineItem.status).isEqualTo(LineItemStatus.Partial)
    }

    @Test
    fun `embedded transport config decodes color schemes`() {
        val config = Json.decodeFromString<EmbeddedTransportConfig>(
            """
            {
              "color_scheme": ["light", "dark"],
              "delegate": ["window.open"]
            }
            """.trimIndent(),
        )
        val colorScheme: List<EmbeddedColorScheme>? = config.colorScheme

        assertThat(colorScheme).containsExactly(EmbeddedColorScheme.Light, EmbeddedColorScheme.Dark)
        assertThat(config.delegate).containsExactly("window.open")
    }

    @Test
    fun `process does not dispatch when checkout params are invalid`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout -> received.add(checkout) }

        client.process("""{"jsonrpc":"2.0","method":"ec.start","params":{"other":"value"}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isEmpty()
    }

    // endregion

    // region value semantics

    @Test
    fun `on returns new client leaving original unchanged`() {
        val base = CheckoutProtocol.Client()
        val received = mutableListOf<Checkout>()
        val withHandler = base.on(CheckoutProtocol.start) { checkout -> received.add(checkout) }

        // base client should not dispatch
        base.process(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        assertThat(received).isEmpty()

        // withHandler client should dispatch
        withHandler.process(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        assertThat(received).hasSize(1)
    }

    // endregion

    // region SPEC_VERSION

    @Test
    fun `SPEC_VERSION is non-empty`() {
        assertThat(CheckoutProtocol.SPEC_VERSION).isNotEmpty()
    }

    // endregion

    // region helpers

    private fun ecStartMessage(currency: String = "USD"): String =
        checkoutMessage(method = "ec.start", currency = currency)

    private fun ecCompleteMessage(): String =
        checkoutMessage(method = "ec.complete", status = "completed")

    private fun checkoutMessage(
        method: String,
        currency: String = "USD",
        status: String = "incomplete",
    ): String {
        val checkout = checkoutJson(
            currency = currency,
            status = status,
        )
        return """{"jsonrpc":"2.0","method":"$method","params":{"checkout":$checkout}}"""
    }

    private fun windowOpenMessage(id: String, url: String = "https://example.com"): String =
        """{"jsonrpc":"2.0","method":"ec.window.open_request","id":$id,"params":{"url":"$url"}}"""

    private fun checkoutJson(
        id: String = "chk1",
        currency: String = "USD",
        status: String = "incomplete",
    ): String {
        val ucp = """{"payment_handlers":{},"version":"1.0"}"""
        return """{"id":"$id","currency":"$currency","status":"$status","line_items":[],"totals":[],"links":[],"ucp":$ucp}"""
    }

    // endregion
}
