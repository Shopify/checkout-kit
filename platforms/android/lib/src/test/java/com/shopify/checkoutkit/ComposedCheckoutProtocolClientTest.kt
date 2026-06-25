package com.shopify.checkoutkit

import android.os.Looper
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class ComposedCheckoutProtocolClientTest {
    @Test
    fun `run if unhandled returns merchant response and skips default`() {
        var defaultHandled = false
        val merchant = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { WindowOpenResult.Rejected(reason = "merchant") }
        val default = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                defaultHandled = true
                WindowOpenResult.Rejected(reason = "default")
            }
        val client = ComposedCheckoutProtocolClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.windowOpen.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.RunIfUnhandled,
                ),
            ),
        )

        val response = client.process(WINDOW_OPEN_REQUEST)

        assertThat(response).contains("merchant")
        assertThat(defaultHandled).isFalse()
    }

    @Test
    fun `run if unhandled returns default response when merchant has no handler`() {
        var defaultHandled = false
        val merchant = CheckoutProtocol.Client()
        val default = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                defaultHandled = true
                WindowOpenResult.Rejected(reason = "default")
            }
        val client = ComposedCheckoutProtocolClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.windowOpen.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.RunIfUnhandled,
                ),
            ),
        )

        val response = client.process(WINDOW_OPEN_REQUEST)

        assertThat(response).contains("default")
        assertThat(defaultHandled).isTrue()
    }

    @Test
    fun `always run after merchant runs both notification handlers`() {
        var merchantHandled = false
        var defaultHandled = false
        val merchant = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { merchantHandled = true }
        val default = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { defaultHandled = true }
        val client = ComposedCheckoutProtocolClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.error.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
                ),
            ),
        )

        val response = client.process(ERROR_NOTIFICATION)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(response).isNull()
        assertThat(merchantHandled).isTrue()
        assertThat(defaultHandled).isTrue()
    }

    @Test
    fun `always run after merchant runs default when merchant has no handler`() {
        var defaultHandled = false
        val merchant = CheckoutProtocol.Client()
        val default = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { defaultHandled = true }
        val client = ComposedCheckoutProtocolClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.error.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
                ),
            ),
        )

        val response = client.process(ERROR_NOTIFICATION)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(response).isNull()
        assertThat(defaultHandled).isTrue()
    }

    @Test
    fun `default binding only runs for matching method`() {
        var defaultHandled = false
        val default = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                defaultHandled = true
                WindowOpenResult.Success
            }
        val client = ComposedCheckoutProtocolClient(
            merchant = null,
            defaults = mapOf(
                CheckoutProtocol.windowOpen.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.RunIfUnhandled,
                ),
            ),
        )

        val response = client.process(ERROR_NOTIFICATION)

        assertThat(response).isNull()
        assertThat(defaultHandled).isFalse()
    }

    private companion object {
        private const val WINDOW_OPEN_REQUEST =
            """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"1","params":{"url":"https://example.com"}}"""
        private const val ERROR_NOTIFICATION =
            """{"jsonrpc":"2.0","method":"ec.error","params":{"error":{"ucp":{"version":"2026-04-08","status":"error"},"messages":[]}}}"""
    }
}
