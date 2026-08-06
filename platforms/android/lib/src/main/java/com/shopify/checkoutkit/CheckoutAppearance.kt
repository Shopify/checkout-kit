package com.shopify.checkoutkit

import kotlinx.serialization.Serializable

/**
 * The appearance to use when presenting checkout.
 */
@Serializable
public sealed interface CheckoutAppearance {
    /**
     * Uses an app appearance with the provided color scheme.
     */
    @Serializable
    public data class App(
        public val colorScheme: ColorScheme = ColorScheme.Automatic(),
    ) : CheckoutAppearance

    /**
     * Uses the storefront's web checkout branding.
     *
     * Storefront checkout currently uses a light color scheme. The surrounding native sheet colors
     * can be customized to match the merchant's branding.
     */
    @Serializable
    public class Storefront(
        private val colors: Colors = ColorScheme.Light().colors,
    ) : CheckoutAppearance {
        /**
         * Creates a customized storefront appearance for native sheet elements.
         *
         * Storefront Web content continues to use the merchant's checkout branding.
         */
        public fun customize(customizer: StorefrontCustomizer): Storefront {
            val builder = ColorsBuilder(colors)
            with(customizer) {
                builder.customize()
            }
            return Storefront(builder.build())
        }

        internal val nativeColorScheme: ColorScheme.Light
            get() = ColorScheme.Light(colors)

        override fun equals(other: Any?): Boolean = other is Storefront && colors == other.colors

        override fun hashCode(): Int = colors.hashCode()

        override fun toString(): String = "Storefront(colors=$colors)"
    }
}

/**
 * Customizes the native sheet colors surrounding storefront checkout.
 */
public fun interface StorefrontCustomizer {
    /**
     * Applies storefront color overrides to this builder.
     */
    public fun ColorsBuilder.customize(): Unit
}

internal val CheckoutAppearance.effectiveColorScheme: ColorScheme
    get() = when (this) {
        is CheckoutAppearance.App -> colorScheme
        is CheckoutAppearance.Storefront -> nativeColorScheme
    }
