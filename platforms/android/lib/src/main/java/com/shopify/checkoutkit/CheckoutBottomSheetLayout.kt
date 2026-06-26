package com.shopify.checkoutkit

import android.content.Context
import android.graphics.Rect
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewTreeObserver
import android.view.animation.PathInterpolator
import android.widget.RelativeLayout
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Custom bottom sheet container that owns open/close animation and drag-to-dismiss behavior.
 */
internal class CheckoutBottomSheetLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : RelativeLayout(context, attrs, defStyleAttr) {

    var onDismissRequested: (() -> Unit)? = null

    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private val minimumFlingVelocity = ViewConfiguration.get(context).scaledMinimumFlingVelocity
    private val childHitRect = Rect()
    private val openInterpolator = PathInterpolator(
        OPEN_INTERPOLATOR_X1,
        OPEN_INTERPOLATOR_Y1,
        OPEN_INTERPOLATOR_X2,
        OPEN_INTERPOLATOR_Y2,
    )
    private val closeInterpolator = PathInterpolator(
        CLOSE_INTERPOLATOR_X1,
        CLOSE_INTERPOLATOR_Y1,
        CLOSE_INTERPOLATOR_X2,
        CLOSE_INTERPOLATOR_Y2,
    )
    private val settleInterpolator = PathInterpolator(
        SETTLE_INTERPOLATOR_X1,
        SETTLE_INTERPOLATOR_Y1,
        SETTLE_INTERPOLATOR_X2,
        SETTLE_INTERPOLATOR_Y2,
    )

    private var scrollableChild: View? = null
    private var velocityTracker: VelocityTracker? = null
    private var openPreDrawListener: ViewTreeObserver.OnPreDrawListener? = null
    private var scrollableChildDragDistance = 0f
    private var downX = 0f
    private var downY = 0f
    private var startDragOffsetY = 0f
    private var dragOffsetY = 0f
    private var renderedDragOffsetY = 0
    private var dragging = false
    private var diagnosticsGestureActive = false
    private var lastDiagnosticsTop = 0
    private var lastDiagnosticsBottom = 0
    private var lastDiagnosticsHeight = 0
    private var lastDiagnosticsTranslationY = 0f
    private var dismissAnimationRunning = false
    private var dismissAnimationEndAction: (() -> Unit)? = null

    /**
     * Registers the content view whose downward scroll should be consumed before the sheet can drag.
     */
    fun bindScrollableChild(child: View) {
        scrollableChild = child
    }

    /**
     * Starts tracking a gesture that began inside the scrollable child.
     */
    fun startScrollableChildGesture(event: MotionEvent) {
        animate().cancel()
        val currentOffsetY = (renderedDragOffsetY + translationY).coerceAtLeast(0f)
        translationY = 0f
        renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, currentOffsetY.roundToInt())
        dragging = false
        scrollableChildDragDistance = 0f
        downX = event.rawX
        downY = event.rawY
        startDragOffsetY = currentOffsetY
        dragOffsetY = currentOffsetY
        startDragDiagnostics("child-start", event)
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain().also { it.addMovement(event) }
    }

    /**
     * Moves the sheet by drag distance the scrollable child hands off.
     */
    fun dragScrollableChildBy(dragDistance: Float, event: MotionEvent): ScrollableChildDragResult {
        val canDrag = isEnabled && !dismissAnimationRunning && dragDistance != 0f
        var sheetDragDistance = 0f
        if (canDrag && dragging) {
            sheetDragDistance = dragDistance
        } else if (canDrag && dragDistance > 0f) {
            scrollableChildDragDistance += dragDistance
            if (scrollableChildDragDistance > touchSlop) {
                dragging = true
                velocityTracker?.clear()
                sheetDragDistance = scrollableChildDragDistance - touchSlop
            }
        }

        var consumedBySheet = false
        var reachedExpanded = false
        var unconsumedDragDistance = 0f
        if (sheetDragDistance != 0f) {
            val previousOffsetY = renderedDragOffsetY
            val previousDragOffsetY = dragOffsetY
            val targetDragOffsetY = previousDragOffsetY + sheetDragDistance
            unconsumedDragDistance = targetDragOffsetY.coerceAtMost(0f)
            dragOffsetY = targetDragOffsetY.coerceAtLeast(0f)
            val nextOffsetY = dragOffsetY.roundToInt()
            val movedSheet = nextOffsetY != previousOffsetY
            if (movedSheet) {
                renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, nextOffsetY)
            }
            reachedExpanded = sheetDragDistance < 0f && nextOffsetY == 0
            if (reachedExpanded) {
                dragOffsetY = 0f
                dragging = false
                scrollableChildDragDistance = 0f
            }
            consumedBySheet = movedSheet || sheetDragDistance != unconsumedDragDistance
            if (consumedBySheet) {
                velocityTracker?.addMovement(event)
            }
        }

        updateLastDiagnosticsState()

        return ScrollableChildDragResult(
            consumed = consumedBySheet,
            reachedExpanded = reachedExpanded,
            unconsumedDragDistance = unconsumedDragDistance,
        )
    }

    /**
     * Settles or dismisses the sheet after a gesture that began inside the scrollable child.
     */
    fun finishScrollableChildGesture(cancelled: Boolean = false) {
        if (dragging) {
            if (cancelled) {
                settleExpanded()
            } else {
                settleAfterDrag(
                    distanceThreshold = DISMISS_DISTANCE_THRESHOLD,
                    allowVelocityDismiss = true,
                )
            }
        }
        scrollableChildDragDistance = 0f
        finishGesture()
    }

    /**
     * Runs the opening animation once the sheet has been measured.
     */
    fun animateIn() {
        animate().cancel()
        if (height > 0) {
            startOpeningAnimation()
            return
        }

        visibility = INVISIBLE
        openPreDrawListener = ViewTreeObserver.OnPreDrawListener {
            openPreDrawListener?.let { listener ->
                if (viewTreeObserver.isAlive) {
                    viewTreeObserver.removeOnPreDrawListener(listener)
                }
            }
            openPreDrawListener = null
            startOpeningAnimation()
            true
        }
        viewTreeObserver.addOnPreDrawListener(openPreDrawListener)
    }

    /**
     * Slides the sheet off-screen and invokes the end callback exactly once.
     */
    fun animateDismiss(onAnimationEnd: () -> Unit) {
        fun finishDismissAnimation() {
            dismissAnimationRunning = false
            val endAction = dismissAnimationEndAction
            dismissAnimationEndAction = null
            endAction?.invoke()
        }

        dismissAnimationEndAction = onAnimationEnd
        if (dismissAnimationRunning) return

        dismissAnimationRunning = true
        animate().cancel()
        removeOpenPreDrawListener(viewTreeObserver, openPreDrawListener)
        openPreDrawListener = null
        renderedDragOffsetY = materializeTopOffsetAsTranslation(renderedDragOffsetY)
        dragOffsetY = translationY
        val targetTranslation = height.takeIf { it > 0 }?.toFloat()
        if (targetTranslation == null) {
            finishDismissAnimation()
            return
        }

        animate()
            .translationY(targetTranslation)
            .setDuration(DISMISS_ANIMATION_DURATION_MS)
            .setInterpolator(closeInterpolator)
            .withEndAction {
                finishDismissAnimation()
            }
            .start()
    }

    /**
     * Intercepts downward drags that start outside the scrollable child so they can move the sheet.
     */
    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        if (!isEnabled || dismissAnimationRunning) return false

        var shouldIntercept = false
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                resetGesture(event)
            }

            MotionEvent.ACTION_MOVE -> {
                val dragY = event.rawY - downY
                val dragX = event.rawX - downX
                if (dragY > touchSlop && abs(dragY) > abs(dragX)) {
                    val shouldHandleDownwardDrag = shouldHandleDownwardDrag(event)
                    if (shouldHandleDownwardDrag) {
                        dragging = true
                        parent?.requestDisallowInterceptTouchEvent(true)
                        shouldIntercept = true
                    }
                }
            }

            MotionEvent.ACTION_CANCEL,
            MotionEvent.ACTION_UP -> {
                finishGesture()
            }
        }

        return shouldIntercept
    }

    /**
     * Handles direct sheet drags and settles to either the expanded or dismissed position.
     */
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!isEnabled || dismissAnimationRunning) return false

        velocityTracker?.addMovement(event)

        var handled = true
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                resetGesture(event)
            }

            MotionEvent.ACTION_MOVE -> {
                val dragY = event.rawY - downY
                if (!dragging && dragY > touchSlop && shouldHandleDownwardDrag(event)) {
                    dragging = true
                    parent?.requestDisallowInterceptTouchEvent(true)
                }

                if (dragging) {
                    dragOffsetY = (startDragOffsetY + dragY).coerceAtLeast(0f)
                    renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, dragOffsetY.roundToInt())
                } else {
                    handled = super.onTouchEvent(event)
                }
                updateLastDiagnosticsState()
            }

            MotionEvent.ACTION_UP -> {
                if (dragging) {
                    settleAfterDrag()
                }
                finishGesture()
            }

            MotionEvent.ACTION_CANCEL -> {
                settleExpanded()
                finishGesture()
            }

            else -> handled = super.onTouchEvent(event)
        }

        return handled
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        if (
            diagnosticsGestureActive &&
            (
                this.top != lastDiagnosticsTop ||
                    this.bottom != lastDiagnosticsBottom ||
                    height != lastDiagnosticsHeight ||
                    translationY != lastDiagnosticsTranslationY
                )
        ) {
            logDragDiagnostics {
                "layout-pass " +
                    "changed=$changed " +
                    "bounds=($left,$top,$right,$bottom) " +
                    "viewTop=${lastDiagnosticsTop}->${this.top} " +
                    "viewBottom=${lastDiagnosticsBottom}->${this.bottom} " +
                    "height=${lastDiagnosticsHeight}->${height} " +
                    "translationY=${lastDiagnosticsTranslationY.formatForDragLog()}->" +
                    translationY.formatForDragLog() +
                    " dragOffset=${dragOffsetY.formatForDragLog()} " +
                    "renderedOffset=$renderedDragOffsetY"
            }
            updateLastDiagnosticsState()
        }
    }

    /**
     * Releases gesture and pre-draw resources when the dialog window is torn down.
     */
    override fun onDetachedFromWindow() {
        removeOpenPreDrawListener(viewTreeObserver, openPreDrawListener)
        openPreDrawListener = null
        velocityTracker?.recycle()
        velocityTracker = null
        super.onDetachedFromWindow()
    }

    /**
     * Resets drag tracking for a new pointer sequence.
     */
    private fun resetGesture(event: MotionEvent) {
        animate().cancel()
        val currentOffsetY = (renderedDragOffsetY + translationY).coerceAtLeast(0f)
        translationY = 0f
        renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, currentOffsetY.roundToInt())
        dragging = false
        downX = event.rawX
        downY = event.rawY
        startDragOffsetY = currentOffsetY
        dragOffsetY = currentOffsetY
        startDragDiagnostics("direct-start", event)
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain().also { it.addMovement(event) }
    }

    /**
     * Clears drag state and lets parent views intercept future gestures again.
     */
    private fun finishGesture() {
        logDragDiagnostics {
            "finish " +
                "top=$top " +
                "translationY=${translationY.formatForDragLog()} " +
                "height=$height " +
                "dragOffset=${dragOffsetY.formatForDragLog()} " +
                "renderedOffset=$renderedDragOffsetY"
        }
        diagnosticsGestureActive = false
        dragging = false
        parent?.requestDisallowInterceptTouchEvent(false)
        velocityTracker?.recycle()
        velocityTracker = null
    }

    /**
     * Chooses whether a completed drag should dismiss the sheet or settle it back open.
     */
    private fun settleAfterDrag(
        distanceThreshold: Float = DISMISS_DISTANCE_THRESHOLD,
        allowVelocityDismiss: Boolean = true,
    ) {
        velocityTracker?.computeCurrentVelocity(MILLIS_PER_SECOND)
        val velocityY = velocityTracker?.yVelocity ?: 0f
        val sheetOffsetY = (renderedDragOffsetY + translationY).coerceAtLeast(0f)
        val shouldDismiss = sheetOffsetY > height * distanceThreshold ||
            (allowVelocityDismiss && velocityY > minimumFlingVelocity * FLING_VELOCITY_MULTIPLIER)

        if (shouldDismiss) {
            animateDismiss { onDismissRequested?.invoke() }
        } else {
            settleExpanded()
        }
    }

    /**
     * Animates the sheet back to its fully expanded position.
     */
    private fun settleExpanded() {
        renderedDragOffsetY = materializeTopOffsetAsTranslation(renderedDragOffsetY)
        dragOffsetY = 0f
        animate()
            .translationY(0f)
            .setDuration(SETTLE_ANIMATION_DURATION_MS)
            .setInterpolator(settleInterpolator)
            .start()
    }

    /**
     * Starts the slide-up animation from the measured sheet height.
     */
    private fun startOpeningAnimation() {
        renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, 0)
        dragOffsetY = 0f
        translationY = height.toFloat()
        visibility = VISIBLE
        animate()
            .translationY(0f)
            .setDuration(OPEN_ANIMATION_DURATION_MS)
            .setInterpolator(openInterpolator)
            .start()
    }

    /**
     * Returns true when a downward drag is outside the scrollable child and should move the sheet.
     */
    private fun shouldHandleDownwardDrag(event: MotionEvent): Boolean {
        val child = scrollableChild
        var shouldHandle = false
        if (child == null) {
            childHitRect.setEmpty()
        } else {
            if (child.width <= 0 || child.height <= 0 || child.parent == null) {
                childHitRect.setEmpty()
            } else {
                childHitRect.set(0, 0, child.width, child.height)
                offsetDescendantRectToMyCoords(child, childHitRect)
                shouldHandle = !childHitRect.contains(event.x.toInt(), event.y.toInt())
            }
        }

        return shouldHandle
    }

    private fun startDragDiagnostics(source: String, event: MotionEvent) {
        diagnosticsGestureActive = true
        updateLastDiagnosticsState()
        logDragDiagnostics {
            "$source " +
                "eventY=${event.y.formatForDragLog()} " +
                "rawY=${event.rawY.formatForDragLog()} " +
                "top=$top " +
                "translationY=${translationY.formatForDragLog()} " +
                "height=$height " +
                "dragOffset=${dragOffsetY.formatForDragLog()} " +
                "renderedOffset=$renderedDragOffsetY"
        }
    }

    private fun updateLastDiagnosticsState() {
        lastDiagnosticsTop = top
        lastDiagnosticsBottom = bottom
        lastDiagnosticsHeight = height
        lastDiagnosticsTranslationY = translationY
    }

    private companion object {
        private const val OPEN_ANIMATION_DURATION_MS = 260L
        private const val DISMISS_ANIMATION_DURATION_MS = 200L
        private const val SETTLE_ANIMATION_DURATION_MS = 180L
        private const val DISMISS_DISTANCE_THRESHOLD = 0.28f
        private const val FLING_VELOCITY_MULTIPLIER = 4
        private const val MILLIS_PER_SECOND = 1000

        private const val OPEN_INTERPOLATOR_X1 = 0.05f
        private const val OPEN_INTERPOLATOR_Y1 = 0.7f
        private const val OPEN_INTERPOLATOR_X2 = 0.1f
        private const val OPEN_INTERPOLATOR_Y2 = 1f
        private const val CLOSE_INTERPOLATOR_X1 = 0.3f
        private const val CLOSE_INTERPOLATOR_Y1 = 0f
        private const val CLOSE_INTERPOLATOR_X2 = 0.8f
        private const val CLOSE_INTERPOLATOR_Y2 = 0.15f
        private const val SETTLE_INTERPOLATOR_X1 = 0.2f
        private const val SETTLE_INTERPOLATOR_Y1 = 0f
        private const val SETTLE_INTERPOLATOR_X2 = 0f
        private const val SETTLE_INTERPOLATOR_Y2 = 1f
    }
}

internal data class ScrollableChildDragResult(
    val consumed: Boolean,
    val reachedExpanded: Boolean,
    val unconsumedDragDistance: Float,
)

internal inline fun logDragDiagnostics(message: () -> String) {
    if (ShopifyCheckoutKit.configuration.logLevel == LogLevel.DEBUG) {
        LogWrapper().d(DRAG_LOG_TAG, message())
    }
}

internal fun Float.formatForDragLog(): String =
    String.format(Locale.US, "%.1f", this)

internal fun MotionEvent.actionForDragLog(): String =
    when (actionMasked) {
        MotionEvent.ACTION_DOWN -> "DOWN"
        MotionEvent.ACTION_MOVE -> "MOVE"
        MotionEvent.ACTION_UP -> "UP"
        MotionEvent.ACTION_CANCEL -> "CANCEL"
        else -> actionMasked.toString()
    }

private const val DRAG_DIAGNOSTICS_ENABLED = true
private const val DRAG_LOG_TAG = "CheckoutSheetDrag"

private fun View.offsetTopAndBottomTo(currentOffsetY: Int, targetOffsetY: Int): Int {
    val deltaY = targetOffsetY - currentOffsetY
    if (deltaY != 0) {
        offsetTopAndBottom(deltaY)
    }
    return targetOffsetY
}

private fun View.materializeTopOffsetAsTranslation(currentOffsetY: Int): Int {
    if (currentOffsetY != 0) {
        translationY += currentOffsetY
        offsetTopAndBottom(-currentOffsetY)
    }
    return 0
}

/**
 * Removes a pending opening pre-draw listener if the view tree observer is still valid.
 */
private fun removeOpenPreDrawListener(
    viewTreeObserver: ViewTreeObserver,
    listener: ViewTreeObserver.OnPreDrawListener?,
) {
    if (listener != null && viewTreeObserver.isAlive) {
        viewTreeObserver.removeOnPreDrawListener(listener)
    }
}
