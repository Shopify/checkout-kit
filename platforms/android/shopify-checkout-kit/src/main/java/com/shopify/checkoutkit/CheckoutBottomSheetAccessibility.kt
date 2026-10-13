package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.content.Context
import android.view.View
import android.view.accessibility.AccessibilityManager
import android.view.accessibility.AccessibilityNodeInfo
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

/**
 * Moves initial accessibility focus to the close button after the sheet opening animation starts.
 *
 * The previous platform Dialog presentation naturally landed initial accessibility focus on the toolbar close button.
 * The custom sheet restores that escape hatch explicitly so screen reader users do not start behind the sheet or inside
 * partially-loaded WebView content.
 *
 * If the close button is unavailable, falls back to a single checkout announcement.
 */
internal fun CheckoutBottomSheet.focusCloseButtonForAccessibility(activity: ComponentActivity) {
    window?.decorView?.postDelayed({
        val closeButton = window?.decorView?.findViewById<View>(R.id.shopify_checkout_kit_close_button)
        val touchExplorationEnabled = activity.isTouchExplorationEnabled()
        if (closeButton == null) {
            if (touchExplorationEnabled) {
                log.d(LOG_TAG, "Close button was not available for initial accessibility focus.")
                window?.decorView?.announceCheckoutTitleForAccessibility(activity)
            }
            return@postDelayed
        }

        closeButton.focusForCheckoutSheetAccessibility(touchExplorationEnabled) {
            log.d(LOG_TAG, "Close button was not available for initial accessibility focus.")
            window?.decorView?.announceCheckoutTitleForAccessibility(activity)
        }
    }, INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS)
}

/**
 * Focuses the close button and requests accessibility focus when a touch-exploration service is active.
 */
@SuppressLint("AccessibilityFocus")
internal fun View.focusForCheckoutSheetAccessibility(
    touchExplorationEnabled: Boolean,
    onAccessibilityFocusUnavailable: () -> Unit,
) {
    isFocusable = true
    requestFocus()
    if (!touchExplorationEnabled) return

    @Suppress("DEPRECATION")
    val accessibilityFocusAction = AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS
    val closeButtonFocused = performAccessibilityAction(accessibilityFocusAction, null)
    if (!closeButtonFocused) {
        onAccessibilityFocusUnavailable()
    }
}

/**
 * Returns whether an accessibility service is actively driving touch exploration, such as a screen reader.
 */
private fun ComponentActivity.isTouchExplorationEnabled(): Boolean {
    val accessibilityManager = getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
    return accessibilityManager?.isTouchExplorationEnabled == true
}

@Suppress("DEPRECATION")
private fun View.announceCheckoutTitleForAccessibility(activity: ComponentActivity) {
    announceForAccessibility(ShopifyCheckoutKit.configuration.resolveCheckoutTitle(activity))
}

private const val LOG_TAG = "CheckoutBottomSheet"
private const val INITIAL_ACCESSIBILITY_FOCUS_DELAY_MS = 320L
