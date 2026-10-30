package com.shopify.checkoutkit.internal.presentation

import android.annotation.SuppressLint
import android.app.Activity
import android.view.View
import androidx.core.view.doOnLayout
import androidx.window.WindowSdkExtensions
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo

/**
 * Horizontal position and width of the sheet within its parent, in pixels.
 */
internal data class SheetHorizontalPlacement(val left: Int, val width: Int)

/**
 * Returns a vertical fold that splits the window into two areas, such as a foldable half opened in book posture.
 */
internal fun WindowLayoutInfo.separatingVerticalFold(): FoldingFeature? =
    displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull {
        it.isSeparating && it.orientation == FoldingFeature.Orientation.VERTICAL
    }

/**
 * Reads the current fold synchronously so the sheet opens in place. Reading it needs WindowManager extensions 9 or
 * later; on older devices this returns `null` and the fold arrives through the window layout listener.
 */
@SuppressLint("RequiresWindowSdk") // Lint doesn't recognize the extension version check as a guard.
internal fun WindowInfoTracker.currentSeparatingVerticalFold(activity: Activity): FoldingFeature? =
    if (WindowSdkExtensions.getInstance().extensionVersion >= CURRENT_WINDOW_LAYOUT_INFO_EXTENSION_VERSION) {
        getCurrentWindowLayoutInfo(activity).separatingVerticalFold()
    } else {
        null
    }

/**
 * Keeps the sheet on the start side of [fold] so checkout isn't split across it, or centers the sheet when there's
 * no fold.
 */
internal fun CheckoutBottomSheetLayout.placeBeside(fold: FoldingFeature?, activity: Activity) {
    val root = parent as? View ?: return
    root.doOnLayout {
        applyHorizontalPlacement(fold?.let { startSidePlacement(it, activity, root, maxWidthPx) })
    }
}

/**
 * Fold bounds are in the activity window's coordinates, so they're offset into the sheet window's [root].
 */
private fun startSidePlacement(
    fold: FoldingFeature,
    activity: Activity,
    root: View,
    maxWidthPx: Int,
): SheetHorizontalPlacement? {
    val activityOrigin = IntArray(2).also { activity.window.decorView.getLocationOnScreen(it) }
    val rootOrigin = IntArray(2).also { root.getLocationOnScreen(it) }
    val offsetX = activityOrigin[0] - rootOrigin[0]
    return startSidePlacement(
        parentWidth = root.width,
        foldLeft = fold.bounds.left + offsetX,
        foldRight = fold.bounds.right + offsetX,
        isRtl = root.layoutDirection == View.LAYOUT_DIRECTION_RTL,
        maxWidthPx = maxWidthPx,
    )
}

/**
 * Centers the sheet in the area on the start side of a vertical fold, capped at [maxWidthPx].
 *
 * [foldLeft] and [foldRight] are in the parent's coordinates. Returns `null` when the start side has no width.
 */
internal fun startSidePlacement(
    parentWidth: Int,
    foldLeft: Int,
    foldRight: Int,
    isRtl: Boolean,
    maxWidthPx: Int,
): SheetHorizontalPlacement? {
    val areaLeft = if (isRtl) foldRight.coerceIn(0, parentWidth) else 0
    val areaRight = if (isRtl) parentWidth else foldLeft.coerceIn(0, parentWidth)
    val areaWidth = areaRight - areaLeft
    if (areaWidth <= 0) return null

    val width = minOf(areaWidth, maxWidthPx)
    return SheetHorizontalPlacement(left = areaLeft + (areaWidth - width) / 2, width = width)
}

private const val CURRENT_WINDOW_LAYOUT_INFO_EXTENSION_VERSION = 9
