package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class HttpResponseHandlerTest {

    private val handler = HttpResponseHandler()

    @Test
    fun `response without managed challenge header is handled normally`() {
        val disposition = handler.disposition(
            responseHeaders = emptyMap(),
            isForMainFrame = true,
            isBackgroundedPreload = true,
        )

        assertThat(disposition).isEqualTo(HttpResponseHandler.Disposition.HANDLE_NORMALLY)
    }

    @Test
    fun `response with different mitigation value is handled normally`() {
        val disposition = handler.disposition(
            responseHeaders = mapOf("cf-mitigated" to "block"),
            isForMainFrame = true,
            isBackgroundedPreload = true,
        )

        assertThat(disposition).isEqualTo(HttpResponseHandler.Disposition.HANDLE_NORMALLY)
    }

    @Test
    fun `managed challenge header name and value matching is case insensitive and trims whitespace`() {
        val disposition = handler.disposition(
            responseHeaders = mapOf("CF-MITIGATED" to "  ChAlLeNgE\t"),
            isForMainFrame = true,
            isBackgroundedPreload = true,
        )

        assertThat(disposition).isEqualTo(HttpResponseHandler.Disposition.DISCARD_PRELOAD)
    }

    @Test
    fun `presented managed challenge renders`() {
        val disposition = handler.disposition(
            responseHeaders = mapOf("cf-mitigated" to "challenge"),
            isForMainFrame = true,
            isBackgroundedPreload = false,
        )

        assertThat(disposition).isEqualTo(HttpResponseHandler.Disposition.RENDER)
    }

    @Test
    fun `subframe managed challenge does not discard backgrounded preload`() {
        val disposition = handler.disposition(
            responseHeaders = mapOf("cf-mitigated" to "challenge"),
            isForMainFrame = false,
            isBackgroundedPreload = true,
        )

        assertThat(disposition).isEqualTo(HttpResponseHandler.Disposition.RENDER)
    }
}
