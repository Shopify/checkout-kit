package com.shopify.checkout_kit_android_demo.settings.data

import com.shopify.checkoutkit.CheckoutSheetDismissal
import com.shopify.checkoutkit.CheckoutSheetOptions
import com.shopify.checkoutkit.CheckoutSheetTitleAlignment

enum class CheckoutSheetPreset {
    NewDefaults,
    LegacyDialog,
}

fun CheckoutSheetPreset.toCheckoutSheetOptions(
    dragToDismissEnabled: Boolean = true,
    tapAwayToDismissEnabled: Boolean = true,
): CheckoutSheetOptions =
    when (this) {
        CheckoutSheetPreset.NewDefaults -> CheckoutSheetOptions(
            dismissal = CheckoutSheetDismissal(
                dragToDismissEnabled = dragToDismissEnabled,
                tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            ),
        )
        CheckoutSheetPreset.LegacyDialog -> CheckoutSheetOptions(
            cornerRadiusDp = 0f,
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 4f,
            dismissal = CheckoutSheetDismissal(
                dragToDismissEnabled = dragToDismissEnabled,
                tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            ),
        )
    }
