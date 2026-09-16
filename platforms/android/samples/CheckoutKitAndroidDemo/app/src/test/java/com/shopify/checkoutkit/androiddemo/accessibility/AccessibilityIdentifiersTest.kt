package com.shopify.checkoutkit.androiddemo.accessibility

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class AccessibilityIdentifiersTest {
    @Test
    fun `app ready marker matches the maestro flows`() {
        assertThat(AccessibilityIdentifiers.APP_READY).isEqualTo("checkout-kit-sample-ready")
    }

    @Test
    fun `cart markers match the maestro flows`() {
        assertThat(AccessibilityIdentifiers.Cart.CHECKOUT_READY).isEqualTo("cart-checkout-ready")
        assertThat(AccessibilityIdentifiers.Cart.CHECKOUT_BUTTON).isEqualTo("checkout-button")
        assertThat(AccessibilityIdentifiers.Cart.EMPTY_MESSAGE).isEqualTo("cart-empty-message")
    }

    @Test
    fun `tab markers match the maestro flows`() {
        assertThat(AccessibilityIdentifiers.Tabs.CART).isEqualTo("cart-tab")
        assertThat(AccessibilityIdentifiers.Tabs.SETTINGS).isEqualTo("settings-tab")
    }

    @Test
    fun `settings markers match the maestro flows`() {
        assertThat(AccessibilityIdentifiers.Settings.CHECKOUT_PRELOADING_TOGGLE)
            .isEqualTo("checkout-preloading-toggle")
    }
}
