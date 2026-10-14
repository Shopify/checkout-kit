package com.shopify.checkoutkit

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.View
import androidx.annotation.ColorInt

/**
 * Configures the optional Material-style visual drag affordance. Dismissal remains exposed through close/back/outside
 * tap; the handle is decorative and intentionally hidden from accessibility focus.
 */
internal fun View.applyCheckoutSheetDragHandleStyle(
    @ColorInt color: Int,
    sheet: CheckoutSheetOptions,
) {
    visibility = if (sheet.showsDragHandle) View.VISIBLE else View.GONE
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    isFocusable = false
    isClickable = false

    if (!sheet.showsDragHandle) return

    val handleHeight = resources.getDimension(R.dimen.checkout_sheet_drag_handle_height)
    background = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = handleHeight / 2f
        setColor(checkoutSheetDragHandleColor(color))
    }
}

internal val CheckoutSheetOptions.showsDragHandle: Boolean
    get() = dismissal.dragToDismissEnabled && dragHandle.visible

@ColorInt
internal fun checkoutSheetDragHandleColor(@ColorInt color: Int): Int {
    val handleAlpha = (Color.alpha(color) * CHECKOUT_SHEET_DRAG_HANDLE_ALPHA).toInt().coerceIn(0, ALPHA_MAX)
    return Color.argb(handleAlpha, Color.red(color), Color.green(color), Color.blue(color))
}

private const val CHECKOUT_SHEET_DRAG_HANDLE_ALPHA = 0.4f
private const val ALPHA_MAX = 255
