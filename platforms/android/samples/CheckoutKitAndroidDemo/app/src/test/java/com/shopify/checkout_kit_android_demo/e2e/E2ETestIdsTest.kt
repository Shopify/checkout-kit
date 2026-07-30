package com.shopify.checkout_kit_android_demo.e2e

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class E2ETestIdsTest {
    @Test
    fun `app ready marker matches the maestro flows`() {
        assertThat(E2ETestIds.APP_READY).isEqualTo("checkout-kit-sample-ready")
    }

    @Test
    fun `cart markers match the maestro flows`() {
        assertThat(E2ETestIds.Cart.CHECKOUT_READY).isEqualTo("cart-checkout-ready")
        assertThat(E2ETestIds.Cart.CHECKOUT_BUTTON).isEqualTo("checkout-button")
        assertThat(E2ETestIds.Cart.EMPTY_MESSAGE).isEqualTo("cart-empty-message")
    }

    @Test
    fun `tab markers match the maestro flows`() {
        assertThat(E2ETestIds.Tabs.CART).isEqualTo("cart-tab")
    }
}
