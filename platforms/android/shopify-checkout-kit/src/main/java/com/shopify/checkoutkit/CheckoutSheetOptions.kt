package com.shopify.checkoutkit

import android.content.Context

/**
 * Presentation options for the native checkout sheet.
 *
 * @property cornerRadiusDp Radius applied to the sheet's top corners. Must be finite and non-negative.
 * @property maxWidthDp Maximum sheet width. Defaults to 640dp. Invalid or unrepresentable numeric values fall back
 * to the default. Very narrow widths are not recommended.
 * @property toolbarElevationDp Elevation applied to the native toolbar. Must be finite and non-negative.
 * @property scrimColor Color drawn behind the sheet. Include alpha in the value when using [Color.SRGB]. The default
 * matches Material Components' `mtrl_scrim_color`.
 * @property dismissal Sheet dismissal behavior.
 * @property dragHandle Visual drag handle configuration.
 * @property snapPoints Sheet resting positions. Currently supports exactly one expanded snap point.
 */
public data class CheckoutSheetOptions @JvmOverloads constructor(
    public val cornerRadiusDp: Float = 32f,
    public val titleAlignment: CheckoutSheetTitleAlignment = CheckoutSheetTitleAlignment.CENTER,
    public val toolbarElevationDp: Float = 0f,
    public val closeIcon: DrawableResource? = null,
    public val closeIconTint: Color? = null,
    public val scrimColor: Color = Color.SRGB(MATERIAL_COMPONENTS_SCRIM_COLOR),
    public val dismissal: CheckoutSheetDismissal = CheckoutSheetDismissal(),
    public val dragHandle: CheckoutSheetDragHandle = CheckoutSheetDragHandle(),
    public val snapPoints: List<CheckoutSheetSnapPoint> = listOf(CheckoutSheetSnapPoint.MaterialExpanded),
    public val maxWidthDp: Float = DEFAULT_SHEET_MAX_WIDTH_DP,
) {
    init {
        requireValidDimension(name = "cornerRadiusDp", value = cornerRadiusDp)
        requireValidDimension(name = "toolbarElevationDp", value = toolbarElevationDp)
        requireValidSnapPoints(snapPoints)
    }
}

public enum class CheckoutSheetTitleAlignment {
    START,
    CENTER,
}

/**
 * Dismissal behavior for the checkout sheet.
 *
 * @property dragToDismissEnabled Whether downward sheet drags can dismiss checkout.
 * @property tapAwayToDismissEnabled Whether tapping outside the sheet can dismiss checkout.
 */
public data class CheckoutSheetDismissal @JvmOverloads constructor(
    public val dragToDismissEnabled: Boolean = true,
    public val tapAwayToDismissEnabled: Boolean = true,
)

/**
 * Visual drag handle configuration for the checkout sheet.
 *
 * @property visible Whether to show a visual-only drag handle at the top of the sheet. Ignored when
 * [CheckoutSheetDismissal.dragToDismissEnabled] is false.
 */
public data class CheckoutSheetDragHandle @JvmOverloads constructor(
    public val visible: Boolean = false,
)

/**
 * A supported resting position for the checkout sheet.
 */
public sealed class CheckoutSheetSnapPoint private constructor() {

    /**
     * Expanded Material-style sheet position.
     *
     * Resolves to a 72dp top margin from the window top, or 56dp when the window width is greater than 640dp.
     */
    public object MaterialExpanded : CheckoutSheetSnapPoint()

    /**
     * Expanded sheet position with a fixed top margin from the window top.
     *
     * @property topMarginDp Top margin from the window top. The SDK clamps this below the top system bar inset when
     * needed. Must be finite and non-negative.
     */
    public data class Expanded public constructor(
        public val topMarginDp: Float,
    ) : CheckoutSheetSnapPoint() {
        init {
            requireValidDimension(name = "topMarginDp", value = topMarginDp)
        }
    }

    public companion object {
        public const val MATERIAL_TOP_MARGIN_DP: Float = 72f
        public const val MATERIAL_WIDE_TOP_MARGIN_DP: Float = 56f
        public const val MATERIAL_WIDE_WINDOW_WIDTH_THRESHOLD_DP: Float = 640f
    }
}

private const val MATERIAL_COMPONENTS_SCRIM_COLOR = 0x52000000
internal const val DEFAULT_SHEET_MAX_WIDTH_DP = 640f

internal fun CheckoutSheetOptions.resolveMaxWidthDp(context: Context): Float =
    maxWidthDp.takeIf { it.isRepresentableSheetWidth(context) } ?: DEFAULT_SHEET_MAX_WIDTH_DP

private fun Float.isRepresentableSheetWidth(context: Context): Boolean {
    val widthPx = dpToPx(context)
    return widthPx.isFinite() && widthPx >= 1f && widthPx <= MAX_SHEET_WIDTH_PX
}

// A View.MeasureSpec reserves its two highest bits for the measurement mode, leaving 30 bits for its size.
// Shifting 1 left by 30 and subtracting 1 sets each of those 30 size bits, producing the largest valid size.
private const val MAX_SHEET_WIDTH_PX = (1 shl 30) - 1

private fun requireValidDimension(name: String, value: Float) {
    require(value.isFinite() && value >= 0f) {
        "$name must be a finite, non-negative value."
    }
}

private fun requireValidSnapPoints(snapPoints: List<CheckoutSheetSnapPoint>) {
    require(snapPoints.size == 1) {
        "snapPoints currently supports exactly one item."
    }
}
