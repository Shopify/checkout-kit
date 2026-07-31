package com.shopify.checkoutkit.androiddemo.e2e

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class E2EControlLinkTest {
    private val rejectedNumbers =
        listOf("", "1.5", "abc", "1e3", "0x10", "0b11", "0o17", "2147483648", "99999999999999999999")

    @Test
    fun `returns null when the link is not a control link`() {
        assertThat(E2EControlLink.parse("https://example.com/cart")).isNull()
        assertThat(E2EControlLink.parse("com.shopify.checkoutkit.androiddemo://products/1")).isNull()
        assertThat(E2EControlLink.parse("not a url")).isNull()
    }

    @Test
    fun `parses every app scheme`() {
        val expected = E2EControlLink.Cart(productIndex = 0)
        val schemes = listOf(
            "com.shopify.checkoutkit.androiddemo",
            "com.shopify.checkoutkit.swiftdemo",
            "com.shopify.checkoutkit.reactnativedemo",
        )

        schemes.forEach { scheme ->
            assertThat(E2EControlLink.parse("$scheme://e2e/cart?productIndex=0")).isEqualTo(expected)
        }
    }

    @Test
    fun `parses a scheme the matrix does not declare`() {
        assertThat(E2EControlLink.parse("com.example.anything://e2e/cart?productIndex=0"))
            .isEqualTo(E2EControlLink.Cart(productIndex = 0))
    }

    @Test
    fun `parses the reset command`() {
        assertThat(parse("/reset")).isEqualTo(E2EControlLink.Reset)
    }

    @Test
    fun `rejects unknown parameters`() {
        assertRejects("/reset?productIndex=0", "Unknown reset parameters: productIndex")
        assertRejects("/cart?productIndex=0&quantitiy=5", "Unknown cart parameters: quantitiy")
        assertRejects("/cart?productIndx=0", "Unknown cart parameters: productIndx")
        assertRejects("/cart?productIndex=0&foo=1&bar=2", "Unknown cart parameters: bar, foo")
        assertRejects("/signIn?emial=shopper@example.com", "Unknown signIn parameters: emial")
    }

    @Test
    fun `rejects unknown commands`() {
        assertRejects("", "Unsupported e2e command")
        assertRejects("/", "Unsupported e2e command")
        assertRejects("/teleport?productIndex=0", "Unsupported e2e command")
        assertRejects("/cart/extra?productIndex=0", "Unsupported e2e command")
    }

    @Test
    fun `rejects cart commands without a product selector`() {
        assertRejects("/cart", "Missing variantId or productIndex")
        assertRejects("/cart?", "Missing variantId or productIndex")
        assertRejects("/cart?quantity=2", "Missing variantId or productIndex")
    }

    @Test
    fun `rejects cart commands with both product selectors`() {
        assertRejects(
            "/cart?variantId=gid://shopify/ProductVariant/1&productIndex=0",
            "Use variantId or productIndex, not both",
        )
    }

    @Test
    fun `rejects a blank variant id`() {
        assertRejects("/cart?variantId=", "variantId must not be blank")
        assertRejects("/cart?variantId=%20", "variantId must not be blank")
        assertRejects("/cart?variantId=%0A", "variantId must not be blank")
    }

    @Test
    fun `rejects invalid quantities`() {
        (rejectedNumbers + listOf("0", "-1")).forEach { quantity ->
            assertRejects("/cart?productIndex=0&quantity=$quantity", "quantity must be a positive integer")
        }
    }

    @Test
    fun `rejects invalid product indexes`() {
        (rejectedNumbers + "-1").forEach { productIndex ->
            assertRejects("/cart?productIndex=$productIndex", "productIndex must be a non-negative integer")
        }
    }

    @Test
    fun `rejects invalid buyer identity modes`() {
        listOf("", "member").forEach { buyerIdentityMode ->
            assertRejects(
                "/cart?productIndex=0&buyerIdentityMode=$buyerIdentityMode",
                "buyerIdentityMode must be guest, hardcoded, or customerAccount",
            )
        }
    }

    @Test
    fun `parses a cart command with a variant id`() {
        val link = parse("/cart?variantId=gid://shopify/ProductVariant/1&quantity=2&buyerIdentityMode=guest")

        assertThat(link).isEqualTo(
            E2EControlLink.Cart(
                variantId = "gid://shopify/ProductVariant/1",
                quantity = 2,
                buyerIdentityMode = E2EBuyerIdentityMode.GUEST,
            ),
        )
    }

    @Test
    fun `parses a cart command with a product index and the default quantity`() {
        val link = parse("/cart?productIndex=3&buyerIdentityMode=hardcoded")

        assertThat(link).isEqualTo(
            E2EControlLink.Cart(productIndex = 3, quantity = 1, buyerIdentityMode = E2EBuyerIdentityMode.HARDCODED),
        )
    }

    @Test
    fun `parses a cart command with a trailing slash`() {
        assertThat(parse("/cart/?productIndex=3")).isEqualTo(E2EControlLink.Cart(productIndex = 3))
    }

    @Test
    fun `parses a sign in command`() {
        assertThat(parse("/signIn")).isEqualTo(E2EControlLink.SignIn)
    }

    @Test
    fun `rejects sign in parameters`() {
        assertRejects("/signIn?email=shopper@example.com", "Unknown signIn parameters: email")
    }

    private fun parse(path: String) = E2EControlLink.parse("com.shopify.checkoutkit.androiddemo://e2e$path")

    private fun assertRejects(path: String, message: String) {
        assertThatThrownBy { parse(path) }
            .describedAs(path)
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage(message)
    }
}
