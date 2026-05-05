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
package com.shopify.checkoutkit

import android.net.Uri
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
    fun `buyerChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.buyerChange.method).isEqualTo("ec.buyer.change")
    }

    @Test
    fun `paymentChange descriptor has correct method`() {
        assertThat(CheckoutProtocol.paymentChange.method).isEqualTo("ec.payment.change")
    }

    @Test
    fun `ready descriptor has correct method`() {
        assertThat(CheckoutProtocol.ready.method).isEqualTo("ec.ready")
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

    @Test
    fun `process dispatches ready notification with correct delegations`() {
        val received = mutableListOf<ReadyPayload>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.ready) { payload -> received.add(payload) }

        val delegate = """["payment.instruments_change","fulfillment.address_change"]"""
        val message = """{"jsonrpc":"2.0","method":"ec.ready","id":"1","params":{"delegate":$delegate}}"""
        client.process(message)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).hasSize(1)
        assertThat(received[0].delegations).containsExactly(
            "payment.instruments_change",
            "fulfillment.address_change"
        )
    }

    @Test
    fun `process dispatches ready with empty delegations when delegate is absent`() {
        val received = mutableListOf<ReadyPayload>()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.ready) { payload -> received.add(payload) }

        val message = """{"jsonrpc":"2.0","method":"ec.ready","id":"1","params":{}}"""
        client.process(message)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).hasSize(1)
        assertThat(received[0].delegations).isEmpty()
    }

    // endregion

    // region process — always returns null

    @Test
    fun `process always returns null`() {
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

    @Test
    fun `onOpenExternalUrl returns new client leaving original unchanged`() {
        val uri = Uri.parse("https://example.com")
        val base = CheckoutProtocol.Client()
        val withHandler = base.onOpenExternalUrl { true }

        assertThat(base.openExternalUrl(uri)).isFalse()
        assertThat(withHandler.openExternalUrl(uri)).isTrue()
    }

    // endregion

    // region openExternalUrl

    @Test
    fun `openExternalUrl returns false when no handler registered`() {
        val client = CheckoutProtocol.Client()
        assertThat(client.openExternalUrl(Uri.parse("https://example.com"))).isFalse()
    }

    @Test
    fun `openExternalUrl delegates to registered handler`() {
        val seen = mutableListOf<Uri>()
        val client = CheckoutProtocol.Client()
            .onOpenExternalUrl { uri ->
                seen.add(uri)
                true
            }

        val uri = Uri.parse("https://shop.example.com/page")
        val result = client.openExternalUrl(uri)

        assertThat(result).isTrue()
        assertThat(seen).containsExactly(uri)
    }

    @Test
    fun `openExternalUrl respects handler returning false`() {
        val client = CheckoutProtocol.Client().onOpenExternalUrl { false }
        assertThat(client.openExternalUrl(Uri.parse("https://example.com"))).isFalse()
    }

    // endregion

    // region specVersion

    @Test
    fun `specVersion is non-empty`() {
        assertThat(CheckoutProtocol.specVersion).isNotEmpty()
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
