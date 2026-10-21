package com.shopify.checkoutkit.checkout
import android.content.Context
import com.shopify.checkoutkit.internal.presentation.dpToPx

/**
 * Presentation options for the native checkout sheet.
 *
 * Create options with [builder] or the Kotlin [invoke] DSL. The resulting options are immutable.
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
@Suppress("LongParameterList")
public class CheckoutSheetOptions internal constructor(
    public val cornerRadiusDp: Float = DEFAULT_SHEET_CORNER_RADIUS_DP,
    public val titleAlignment: CheckoutSheetTitleAlignment = CheckoutSheetTitleAlignment.CENTER,
    public val toolbarElevationDp: Float = 0f,
    public val closeIcon: DrawableResource? = null,
    public val closeIconTintColor: Color? = null,
    public val scrimColor: Color = Color.SRGB(MATERIAL_COMPONENTS_SCRIM_COLOR),
    public val dismissal: CheckoutSheetDismissal = CheckoutSheetDismissal(),
    public val dragHandle: CheckoutSheetDragHandle = CheckoutSheetDragHandle(),
    snapPoints: List<CheckoutSheetSnapPoint> = listOf(CheckoutSheetSnapPoint.MaterialExpanded),
    public val maxWidthDp: Float = DEFAULT_SHEET_MAX_WIDTH_DP,
) {
    public val snapPoints: List<CheckoutSheetSnapPoint> = snapPoints.toList()

    override fun equals(other: Any?): Boolean =
        other is CheckoutSheetOptions &&
            cornerRadiusDp.toBits() == other.cornerRadiusDp.toBits() &&
            titleAlignment == other.titleAlignment &&
            toolbarElevationDp.toBits() == other.toolbarElevationDp.toBits() &&
            closeIcon == other.closeIcon &&
            closeIconTintColor == other.closeIconTintColor &&
            scrimColor == other.scrimColor &&
            dismissal == other.dismissal &&
            dragHandle == other.dragHandle &&
            snapPoints == other.snapPoints &&
            maxWidthDp.toBits() == other.maxWidthDp.toBits()

    override fun hashCode(): Int {
        var result = cornerRadiusDp.hashCode()
        result = HASH_MULTIPLIER * result + titleAlignment.hashCode()
        result = HASH_MULTIPLIER * result + toolbarElevationDp.hashCode()
        result = HASH_MULTIPLIER * result + (closeIcon?.hashCode() ?: 0)
        result = HASH_MULTIPLIER * result + (closeIconTintColor?.hashCode() ?: 0)
        result = HASH_MULTIPLIER * result + scrimColor.hashCode()
        result = HASH_MULTIPLIER * result + dismissal.hashCode()
        result = HASH_MULTIPLIER * result + dragHandle.hashCode()
        result = HASH_MULTIPLIER * result + snapPoints.hashCode()
        result = HASH_MULTIPLIER * result + maxWidthDp.hashCode()
        return result
    }

    override fun toString(): String =
        "CheckoutSheetOptions(cornerRadiusDp=$cornerRadiusDp, titleAlignment=$titleAlignment, " +
            "toolbarElevationDp=$toolbarElevationDp, closeIcon=$closeIcon, closeIconTintColor=$closeIconTintColor, " +
            "scrimColor=$scrimColor, dismissal=$dismissal, dragHandle=$dragHandle, " +
            "snapPoints=$snapPoints, maxWidthDp=$maxWidthDp)"

    public class Builder {
        public var cornerRadiusDp: Float = DEFAULT_SHEET_CORNER_RADIUS_DP
        public var titleAlignment: CheckoutSheetTitleAlignment = CheckoutSheetTitleAlignment.CENTER
        public var toolbarElevationDp: Float = 0f
        public var closeIcon: DrawableResource? = null
        public var closeIconTintColor: Color? = null
        public var scrimColor: Color = Color.SRGB(MATERIAL_COMPONENTS_SCRIM_COLOR)
        public var dismissal: CheckoutSheetDismissal = CheckoutSheetDismissal()
        public var dragHandle: CheckoutSheetDragHandle = CheckoutSheetDragHandle()
        public var snapPoints: List<CheckoutSheetSnapPoint> = listOf(CheckoutSheetSnapPoint.MaterialExpanded)
        public var maxWidthDp: Float = DEFAULT_SHEET_MAX_WIDTH_DP

        public fun build(): CheckoutSheetOptions {
            requireValidDimension(name = "cornerRadiusDp", value = cornerRadiusDp)
            requireValidDimension(name = "toolbarElevationDp", value = toolbarElevationDp)
            requireValidSnapPoints(snapPoints)
            return CheckoutSheetOptions(
                cornerRadiusDp = cornerRadiusDp,
                titleAlignment = titleAlignment,
                toolbarElevationDp = toolbarElevationDp,
                closeIcon = closeIcon,
                closeIconTintColor = closeIconTintColor,
                scrimColor = scrimColor,
                dismissal = dismissal,
                dragHandle = dragHandle,
                snapPoints = snapPoints,
                maxWidthDp = maxWidthDp,
            )
        }
    }

    public companion object {
        @JvmStatic
        public fun builder(): Builder = Builder()

        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutSheetOptions =
            Builder().apply(configure).build()
    }
}

public enum class CheckoutSheetTitleAlignment {
    START,
    CENTER,
}

/** Controls checkout-sheet dismissal behavior. */
public class CheckoutSheetDismissal internal constructor(
    public val dragToDismissEnabled: Boolean = true,
    public val tapAwayToDismissEnabled: Boolean = true,
) {
    override fun equals(other: Any?): Boolean =
        other is CheckoutSheetDismissal &&
            dragToDismissEnabled == other.dragToDismissEnabled &&
            tapAwayToDismissEnabled == other.tapAwayToDismissEnabled

    override fun hashCode(): Int = 31 * dragToDismissEnabled.hashCode() + tapAwayToDismissEnabled.hashCode()

    override fun toString(): String =
        "CheckoutSheetDismissal(dragToDismissEnabled=$dragToDismissEnabled, " +
            "tapAwayToDismissEnabled=$tapAwayToDismissEnabled)"

    public class Builder {
        public var dragToDismissEnabled: Boolean = true
        public var tapAwayToDismissEnabled: Boolean = true

        public fun build(): CheckoutSheetDismissal =
            CheckoutSheetDismissal(dragToDismissEnabled, tapAwayToDismissEnabled)
    }

    public companion object {
        @JvmStatic
        public fun builder(): Builder = Builder()

        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutSheetDismissal =
            Builder().apply(configure).build()
    }
}

/** Visual drag-handle configuration for the checkout sheet. */
public class CheckoutSheetDragHandle internal constructor(
    public val visible: Boolean = false,
) {
    override fun equals(other: Any?): Boolean = other is CheckoutSheetDragHandle && visible == other.visible

    override fun hashCode(): Int = visible.hashCode()

    override fun toString(): String = "CheckoutSheetDragHandle(visible=$visible)"

    public class Builder {
        public var visible: Boolean = false

        public fun build(): CheckoutSheetDragHandle = CheckoutSheetDragHandle(visible)
    }

    public companion object {
        @JvmStatic
        public fun builder(): Builder = Builder()

        public operator fun invoke(configure: Builder.() -> Unit = {}): CheckoutSheetDragHandle =
            Builder().apply(configure).build()
    }
}

/** A supported resting position for the checkout sheet. */
public sealed class CheckoutSheetSnapPoint private constructor() {
    /** Expanded Material-style sheet position. */
    public object MaterialExpanded : CheckoutSheetSnapPoint()

    /** Expanded sheet position with a fixed top margin from the window top. */
    public class Expanded internal constructor(
        public val topMarginDp: Float,
    ) : CheckoutSheetSnapPoint() {
        override fun equals(
            other: Any?,
        ): Boolean = other is Expanded && topMarginDp.toBits() == other.topMarginDp.toBits()

        override fun hashCode(): Int = topMarginDp.hashCode()

        override fun toString(): String = "Expanded(topMarginDp=$topMarginDp)"

        public class Builder {
            public var topMarginDp: Float = 0f

            public fun build(): Expanded {
                requireValidDimension(name = "topMarginDp", value = topMarginDp)
                return Expanded(topMarginDp)
            }
        }

        public companion object {
            @JvmStatic
            public fun builder(): Builder = Builder()

            public operator fun invoke(configure: Builder.() -> Unit): Expanded =
                Builder().apply(configure).build()
        }
    }

    public companion object {
        public const val MATERIAL_TOP_MARGIN_DP: Float = 72f
        public const val MATERIAL_WIDE_TOP_MARGIN_DP: Float = 56f
        public const val MATERIAL_WIDE_WINDOW_WIDTH_THRESHOLD_DP: Float = 640f
    }
}

private const val HASH_MULTIPLIER = 31
private const val MATERIAL_COMPONENTS_SCRIM_COLOR = 0x52000000
internal const val DEFAULT_SHEET_CORNER_RADIUS_DP = 32f
internal const val DEFAULT_SHEET_MAX_WIDTH_DP = 640f

internal fun CheckoutSheetOptions.resolveMaxWidthDp(context: Context): Float =
    maxWidthDp.takeIf { it.isRepresentableSheetWidth(context) } ?: DEFAULT_SHEET_MAX_WIDTH_DP

private fun Float.isRepresentableSheetWidth(context: Context): Boolean {
    val widthPx = dpToPx(context)
    return widthPx.isFinite() && widthPx >= 1f && widthPx <= MAX_SHEET_WIDTH_PX
}

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
