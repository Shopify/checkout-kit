package com.shopify.checkoutkit

import android.content.Context
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import androidx.annotation.ColorInt

/**
 * Creates the sheet header background with rounded top corners and square bottom corners.
 */
internal fun roundedTopCornerDrawable(
    context: Context,
    @ColorInt color: Int,
    cornerRadiusDp: Float,
): GradientDrawable {
    val cornerRadius = cornerRadiusDp.dpToPx(context)
    return CheckoutSheetHeaderBackgroundDrawable(color, cornerRadius)
}

internal fun Float.dpToPx(context: Context): Float =
    TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        coerceAtLeast(0f),
        context.resources.displayMetrics,
    )

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
