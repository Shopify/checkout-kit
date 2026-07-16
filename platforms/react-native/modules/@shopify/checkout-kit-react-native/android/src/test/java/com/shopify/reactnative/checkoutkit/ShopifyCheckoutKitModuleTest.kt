package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.LogLevel
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
    fun `appearanceFor maps storefront to a Storefront appearance`() {
        val appearance = ShopifyCheckoutKitModule.appearanceFor("storefront", null)

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
    fun `colorSchemeStringFor represents a Storefront appearance as storefront`() {
        val colorScheme = ShopifyCheckoutKitModule.colorSchemeStringFor(CheckoutAppearance.Storefront())

        assertThat(colorScheme).isEqualTo("storefront")
    }

    @Test
    fun `appearanceFor reports back every color scheme id the native SDK exposes`() {
        listOf(ColorScheme.Light(), ColorScheme.Dark(), ColorScheme.Automatic()).forEach { scheme ->
            val appearance = ShopifyCheckoutKitModule.appearanceFor(scheme.id, null)

            assertThat(ShopifyCheckoutKitModule.colorSchemeStringFor(appearance)).isEqualTo(scheme.id)
        }
    }

    @Test
    fun `every color scheme maps to the appearance the url decorator reads`() {
        val expectedAppearances = listOf(
            "light" to CheckoutAppearance.App(ColorScheme.Light()),
            "dark" to CheckoutAppearance.App(ColorScheme.Dark()),
            "automatic" to CheckoutAppearance.App(ColorScheme.Automatic()),
            "storefront" to CheckoutAppearance.Storefront(),
        )

        expectedAppearances.forEach { (colorScheme, expected) ->
            assertThat(ShopifyCheckoutKitModule.appearanceFor(colorScheme, null)).isEqualTo(expected)
        }
    }

    @Test
    fun `appearanceFor returns null for an unknown color scheme`() {
        assertThat(ShopifyCheckoutKitModule.appearanceFor("sepia", null)).isNull()
    }

    @Test
    fun `appearanceFor returns null for a missing color scheme`() {
        assertThat(ShopifyCheckoutKitModule.appearanceFor(null, null)).isNull()
    }

    @Test
    fun `logLevelFor accepts every level the native SDK supports`() {
        LogLevel.entries.forEach { logLevel ->
            val name = logLevel.name.lowercase()

            assertThat(ShopifyCheckoutKitModule.logLevelFor(name)).isEqualTo(logLevel)
        }
    }

    @Test
    fun `logLevelStringFor reports every level the native SDK supports`() {
        LogLevel.entries.forEach { logLevel ->
            val name = ShopifyCheckoutKitModule.logLevelStringFor(logLevel)

            assertThat(name).isEqualTo(logLevel.name.lowercase())
        }
    }

    @Test
    fun `logLevelFor accepts a mixed case name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor("Warn")).isEqualTo(LogLevel.WARN)
    }

    @Test
    fun `logLevelFor returns null for an unknown name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor("trace")).isNull()
    }

    @Test
    fun `logLevelFor returns null for a missing name`() {
        assertThat(ShopifyCheckoutKitModule.logLevelFor(null)).isNull()
    }
}
