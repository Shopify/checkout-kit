package com.shopify.checkoutkit

import android.view.View
import android.view.accessibility.AccessibilityNodeInfo
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

/**
 * Moves initial accessibility focus to the close button after the sheet opening animation starts.
 *
 * If the close button is unavailable, falls back to a single checkout announcement.
 */
@Suppress("DEPRECATION")
internal fun CheckoutBottomSheet.focusCloseButtonForAccessibility(activity: ComponentActivity) {
    window?.decorView?.postDelayed({
        val closeButton = window?.decorView?.findViewById<View>(R.id.checkoutKitCloseBtn)
        closeButton?.isFocusable = true
        closeButton?.requestFocus()

        val closeButtonFocused = closeButton?.performAccessibilityAction(
            AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS,
            null,
        ) == true
        if (!closeButtonFocused) {
            log.d(LOG_TAG, "Close button was not available for initial accessibility focus.")
            window?.decorView?.announceForAccessibility(activity.getString(R.string.checkout_web_view_title))
        }
    }, INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS)
}

private const val LOG_TAG = "CheckoutBottomSheet"
private const val INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS = 320L
