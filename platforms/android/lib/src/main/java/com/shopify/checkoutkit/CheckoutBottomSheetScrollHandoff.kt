package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.View

/**
 * Observes WebView drag distance so unconsumed scroll can move the sheet.
 *
 * Once a move is handed to the sheet, the sheet owns the pointer stream until it reaches its expanded position.
 * Further upward movement in the same gesture is released back to WebView for scrolling.
 */
@SuppressLint("ClickableViewAccessibility")
internal fun BaseWebView.installBottomSheetScrollHandoff(sheet: CheckoutBottomSheetLayout) {
    var lastLocalY = 0f
    var lastRawY = 0f
    var lastWebViewLocalY = 0f
    var lastWebViewRawY = 0f
    var lastSheetConsumedLocalY = 0f
    var lastSheetConsumedRawY = 0f
    var sheetOwnedMoveCount = 0
    var handoffReleaseCount = 0
    var releaseLocalY = 0f
    var releaseRawY = 0f
    var releaseScrollY = 0
    var releaseScrollLogsRemaining = 0
    var logNextReleasedMove = false
    var sheetOwnsGesture = false
    var syntheticWebViewStreamActive = false
    var syntheticWebViewDownTime = 0L
    var syntheticWebViewLocalY = 0f

    setOnScrollChangeListener { _, _, scrollY, _, oldScrollY ->
        if (releaseScrollLogsRemaining > 0) {
            releaseScrollLogsRemaining -= 1
            logDragDiagnostics {
                "handoff-release-scroll " +
                    "id=$handoffReleaseCount " +
                    "scrollY=$oldScrollY->$scrollY " +
                    "deltaSinceRelease=${scrollY - releaseScrollY} " +
                    "sheetTop=${sheet.top}"
            }
        }
    }

    setOnTouchListener { view, event ->
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastLocalY = event.y
                lastRawY = event.rawY
                lastWebViewLocalY = event.y
                lastWebViewRawY = event.rawY
                lastSheetConsumedLocalY = event.y
                lastSheetConsumedRawY = event.rawY
                sheetOwnedMoveCount = 0
                releaseLocalY = event.y
                releaseRawY = event.rawY
                releaseScrollY = view.scrollY
                releaseScrollLogsRemaining = 0
                logNextReleasedMove = false
                sheetOwnsGesture = false
                syntheticWebViewStreamActive = false
                syntheticWebViewDownTime = 0L
                syntheticWebViewLocalY = event.y
                sheet.startScrollableChildGesture(event)
                view.parent?.requestDisallowInterceptTouchEvent(true)
                false
            }

            MotionEvent.ACTION_MOVE -> {
                val localDragDistance = event.y - lastLocalY
                val dragDistance = event.rawY - lastRawY
                lastLocalY = event.y
                lastRawY = event.rawY
                var forceConsumeMove = false
                if (syntheticWebViewStreamActive) {
                    val canScrollUp = view.canScrollVertically(SCROLL_UP_DIRECTION)
                    if (dragDistance <= 0f || canScrollUp) {
                        val webViewDragDistance = event.y - syntheticWebViewLocalY
                        if (logNextReleasedMove) {
                            logDragDiagnostics {
                                "handoff-resume-move " +
                                    "id=$handoffReleaseCount " +
                                    "localDySinceRelease=${(event.y - releaseLocalY).formatForDragLog()} " +
                                    "rawDySinceRelease=${(event.rawY - releaseRawY).formatForDragLog()} " +
                                    "localDy=${localDragDistance.formatForDragLog()} " +
                                    "rawDy=${dragDistance.formatForDragLog()} " +
                                    "webViewDy=${webViewDragDistance.formatForDragLog()} " +
                                    "canScrollUp=$canScrollUp " +
                                    "webScrollY=${view.scrollY}"
                            }
                            logNextReleasedMove = false
                        }
                        if (webViewDragDistance != 0f) {
                            syntheticWebViewLocalY += webViewDragDistance
                            view.sendSyntheticTouch(
                                event = event,
                                action = MotionEvent.ACTION_MOVE,
                                reason = "handoff-forward",
                                downTime = syntheticWebViewDownTime,
                                localY = syntheticWebViewLocalY,
                            )
                        }
                        view.parent?.requestDisallowInterceptTouchEvent(true)
                        return@setOnTouchListener true
                    }
                    view.sendSyntheticTouch(
                        event = event,
                        action = MotionEvent.ACTION_CANCEL,
                        reason = "handoff-back-to-sheet",
                        downTime = syntheticWebViewDownTime,
                        localY = syntheticWebViewLocalY,
                    )
                    logDragDiagnostics {
                        "handoff-back-to-sheet " +
                            "id=$handoffReleaseCount " +
                            "localDy=${localDragDistance.formatForDragLog()} " +
                            "rawDy=${dragDistance.formatForDragLog()} " +
                            "webScrollY=${view.scrollY}"
                    }
                    syntheticWebViewStreamActive = false
                    logNextReleasedMove = false
                    forceConsumeMove = true
                }
                val canScrollUp = view.canScrollVertically(SCROLL_UP_DIRECTION)
                val wasSheetOwned = sheetOwnsGesture
                val dragResult = when {
                    dragDistance > 0f -> sheet.dragScrollableChildBy(
                        view.unconsumedDownwardDragDistance(dragDistance, canScrollUp),
                        event,
                    )
                    dragDistance < 0f -> sheet.dragScrollableChildBy(dragDistance, event)
                    else -> ScrollableChildDragResult(
                        consumed = false,
                        reachedExpanded = false,
                        unconsumedDragDistance = 0f,
                    )
                }
                var consumeMove = dragResult.consumed || forceConsumeMove
                if (wasSheetOwned && dragResult.reachedExpanded && dragDistance < 0f) {
                    handoffReleaseCount += 1
                    releaseLocalY = event.y
                    releaseRawY = event.rawY
                    releaseScrollY = view.scrollY
                    releaseScrollLogsRemaining = RELEASE_SCROLL_LOG_COUNT
                    logNextReleasedMove = true
                    sheetOwnedMoveCount += 1
                    logDragDiagnostics {
                        "handoff-release-split " +
                            "id=$handoffReleaseCount " +
                            "sheetOwnedMoves=$sheetOwnedMoveCount " +
                            "localDy=${localDragDistance.formatForDragLog()} " +
                            "rawDy=${dragDistance.formatForDragLog()} " +
                            "unconsumedDy=${dragResult.unconsumedDragDistance.formatForDragLog()} " +
                            "rawDeltaSinceWebView=${(event.rawY - lastWebViewRawY).formatForDragLog()} " +
                            "localDeltaSinceWebView=${(event.y - lastWebViewLocalY).formatForDragLog()} " +
                            "rawDeltaSinceSheet=${(event.rawY - lastSheetConsumedRawY).formatForDragLog()} " +
                            "localDeltaSinceSheet=${(event.y - lastSheetConsumedLocalY).formatForDragLog()} " +
                            "sheetTop=${sheet.top} " +
                            "sheetTranslationY=${sheet.translationY.formatForDragLog()} " +
                            "webScrollY=${view.scrollY}"
                    }
                    syntheticWebViewDownTime = event.eventTime
                    syntheticWebViewLocalY = event.y
                    view.sendSyntheticTouch(
                        event = event,
                        action = MotionEvent.ACTION_DOWN,
                        reason = "handoff-release",
                        downTime = syntheticWebViewDownTime,
                        localY = syntheticWebViewLocalY,
                    )
                    sheetOwnsGesture = false
                    syntheticWebViewStreamActive = true
                    consumeMove = true
                } else if (dragResult.consumed) {
                    if (!wasSheetOwned) {
                        view.sendSyntheticTouch(event, MotionEvent.ACTION_CANCEL, "sheet-takeover")
                    }
                    sheetOwnsGesture = true
                    sheetOwnedMoveCount += 1
                    lastSheetConsumedLocalY = event.y
                    lastSheetConsumedRawY = event.rawY
                }
                view.parent?.requestDisallowInterceptTouchEvent(true)
                if (!consumeMove) {
                    lastWebViewLocalY = event.y
                    lastWebViewRawY = event.rawY
                }
                consumeMove
            }

            MotionEvent.ACTION_CANCEL -> {
                if (syntheticWebViewStreamActive) {
                    view.sendSyntheticTouch(
                        event = event,
                        action = MotionEvent.ACTION_CANCEL,
                        reason = "handoff-forward",
                        downTime = syntheticWebViewDownTime,
                        localY = syntheticWebViewLocalY,
                    )
                }
                sheet.finishScrollableChildGesture(cancelled = true)
                view.parent?.requestDisallowInterceptTouchEvent(false)
                val wasSheetOwned = sheetOwnsGesture || syntheticWebViewStreamActive
                sheetOwnsGesture = false
                syntheticWebViewStreamActive = false
                logDragDiagnostics { "handoff-cancel wasSheetOwned=$wasSheetOwned" }
                wasSheetOwned
            }

            MotionEvent.ACTION_UP -> {
                if (syntheticWebViewStreamActive) {
                    view.sendSyntheticTouch(
                        event = event,
                        action = MotionEvent.ACTION_UP,
                        reason = "handoff-forward",
                        downTime = syntheticWebViewDownTime,
                        localY = syntheticWebViewLocalY,
                    )
                }
                sheet.finishScrollableChildGesture()
                view.parent?.requestDisallowInterceptTouchEvent(false)
                val wasSheetOwned = sheetOwnsGesture || syntheticWebViewStreamActive
                sheetOwnsGesture = false
                syntheticWebViewStreamActive = false
                logDragDiagnostics { "handoff-up wasSheetOwned=$wasSheetOwned" }
                wasSheetOwned
            }

            else -> sheetOwnsGesture
        }
    }
}

/**
 * Returns downward drag only after the WebView has reached the top of its scroll range.
 */
private fun View.unconsumedDownwardDragDistance(dragDistance: Float, canScrollUp: Boolean): Float {
    return if (canScrollUp) 0f else dragDistance
}

private fun View.sendSyntheticTouch(
    event: MotionEvent,
    action: Int,
    reason: String,
    downTime: Long = event.downTime,
    localY: Float = event.y,
) {
    val syntheticEvent = MotionEvent.obtain(
        downTime,
        event.eventTime,
        action,
        event.x,
        localY,
        event.metaState,
    ).apply {
        source = event.source
        edgeFlags = event.edgeFlags
    }
    if (action != MotionEvent.ACTION_MOVE) {
        logDragDiagnostics {
            "synthetic-touch " +
                "reason=$reason " +
                "action=${syntheticEvent.actionForDragLog()} " +
                "eventY=${syntheticEvent.y.formatForDragLog()} " +
                "rawY=${syntheticEvent.rawY.formatForDragLog()} " +
                "localY=${localY.formatForDragLog()}"
        }
    }
    onTouchEvent(syntheticEvent)
    syntheticEvent.recycle()
}

private const val RELEASE_SCROLL_LOG_COUNT = 2
private const val SCROLL_UP_DIRECTION = -1
