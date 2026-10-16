package com.shopify.checkoutkit.androiddemo.settings.data

import com.shopify.checkoutkit.checkout.CheckoutSheetDismissal
import com.shopify.checkoutkit.checkout.CheckoutSheetOptions
import com.shopify.checkoutkit.checkout.CheckoutSheetTitleAlignment

enum class CheckoutSheetPreset {
    NewDefaults,
    LegacyDialog,
}

private const val LEGACY_TOOLBAR_ELEVATION_DP = 4f

fun CheckoutSheetPreset.toCheckoutSheetOptions(
    dragToDismissEnabled: Boolean = true,
    tapAwayToDismissEnabled: Boolean = true,
): CheckoutSheetOptions =
    when (this) {
        CheckoutSheetPreset.NewDefaults -> CheckoutSheetOptions {
            dismissal = CheckoutSheetDismissal {
                this.dragToDismissEnabled = dragToDismissEnabled
                this.tapAwayToDismissEnabled = tapAwayToDismissEnabled
            }
        }
        CheckoutSheetPreset.LegacyDialog -> CheckoutSheetOptions {
            cornerRadiusDp = 0f
            titleAlignment = CheckoutSheetTitleAlignment.START
            toolbarElevationDp = LEGACY_TOOLBAR_ELEVATION_DP
            dismissal = CheckoutSheetDismissal {
                this.dragToDismissEnabled = dragToDismissEnabled
                this.tapAwayToDismissEnabled = tapAwayToDismissEnabled
            }
        }
    }
