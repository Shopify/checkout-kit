package com.shopify.checkoutkit

import android.os.Looper
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class CheckoutProtocolTest {

    // region NotificationDescriptor

    @Test
    fun `public notification descriptors match supported embedded checkout methods`() {
        assertThat(
            listOf(
                CheckoutProtocol.start.method,
                CheckoutProtocol.complete.method,
                CheckoutProtocol.error.method,
                CheckoutProtocol.lineItemsChange.method,
                CheckoutProtocol.totalsChange.method,
                CheckoutProtocol.messagesChange.method,
            )
        ).containsExactly(
            "ec.start",
            "ec.complete",
            "ec.error",
            "ec.line_items.change",
            "ec.totals.change",
            "ec.messages.change",
        )
    }

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
    fun `totalsChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.totalsChange.method).isEqualTo("ec.totals.change")
    }

    @Test
    fun `buyerChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.buyerChange.method).isEqualTo("ec.buyer.change")
    }

    @Test
    fun `error descriptor has correct method`() {
        assertThat(CheckoutProtocol.error.method).isEqualTo("ec.error")
    }

    // endregion

    // region DelegationDescriptor

    @Test
    fun `windowOpen descriptor has correct method`() {
        assertThat(CheckoutProtocol.windowOpen.method).isEqualTo("ec.window.open_request")
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
    fun `process does not dispatch to unregistered method`() {
        val received = mutableListOf<Checkout>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { checkout -> received.add(checkout) }

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
        assertThat(received?.ucp?.status).isEqualTo(StatusEnum.Error)
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
    fun `process does not dispatch when params has no checkout field`() {
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
    fun `SPEC_VERSION matches embedded checkout snapshot`() {
        assertThat(CheckoutProtocol.SPEC_VERSION).isEqualTo("2026-04-08")
    }

    // endregion

    // region helpers

    private fun ecStartMessage(currency: String = "USD"): String =
        """{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":${checkoutJson(currency = currency)}}}"""

    private fun ecCompleteMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":${checkoutJson(status = "completed")}}}"""

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
