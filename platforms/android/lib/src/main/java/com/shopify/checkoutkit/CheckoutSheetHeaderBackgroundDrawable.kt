package com.shopify.checkoutkit

import android.content.Context
import android.graphics.drawable.GradientDrawable
import androidx.annotation.ColorInt

/**
 * Creates the sheet header background with rounded top corners and square bottom corners.
 */
internal fun roundedTopCornerDrawable(
    context: Context,
    @ColorInt color: Int,
): GradientDrawable {
    val cornerRadius = context.resources.getDimension(R.dimen.checkout_sheet_corner_radius)
    return CheckoutSheetHeaderBackgroundDrawable(color, cornerRadius)
}

internal class CheckoutSheetHeaderBackgroundDrawable(
    @ColorInt val fillColor: Int,
    topCornerRadius: Float,
) : GradientDrawable() {
    val appliedCornerRadii: FloatArray =
        floatArrayOf(
            topCornerRadius,
            topCornerRadius,
            topCornerRadius,
            topCornerRadius,
            0f,
            0f,
            0f,
            0f,
        )

    init {
        setColor(fillColor)
        cornerRadii = appliedCornerRadii
    }
}
