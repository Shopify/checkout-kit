package com.shopify.checkoutkit.androiddemo.settings.data

import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme

data class Settings(
    val appearance: CheckoutAppearance,
    val buyerIdentityDemoEnabled: Boolean,
    val checkoutPreloadingEnabled: Boolean,
    val checkoutPresentationMode: CheckoutPresentationMode,
    val dragToDismissEnabled: Boolean,
    val tapAwayToDismissEnabled: Boolean,
    val windowOpenHandler: WindowOpenHandler,
    val checkoutSheetPreset: CheckoutSheetPreset,
) {
    val colorScheme: ColorScheme
        get() = when (appearance) {
            is CheckoutAppearance.App -> appearance.colorScheme
            is CheckoutAppearance.Storefront -> ColorScheme.Light()
        }
}
