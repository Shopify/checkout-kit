package com.shopify.checkoutkit

import android.net.Uri
import androidx.core.net.toUri
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class UriExtensionsTest {

    @Test
    fun `isConfirmationPage returns true for thank-you path segment`() {
        assertThat("https://shop.com/cn-12345/thank-you".toUri().isConfirmationPage()).isTrue()
    }

    @Test
    fun `isConfirmationPage returns true for thank_you path segment`() {
        assertThat("https://shop.com/cn-12345/thank_you".toUri().isConfirmationPage()).isTrue()
    }

    @Test
    fun `isConfirmationPage is case insensitive`() {
        assertThat("https://shop.com/cn-12345/THANK-YOU".toUri().isConfirmationPage()).isTrue()
        assertThat("https://shop.com/cn-12345/Thank_You".toUri().isConfirmationPage()).isTrue()
    }

    @Test
    fun `isConfirmationPage matches when followed by a query string`() {
        assertThat("https://shop.com/cn-12345/thank-you?order_id=42".toUri().isConfirmationPage()).isTrue()
    }

    @Test
    fun `isConfirmationPage returns true for thank-you non-last segment`() {
        assertThat("https://shop.com/cn-12345/foo/thank-you/bar".toUri().isConfirmationPage()).isTrue()
    }

    @Test
    fun `isConfirmationPage returns false for non-confirmation paths`() {
        assertThat("https://shop.com/cn-12345/checkout".toUri().isConfirmationPage()).isFalse()
        assertThat("https://shop.com/products/widget".toUri().isConfirmationPage()).isFalse()
        assertThat("https://shop.com/".toUri().isConfirmationPage()).isFalse()
    }

    @Test
    fun `isConfirmationPage returns false when thank-you is only a substring`() {
        assertThat("https://shop.com/thank-you-page".toUri().isConfirmationPage()).isFalse()
        assertThat("https://shop.com/pre-thank-you".toUri().isConfirmationPage()).isFalse()
        assertThat("https://shop.com/prethankyou".toUri().isConfirmationPage()).isFalse()
    }

    @Test
    fun `isConfirmationPage returns false when thank-you appears only in the query string`() {
        assertThat("https://shop.com/checkout?next=thank-you".toUri().isConfirmationPage()).isFalse()
    }

    @Test
    fun `isConfirmationPage returns false for null uri`() {
        val uri: Uri? = null
        assertThat(uri.isConfirmationPage()).isFalse()
    }

    @Test
    fun `redactedForLogging strips checkout auth and prefill query values`() {
        val url = "$BASE_URL?ec_auth=jwt-token&checkout%5Bemail%5D=buyer%40example.com&cart=123"

        val result = url.redactedUrlForLogging()

        assertThat(result).contains("ec_auth=%5BREDACTED%5D")
        assertThat(result).contains("checkout%5Bemail%5D=%5BREDACTED%5D")
        assertThat(result).contains("cart=%5BREDACTED%5D")
        assertThat(result).doesNotContain("jwt-token")
        assertThat(result).doesNotContain("buyer%40example.com")
    }

    @Test
    fun `redactedForLogging preserves URL without query`() {
        assertThat(BASE_URL.redactedUrlForLogging()).isEqualTo(BASE_URL)
    }

    private companion object {
        private const val BASE_URL = "https://shop.com/cart/c/abc"
    }
}
