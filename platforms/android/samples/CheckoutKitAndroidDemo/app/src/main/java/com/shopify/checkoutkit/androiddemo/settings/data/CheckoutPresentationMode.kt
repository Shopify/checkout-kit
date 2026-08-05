package com.shopify.checkoutkit.androiddemo.settings.data

import com.shopify.checkoutkit.CheckoutSheetOptions

enum class CheckoutPresentationMode {
    CheckoutKitSheet,
    AppOwnedComposeSheet,
}

fun CheckoutPresentationMode.toCheckoutSheetOptions(
    preset: CheckoutSheetPreset,
    dragToDismissEnabled: Boolean,
    tapAwayToDismissEnabled: Boolean,
): CheckoutSheetOptions {
    val activePreset = when (this) {
        CheckoutPresentationMode.CheckoutKitSheet -> preset
        CheckoutPresentationMode.AppOwnedComposeSheet -> CheckoutSheetPreset.NewDefaults
    }

    return activePreset.toCheckoutSheetOptions(
        dragToDismissEnabled = dragToDismissEnabled,
        tapAwayToDismissEnabled = tapAwayToDismissEnabled,
    )
}
