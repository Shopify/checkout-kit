package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class ComposedCheckoutCommunicationClientTest {
    @Test
    fun `run if unhandled returns merchant response and skips default`() {
        val merchant = RecordingClient(response = MERCHANT_RESPONSE)
        val default = RecordingClient(response = DEFAULT_RESPONSE)
        val client = ComposedCheckoutCommunicationClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.windowOpen.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.RunIfUnhandled,
                ),
            ),
        )

        val response = client.process(WINDOW_OPEN_REQUEST)

        assertThat(response).isEqualTo(MERCHANT_RESPONSE)
        assertThat(merchant.messages).containsExactly(WINDOW_OPEN_REQUEST)
        assertThat(default.messages).isEmpty()
    }

    @Test
    fun `run if unhandled returns default response when merchant has no response`() {
        val merchant = RecordingClient(response = null)
        val default = RecordingClient(response = DEFAULT_RESPONSE)
        val client = ComposedCheckoutCommunicationClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.windowOpen.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.RunIfUnhandled,
                ),
            ),
        )

        val response = client.process(WINDOW_OPEN_REQUEST)

        assertThat(response).isEqualTo(DEFAULT_RESPONSE)
        assertThat(merchant.messages).containsExactly(WINDOW_OPEN_REQUEST)
        assertThat(default.messages).containsExactly(WINDOW_OPEN_REQUEST)
    }

    @Test
    fun `always run after merchant runs default and keeps merchant response`() {
        val merchant = RecordingClient(response = MERCHANT_RESPONSE)
        val default = RecordingClient(response = DEFAULT_RESPONSE)
        val client = ComposedCheckoutCommunicationClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.error.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
                ),
            ),
        )

        val response = client.process(ERROR_NOTIFICATION)

        assertThat(response).isEqualTo(MERCHANT_RESPONSE)
        assertThat(merchant.messages).containsExactly(ERROR_NOTIFICATION)
        assertThat(default.messages).containsExactly(ERROR_NOTIFICATION)
    }

    @Test
    fun `always run after merchant returns default response when merchant has no response`() {
        val merchant = RecordingClient(response = null)
        val default = RecordingClient(response = DEFAULT_RESPONSE)
        val client = ComposedCheckoutCommunicationClient(
            merchant = merchant,
            defaults = mapOf(
                CheckoutProtocol.error.method to DefaultClientBinding(
                    client = default,
                    policy = DefaultClientPolicy.AlwaysRunAfterMerchant,
                ),
            ),
        )

        val response = client.process(ERROR_NOTIFICATION)

        assertThat(response).isEqualTo(DEFAULT_RESPONSE)
        assertThat(merchant.messages).containsExactly(ERROR_NOTIFICATION)
        assertThat(default.messages).containsExactly(ERROR_NOTIFICATION)
    }

    @Test
    fun `default binding only runs for matching method`() {
        val default = RecordingClient(response = DEFAULT_RESPONSE)
        val client = ComposedCheckoutCommunicationClient(
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
        assertThat(default.messages).isEmpty()
    }

    private class RecordingClient(
        private val response: String?,
    ) : CheckoutCommunicationClient {
        val messages = mutableListOf<String>()

        override fun process(message: String): String? {
            messages += message
            return response
        }
    }

    private companion object {
        private const val MERCHANT_RESPONSE = """{"jsonrpc":"2.0","id":"merchant","result":{}}"""
        private const val DEFAULT_RESPONSE = """{"jsonrpc":"2.0","id":"default","result":{}}"""
        private const val WINDOW_OPEN_REQUEST =
            """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"1","params":{"url":"https://example.com"}}"""
        private const val ERROR_NOTIFICATION =
            """{"jsonrpc":"2.0","method":"ec.error","params":{"error":{"messages":[]}}}"""
    }
}
