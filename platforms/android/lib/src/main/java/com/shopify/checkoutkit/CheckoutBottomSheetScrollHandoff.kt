package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.View
import androidx.core.view.ViewCompat

// This touch listener only observes drag distance so unconsumed downward scroll
// can move the bottom sheet. It returns false so WebView clicks, long presses,
// and accessibility handling still run through the normal WebView path.
@SuppressLint("ClickableViewAccessibility")
internal fun BaseWebView.installBottomSheetScrollHandoff() {
    var lastY = 0f
    val nestedScrollConsumed = IntArray(2)
    val nestedScrollOffset = IntArray(2)

    setOnTouchListener { view, event ->
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastY = event.y
                ViewCompat.startNestedScroll(view, ViewCompat.SCROLL_AXIS_VERTICAL, ViewCompat.TYPE_TOUCH)
                view.parent?.requestDisallowInterceptTouchEvent(true)
            }

            MotionEvent.ACTION_MOVE -> {
                val dragDistance = event.y - lastY
                lastY = event.y
                if (dragDistance > 0f) {
                    val sheetDragDistance = view.unconsumedDownwardDragDistance(dragDistance)
                    if (sheetDragDistance > 0f) {
                        nestedScrollConsumed[0] = 0
                        nestedScrollConsumed[1] = 0
                        nestedScrollOffset[0] = 0
                        nestedScrollOffset[1] = 0
                        ViewCompat.dispatchNestedPreScroll(
                            view,
                            0,
                            -sheetDragDistance.toInt(),
                            nestedScrollConsumed,
                            nestedScrollOffset,
                            ViewCompat.TYPE_TOUCH,
                        )
                    }
                }
                view.parent?.requestDisallowInterceptTouchEvent(true)
            }

            MotionEvent.ACTION_CANCEL,
            MotionEvent.ACTION_UP -> {
                ViewCompat.stopNestedScroll(view, ViewCompat.TYPE_TOUCH)
                view.parent?.requestDisallowInterceptTouchEvent(false)
            }
        }
        false
    }
}

private fun View.unconsumedDownwardDragDistance(dragDistance: Float): Float {
    return if (!canScrollVertically(-1)) {
        dragDistance
    } else {
        (dragDistance - scrollY).coerceAtLeast(0f)
    }
}
