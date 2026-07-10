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
     * Uses the storefront's web checkout branding with the automatic color scheme.
     */
    @Serializable
    public data class Storefront(
        public val colorScheme: ColorScheme = ColorScheme.Automatic(),
    ) : CheckoutAppearance
}

internal val CheckoutAppearance.colorScheme: ColorScheme
    get() = when (this) {
        is CheckoutAppearance.App -> colorScheme
        is CheckoutAppearance.Storefront -> ColorScheme.Automatic()
    }
