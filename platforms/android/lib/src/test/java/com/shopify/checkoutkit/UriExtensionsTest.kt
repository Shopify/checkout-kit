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
    fun `appendEcpParams adds ec_version and ec_delegate`() {
        val result = BASE_URL.appendEcpParams(SPEC_VERSION).toUri()
        assertThat(result.getQueryParameter("ec_version")).isEqualTo(SPEC_VERSION)
        assertThat(result.getQueryParameter("ec_delegate")).isEqualTo("window.open")
    }

    @Test
    fun `appendEcpParams is idempotent on re-call`() {
        val once = BASE_URL.appendEcpParams(SPEC_VERSION)
        val twice = once.appendEcpParams(SPEC_VERSION).toUri()
        assertThat(twice.getQueryParameters("ec_version")).hasSize(1)
        assertThat(twice.getQueryParameters("ec_delegate")).hasSize(1)
    }

    @Test
    fun `appendEcpParams preserves existing query parameters`() {
        val url = "$BASE_URL?key=cart_token&utm_source=email"
        val result = url.appendEcpParams(SPEC_VERSION).toUri()
        assertThat(result.getQueryParameter("key")).isEqualTo("cart_token")
        assertThat(result.getQueryParameter("utm_source")).isEqualTo("email")
        assertThat(result.getQueryParameter("ec_version")).isEqualTo(SPEC_VERSION)
    }

    @Test
    fun `appendEcpParams replaces caller-supplied ECP params`() {
        val url = "$BASE_URL?ec_version=override&ec_delegate=custom"
        val result = url.appendEcpParams(SPEC_VERSION).toUri()
        assertThat(result.getQueryParameters("ec_version")).containsExactly(SPEC_VERSION)
        assertThat(result.getQueryParameters("ec_delegate")).containsExactly("window.open")
    }

    private companion object {
        private const val BASE_URL = "https://shop.com/cart/c/abc"
        private const val SPEC_VERSION = "2026-04-08"
    }
}
