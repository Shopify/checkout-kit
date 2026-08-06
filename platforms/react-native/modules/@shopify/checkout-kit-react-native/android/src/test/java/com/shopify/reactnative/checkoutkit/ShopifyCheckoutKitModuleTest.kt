package com.shopify.reactnative.checkoutkit

import com.facebook.react.bridge.JavaOnlyMap
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.Color
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
    fun `appearanceFor applies the nested light and dark colors of the automatic scheme`() {
        val androidConfig = JavaOnlyMap().apply {
            putMap("light", colorConfig("#FFFFFF"))
            putMap("dark", colorConfig("#000000"))
        }

        val scheme = automaticSchemeOf(ShopifyCheckoutKitModule.appearanceFor("automatic", androidConfig))

        assertThat(scheme.lightColors.webViewBackground).isEqualTo(Color.SRGB(0xFFFFFFFF.toInt()))
        assertThat(scheme.darkColors.webViewBackground).isEqualTo(Color.SRGB(0xFF000000.toInt()))
    }

    @Test
    fun `appearanceFor keeps the SDK colors when the automatic scheme omits the dark colors`() {
        val androidConfig = JavaOnlyMap().apply {
            putMap("light", colorConfig("#FFFFFF"))
        }

        val appearance = ShopifyCheckoutKitModule.appearanceFor("automatic", androidConfig)

        assertThat(appearance).isEqualTo(CheckoutAppearance.App(ColorScheme.Automatic()))
    }

    @Test
    fun `appearanceFor applies a flat color config to an explicit scheme`() {
        val appearance = ShopifyCheckoutKitModule.appearanceFor("light", colorConfig("#FFFFFF"))

        val scheme = (appearance as CheckoutAppearance.App).colorScheme as ColorScheme.Light
        assertThat(scheme.colors.webViewBackground).isEqualTo(Color.SRGB(0xFFFFFFFF.toInt()))
    }

    private fun automaticSchemeOf(appearance: CheckoutAppearance?): ColorScheme.Automatic =
        (appearance as CheckoutAppearance.App).colorScheme as ColorScheme.Automatic

    private fun colorConfig(backgroundColor: String) = JavaOnlyMap().apply {
        putString("backgroundColor", backgroundColor)
        putString("progressIndicator", "#123456")
        putString("headerTextColor", "#654321")
        putString("headerBackgroundColor", backgroundColor)
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
