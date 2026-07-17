package com.shopify.checkout_kit_android_demo.e2e

import android.net.Uri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CartBootstrapTest {

    @Test
    fun `ignores URLs for other schemes`() {
        val request = CartBootstrap.request(
            Uri.parse("https://example.com/cart?productIndex=0&quantity=1"),
        )

        assertNull(request)
    }

    @Test
    fun `rejects unsupported bootstrap routes`() {
        assertInvalidLink(
            url = "${BASE_URL}account?productIndex=0&quantity=1",
            message = "Unsupported cart bootstrap route",
        )
    }

    @Test
    fun `rejects missing product index`() {
        assertInvalidLink(
            url = "$CART_URL?quantity=1",
            message = "Invalid cart bootstrap parameter: productIndex",
        )
    }

    @Test
    fun `rejects duplicate product index`() {
        assertInvalidLink(
            url = "$CART_URL?productIndex=0&productIndex=1&quantity=1",
            message = "Invalid cart bootstrap parameter: productIndex",
        )
    }

    @Test
    fun `rejects invalid product indexes`() {
        listOf("-1", "1.5", "abc").forEach { productIndex ->
            assertInvalidLink(
                url = "$CART_URL?productIndex=$productIndex&quantity=1",
                message = "Invalid cart bootstrap parameter: productIndex",
            )
        }
    }

    @Test
    fun `rejects missing quantity`() {
        assertInvalidLink(
            url = "$CART_URL?productIndex=0",
            message = "Invalid cart bootstrap parameter: quantity",
        )
    }

    @Test
    fun `rejects duplicate quantity`() {
        assertInvalidLink(
            url = "$CART_URL?productIndex=0&quantity=1&quantity=2",
            message = "Invalid cart bootstrap parameter: quantity",
        )
    }

    @Test
    fun `rejects invalid quantities`() {
        listOf("0", "-1", "1.5", "abc").forEach { quantity ->
            assertInvalidLink(
                url = "$CART_URL?productIndex=0&quantity=$quantity",
                message = "Invalid cart bootstrap parameter: quantity",
            )
        }
    }

    @Test
    fun `returns a product index bootstrap request`() {
        val request = CartBootstrap.request(
            Uri.parse("$CART_URL?productIndex=3&quantity=2"),
        )

        assertEquals(CartBootstrapRequest(productIndex = 3, quantity = 2), request)
    }

    @Test
    fun `accepts a root path`() {
        val request = CartBootstrap.request(
            Uri.parse("$CART_URL/?productIndex=0&quantity=1"),
        )

        assertEquals(CartBootstrapRequest(productIndex = 0, quantity = 1), request)
    }

    private fun assertInvalidLink(url: String, message: String) {
        val error = assertThrows(IllegalArgumentException::class.java) {
            CartBootstrap.request(Uri.parse(url))
        }

        assertEquals(message, error.message)
    }

    private companion object {
        private const val BASE_URL = "com.shopify.checkoutkit.androiddemo://"
        private const val CART_URL = "${BASE_URL}cart"
    }
}
