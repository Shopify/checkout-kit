package com.shopify.checkoutkit

import android.view.View
import kotlin.math.roundToInt

internal fun CheckoutSheetSnapPoint.resolveTopMarginPx(view: View, systemBarTopInset: Int = 0): Int {
    val requestedTopMarginPx = when (this) {
        CheckoutSheetSnapPoint.MaterialExpanded -> materialTopMarginDp(view)
        is CheckoutSheetSnapPoint.Expanded -> topMarginDp
    }.dpToPx(view.context).roundToInt()

    return maxOf(requestedTopMarginPx, systemBarTopInset)
}

private fun materialTopMarginDp(view: View): Float =
    if (view.windowWidthDp() > CheckoutSheetSnapPoint.MATERIAL_WIDE_WINDOW_WIDTH_THRESHOLD_DP) {
        CheckoutSheetSnapPoint.MATERIAL_WIDE_TOP_MARGIN_DP
    } else {
        CheckoutSheetSnapPoint.MATERIAL_TOP_MARGIN_DP
    }

private fun View.windowWidthDp(): Float {
    val widthPx = when {
        rootView.width > 0 -> rootView.width
        width > 0 -> width
        else -> resources.displayMetrics.widthPixels
    }

    return widthPx / resources.displayMetrics.density
}
