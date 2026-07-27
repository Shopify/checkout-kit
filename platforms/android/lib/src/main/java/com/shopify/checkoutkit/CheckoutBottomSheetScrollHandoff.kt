package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.View
import android.webkit.WebView

/**
 * Bridges the one interaction the WebView cannot handle: dragging down from checkout scroll-top to dismiss the sheet.
 *
 * This is not a full nested-scroll handoff. If a gesture starts as WebView scrolling, it stays with the WebView;
 * the sheet only takes over downward gestures while checkout content cannot scroll up.
 */
@SuppressLint("ClickableViewAccessibility")
// This intentionally accepts WebView so a scrollability test double can exercise the handoff.
// Production installs it only on CheckoutWebView.
internal fun WebView.installBottomSheetScrollHandoff(sheet: CheckoutBottomSheetLayout) {
    val handoffController = ScrollHandoffController(sheet)
    setOnTouchListener { view, event -> handoffController.onTouch(view, event) }
}

private class ScrollHandoffController(
    private val sheet: CheckoutBottomSheetLayout,
) {
    private var lastRawY = 0f
    private var gestureOwner: ScrollHandoffGestureOwner? = null

    fun onTouch(view: View, event: MotionEvent): Boolean =
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> handleDown(view, event)
            MotionEvent.ACTION_MOVE -> handleMove(view, event)
            MotionEvent.ACTION_CANCEL -> finish(view, cancelled = true)
            MotionEvent.ACTION_UP -> finish(view, cancelled = false)
            else -> gestureOwner == ScrollHandoffGestureOwner.SHEET
        }

    private fun handleDown(view: View, event: MotionEvent): Boolean {
        lastRawY = event.rawY
        gestureOwner = null
        sheet.startScrollableChildGesture(event)
        view.parent?.requestDisallowInterceptTouchEvent(true)
        return false
    }

    private fun handleMove(view: View, event: MotionEvent): Boolean {
        val dragDistance = event.rawY - lastRawY
        lastRawY = event.rawY

        val consumeMove = when (gestureOwner) {
            ScrollHandoffGestureOwner.WEB_VIEW -> false
            ScrollHandoffGestureOwner.SHEET -> {
                sheet.dragScrollableChildBy(dragDistance, event)
                true
            }
            null -> handleUnownedMove(view, event, dragDistance)
        }

        view.parent?.requestDisallowInterceptTouchEvent(true)
        return consumeMove
    }

    private fun handleUnownedMove(view: View, event: MotionEvent, dragDistance: Float): Boolean {
        val canScrollUp = view.canScrollVertically(SCROLL_UP_DIRECTION)
        return when {
            dragDistance < 0f || canScrollUp -> {
                gestureOwner = ScrollHandoffGestureOwner.WEB_VIEW
                false
            }
            dragDistance > 0f -> {
                val consumedBySheet = sheet.dragScrollableChildBy(dragDistance, event)
                if (consumedBySheet) {
                    gestureOwner = ScrollHandoffGestureOwner.SHEET
                    view.cancelWebViewGesture(event)
                }
                consumedBySheet
            }
            else -> false
        }
    }

    private fun finish(view: View, cancelled: Boolean): Boolean {
        sheet.finishScrollableChildGesture(cancelled)
        view.parent?.requestDisallowInterceptTouchEvent(false)
        val wasSheetOwned = gestureOwner == ScrollHandoffGestureOwner.SHEET
        gestureOwner = null
        return wasSheetOwned
    }
}

private enum class ScrollHandoffGestureOwner {
    WEB_VIEW,
    SHEET,
}

private fun View.cancelWebViewGesture(event: MotionEvent) {
    val cancelEvent = MotionEvent.obtain(event).apply {
        action = MotionEvent.ACTION_CANCEL
    }
    try {
        onTouchEvent(cancelEvent)
    } finally {
        cancelEvent.recycle()
    }
}
