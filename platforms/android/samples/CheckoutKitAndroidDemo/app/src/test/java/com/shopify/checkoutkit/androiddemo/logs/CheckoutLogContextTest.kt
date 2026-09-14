package com.shopify.checkoutkit.androiddemo.logs

import com.shopify.checkoutkit.androiddemo.common.logs.LogLevel
import com.shopify.checkoutkit.androiddemo.common.logs.LogLine
import com.shopify.checkoutkit.androiddemo.common.logs.LogSource
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CheckoutLogContextTest {
    @Test
    fun `compares checkout snapshots and groups the dismissal after completion`() {
        val started = sdkLog("Checkout started", """{"id":"checkout-one","status":"incomplete"}""")
        val link = sdkLog("Checkout link handled", """{"url":"https://example.com"}""")
        val updated = sdkLog("Checkout updated", """{"id":"checkout-one","status":"ready_for_complete"}""")
        val completed = sdkLog("Checkout completed", """{"id":"checkout-one","status":"completed"}""")
        val dismissed = sdkLog("Checkout dismissed")
        val nextCheckout = sdkLog("Checkout started", """{"id":"checkout-two"}""")

        val contexts = listOf(started, link, updated, completed, dismissed, nextCheckout).checkoutContextsByLogId()

        assertThat(contexts[started.id]).isEqualTo(CheckoutLogContext("checkout-one"))
        assertThat(contexts[link.id]).isEqualTo(CheckoutLogContext("checkout-one"))
        assertThat(contexts[updated.id]).isEqualTo(CheckoutLogContext("checkout-one", started.payload))
        assertThat(contexts[completed.id]).isEqualTo(CheckoutLogContext("checkout-one", updated.payload))
        assertThat(contexts[dismissed.id]).isEqualTo(CheckoutLogContext("checkout-one"))
        assertThat(contexts[nextCheckout.id]).isEqualTo(CheckoutLogContext("checkout-two"))
    }

    @Test
    fun `failure ends the checkout context and does not enter the snapshot history`() {
        val started = sdkLog("Checkout started", """{"id":"checkout-one"}""")
        val failed = sdkLog("Checkout failed", """{"code":"NETWORK_ERROR","message":"offline"}""")
        val unrelated = sdkLog("Checkout link handled")

        val contexts = listOf(started, failed, unrelated).checkoutContextsByLogId()

        assertThat(contexts[failed.id]).isEqualTo(CheckoutLogContext("checkout-one"))
        assertThat(contexts).doesNotContainKey(unrelated.id)
    }

    @Test
    fun `retains checkout context from saved protocol logs`() {
        val earlier = LogLine(
            message = "Received: ec.start",
            source = LogSource.PROTOCOL,
            level = LogLevel.INFO,
            payload = """{"id":"checkout-one","line_items":[],"totals":[]}""",
        )
        val updated = sdkLog("Checkout updated", """{"id":"checkout-one","line_items":[],"totals":[]}""")
        val completed = LogLine(
            message = "Received: ec.complete",
            source = LogSource.PROTOCOL,
            level = LogLevel.INFO,
            payload = earlier.payload,
        )
        val dismissed = sdkLog("Checkout dismissed")

        val contexts = listOf(earlier, updated, completed, dismissed).checkoutContextsByLogId()

        assertThat(contexts[updated.id]).isEqualTo(CheckoutLogContext("checkout-one", earlier.payload))
        assertThat(contexts[completed.id]).isEqualTo(CheckoutLogContext("checkout-one", updated.payload))
        assertThat(contexts[dismissed.id]).isEqualTo(CheckoutLogContext("checkout-one"))
    }

    @Test
    fun `ignores malformed and non-checkout payloads`() {
        val invalidJson = sdkLog("Checkout started", "not json")
        val invalidId = sdkLog("Checkout updated", """{"id":{"value":"checkout-one"}}""")
        val link = sdkLog("Checkout link clicked", """{"id":"not-a-checkout","url":"https://example.com"}""")

        assertThat(listOf(invalidJson, invalidId, link).checkoutContextsByLogId()).isEmpty()
    }

    private fun sdkLog(message: String, payload: String? = null): LogLine = LogLine(
        message = message,
        source = LogSource.SDK,
        level = LogLevel.INFO,
        payload = payload,
    )
}
