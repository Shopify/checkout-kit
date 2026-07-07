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
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Custom bottom sheet container that owns open/close animation and drag-to-dismiss behavior.
 */
@Suppress("TooManyFunctions")
internal class CheckoutBottomSheetLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : RelativeLayout(context, attrs, defStyleAttr) {

    var onDismissRequested: (() -> Unit)? = null

    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private val minimumFlingVelocity = ViewConfiguration.get(context).scaledMinimumFlingVelocity
    private val childHitRect = Rect()
    private val openInterpolator = OpenInterpolator.create()
    private val closeInterpolator = CloseInterpolator.create()
    private val settleInterpolator = SettleInterpolator.create()

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
    private var gestureStartedOutsideScrollableChild = false
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
        gestureStartedOutsideScrollableChild = false
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain().also { it.addMovement(event) }
    }

    /**
     * Moves the sheet by drag distance the scrollable child hands off.
     */
    fun dragScrollableChildBy(dragDistance: Float, event: MotionEvent): Boolean {
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
        if (sheetDragDistance != 0f) {
            val previousOffsetY = renderedDragOffsetY
            val previousDragOffsetY = dragOffsetY
            val targetDragOffsetY = previousDragOffsetY + sheetDragDistance
            val unconsumedDragDistance = targetDragOffsetY.coerceAtMost(0f)
            dragOffsetY = targetDragOffsetY.coerceAtLeast(0f)
            val nextOffsetY = dragOffsetY.roundToInt()
            val movedSheet = nextOffsetY != previousOffsetY
            if (movedSheet) {
                renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, nextOffsetY)
            }
            val reachedExpanded = sheetDragDistance < 0f && nextOffsetY == 0
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

        return consumedBySheet
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
                    if (gestureStartedOutsideScrollableChild) {
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
                if (!dragging && dragY > touchSlop && gestureStartedOutsideScrollableChild) {
                    dragging = true
                    parent?.requestDisallowInterceptTouchEvent(true)
                }

                if (dragging) {
                    dragOffsetY = (startDragOffsetY + dragY).coerceAtLeast(0f)
                    renderedDragOffsetY = offsetTopAndBottomTo(renderedDragOffsetY, dragOffsetY.roundToInt())
                } else {
                    handled = super.onTouchEvent(event)
                }
            }

            MotionEvent.ACTION_UP -> {
                if (dragging) {
                    settleAfterDrag()
                } else {
                    performClick()
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

    override fun performClick(): Boolean {
        return super.performClick()
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
        gestureStartedOutsideScrollableChild = isOutsideScrollableChild(event)
        velocityTracker?.recycle()
        velocityTracker = VelocityTracker.obtain().also { it.addMovement(event) }
    }

    /**
     * Clears drag state and lets parent views intercept future gestures again.
     */
    private fun finishGesture() {
        dragging = false
        gestureStartedOutsideScrollableChild = false
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
     * Returns true when this pointer event is outside the scrollable child.
     */
    private fun isOutsideScrollableChild(event: MotionEvent): Boolean {
        val child = scrollableChild
        return if (child?.isReadyForHitTesting() != true) {
            childHitRect.setEmpty()
            false
        } else {
            val hasVisibleBounds = child.getGlobalVisibleRect(childHitRect)
            val outsideScrollableChild = hasVisibleBounds &&
                !childHitRect.contains(event.rawX.roundToInt(), event.rawY.roundToInt())
            outsideScrollableChild
        }
    }

    private companion object {
        private const val OPEN_ANIMATION_DURATION_MS = 260L
        private const val DISMISS_ANIMATION_DURATION_MS = 200L
        private const val SETTLE_ANIMATION_DURATION_MS = 180L
        private const val DISMISS_DISTANCE_THRESHOLD = 0.28f
        private const val FLING_VELOCITY_MULTIPLIER = 4
        private const val MILLIS_PER_SECOND = 1000

        private object OpenInterpolator {
            private const val X1 = 0.05f
            private const val Y1 = 0.7f
            private const val X2 = 0.1f
            private const val Y2 = 1f

            fun create() = PathInterpolator(X1, Y1, X2, Y2)
        }

        private object CloseInterpolator {
            private const val X1 = 0.3f
            private const val Y1 = 0f
            private const val X2 = 0.8f
            private const val Y2 = 0.15f

            fun create() = PathInterpolator(X1, Y1, X2, Y2)
        }

        private object SettleInterpolator {
            private const val X1 = 0.2f
            private const val Y1 = 0f
            private const val X2 = 0f
            private const val Y2 = 1f

            fun create() = PathInterpolator(X1, Y1, X2, Y2)
        }
    }
}

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

private fun View.isReadyForHitTesting(): Boolean =
    width > 0 && height > 0 && parent != null

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
