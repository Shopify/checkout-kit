package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitModuleTest {

    @Test
    fun `appearanceFor maps an app color scheme to an App appearance`() {
        val appearance = ShopifyCheckoutKitModule.appearanceFor("dark", null)

        assertThat(appearance).isEqualTo(CheckoutAppearance.App(ColorScheme.Dark()))
    }

    @Test
    fun `appearanceFor maps web_default to a Storefront appearance`() {
        val appearance = ShopifyCheckoutKitModule.appearanceFor("web_default", null)

        assertThat(appearance).isInstanceOf(CheckoutAppearance.Storefront::class.java)
    }

    @Test
    fun `colorSchemeStringFor returns the color scheme id for an App appearance`() {
        val colorScheme = ShopifyCheckoutKitModule.colorSchemeStringFor(
            CheckoutAppearance.App(ColorScheme.Light())
        )

        assertThat(colorScheme).isEqualTo("light")
    }

    @Test
    fun `colorSchemeStringFor represents a Storefront appearance as web_default`() {
        val colorScheme = ShopifyCheckoutKitModule.colorSchemeStringFor(CheckoutAppearance.Storefront())

        assertThat(colorScheme).isEqualTo("web_default")
    }
}
