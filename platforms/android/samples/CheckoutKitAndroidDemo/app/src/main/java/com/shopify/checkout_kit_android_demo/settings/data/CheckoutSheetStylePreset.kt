package com.shopify.checkout_kit_android_demo.settings.data

import com.shopify.checkoutkit.CheckoutSheetStyle
import com.shopify.checkoutkit.CheckoutSheetTitleAlignment

enum class CheckoutSheetStylePreset {
    NewDefaults,
    LegacyDialog,
}

fun CheckoutSheetStylePreset.toCheckoutSheetStyle(dragToDismissEnabled: Boolean = true): CheckoutSheetStyle =
    when (this) {
        CheckoutSheetStylePreset.NewDefaults -> CheckoutSheetStyle(
            dragToDismissEnabled = dragToDismissEnabled,
        )
        CheckoutSheetStylePreset.LegacyDialog -> CheckoutSheetStyle(
            cornerRadiusDp = 0f,
            titleAlignment = CheckoutSheetTitleAlignment.START,
            toolbarElevationDp = 4f,
            dragToDismissEnabled = dragToDismissEnabled,
        )
    }
