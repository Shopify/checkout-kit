package com.shopify.checkoutkit

import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CheckoutAppearanceTest {

    @Test
    fun `storefront uses light native colors by default`() {
        assertThat(CheckoutAppearance.Storefront().effectiveColorScheme).isEqualTo(ColorScheme.Light())
    }

    @Test
    fun `storefront accepts native colors`() {
        val colors = ColorScheme.Dark().colors

        val appearance = CheckoutAppearance.Storefront(colors)

        assertThat(appearance.effectiveColorScheme).isEqualTo(ColorScheme.Light(colors))
    }

    @Test
    fun `storefront native colors can be customized and serialized`() {
        val headerBackground = Color.SRGB(0xFF008060.toInt())
        val appearance = CheckoutAppearance.Storefront().customize {
            this.headerBackground = headerBackground
        }

        val serialized = Json.encodeToString(CheckoutAppearance.serializer(), appearance)
        val decoded = Json.decodeFromString(CheckoutAppearance.serializer(), serialized)

        val colorScheme = appearance.effectiveColorScheme as ColorScheme.Light
        assertThat(colorScheme.colors.headerBackground).isEqualTo(headerBackground)
        assertThat(decoded).isEqualTo(appearance)
    }
}
