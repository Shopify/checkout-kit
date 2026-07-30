package com.shopify.checkoutkit.androiddemo.settings.data

import com.shopify.checkoutkit.CheckoutSheetTitleAlignment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckoutSheetPresetTest {
    @Test
    fun `new defaults preserves dismissal choices`() {
        val options = CheckoutSheetPreset.NewDefaults.toCheckoutSheetOptions(
            dragToDismissEnabled = false,
            tapAwayToDismissEnabled = true,
        )

        assertEquals(32f, options.cornerRadiusDp)
        assertEquals(CheckoutSheetTitleAlignment.CENTER, options.titleAlignment)
        assertEquals(0f, options.toolbarElevationDp)
        assertFalse(options.dismissal.dragToDismissEnabled)
        assertTrue(options.dismissal.tapAwayToDismissEnabled)
    }

    @Test
    fun `legacy dialog uses its compatibility sheet styling`() {
        val options = CheckoutSheetPreset.LegacyDialog.toCheckoutSheetOptions(
            dragToDismissEnabled = true,
            tapAwayToDismissEnabled = false,
        )

        assertEquals(0f, options.cornerRadiusDp)
        assertEquals(CheckoutSheetTitleAlignment.START, options.titleAlignment)
        assertEquals(4f, options.toolbarElevationDp)
        assertTrue(options.dismissal.dragToDismissEnabled)
        assertFalse(options.dismissal.tapAwayToDismissEnabled)
    }

    @Test
    fun `app owned presentation always uses the new defaults`() {
        val options = CheckoutPresentationMode.AppOwnedComposeSheet.toCheckoutSheetOptions(
            preset = CheckoutSheetPreset.LegacyDialog,
            dragToDismissEnabled = false,
            tapAwayToDismissEnabled = false,
        )

        assertEquals(32f, options.cornerRadiusDp)
        assertEquals(CheckoutSheetTitleAlignment.CENTER, options.titleAlignment)
        assertEquals(0f, options.toolbarElevationDp)
        assertFalse(options.dismissal.dragToDismissEnabled)
        assertFalse(options.dismissal.tapAwayToDismissEnabled)
    }
}
