package com.shopify.checkoutkit

import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.graphics.Color
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.ComponentDialog
import androidx.annotation.ColorInt
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import kotlin.math.roundToInt

internal class CheckoutBottomSheet(
    private val checkoutUrl: String,
    private val checkoutListener: CheckoutListener,
    private val activity: ComponentActivity,
    private val protocolClient: CheckoutProtocol.Client? = null,
    private val webMessageTransport: WebMessageTransport = WebMessageListenerTransport,
) : ComponentDialog(activity, R.style.CheckoutKitBottomSheetDialog) {

    private var presentedCheckoutView: ShopifyCheckout? = null
    private var dismissNotified = false
    private var dismissing = false
    private var dismissFinalized = false

    /**
     * Invoked once when this sheet reaches its terminal dismissal state, before the dialog window
     * is torn down. Lets the presenter release per-presentation resources on every dismissal path.
     */
    internal var onDismissFinalized: (() -> Unit)? = null

    /**
     * Inflates, configures, and shows the bottom sheet around shared checkout content.
     *
     * @return `true` when the sheet is showing; `false` when checkout could not be initialized.
     */
    fun start(): Boolean {
        log.d(LOG_TAG, "Start called.")
        if (isShowing) {
            log.d(LOG_TAG, "Already showing, ignoring start.")
            return true
        }

        dismissNotified = false
        dismissing = false
        dismissFinalized = false

        setContentView(R.layout.checkout_sheet_content)
        val appearance = ShopifyCheckoutKit.configuration.appearance
        val colorScheme = appearance.effectiveColorScheme
        val sheet = ShopifyCheckoutKit.configuration.sheet
        window?.configureCheckoutBottomSheetWindow()
        configureSheet(sheet, colorScheme)

        log.d(LOG_TAG, "Configured appearance $appearance")
        log.d(LOG_TAG, "Finding or creating checkout view.")
        val checkoutView = ShopifyCheckout(
            context = activity,
            checkoutUrl = checkoutUrl,
            webMessageTransport = webMessageTransport,
            hostConfiguration = CheckoutHostConfiguration(
                listener = checkoutListener,
                protocolClient = protocolClient,
                onDismissRequest = ::dismissedByBuyer,
                onFailure = ::closeCheckoutWithError,
                reportInitializationFailure = false,
            ),
        )
        presentedCheckoutView = checkoutView
        val initializationError = checkoutView.initializationError
        if (initializationError != null) {
            log.w(LOG_TAG, "WebView is not supported, failing checkout presentation.")
            checkoutListener.onCheckoutFailed(initializationError)
            checkoutView.destroy()
            presentedCheckoutView = null
        } else {
            checkoutView.configureForBottomSheet(sheet)
            addCheckoutViewToContainer(checkoutView)
            checkoutView.resumeForPresentation()
            show()
            // Dialog.show() can apply default window sizing and decor flags after the initial configuration.
            window?.setCheckoutBottomSheetWindowLayout()
            window?.setTransparentSystemBars(navigationBackgroundColor = checkoutView.webViewBackgroundColor)
            findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.animateIn()
            focusCloseButtonForAccessibility(activity)
            log.d(LOG_TAG, "Shown.")
        }

        return initializationError == null
    }

    /**
     * Wires native sheet dismissal affordances after the layout has been inflated.
     */
    private fun configureSheet(sheet: CheckoutSheetOptions, colorScheme: ColorScheme) {
        findViewById<View>(R.id.checkoutKitOutsideTouchTarget)?.apply {
            setBackgroundColor(sheet.scrimColor.getValue(activity))
            setOnClickListener(
                if (sheet.dismissal.tapAwayToDismissEnabled) {
                    View.OnClickListener {
                        log.d(LOG_TAG, "Outside touch dismissal invoked.")
                        dismissedByBuyer()
                    }
                } else {
                    null
                }
            )
            isClickable = sheet.dismissal.tapAwayToDismissEnabled
        }

        findViewById<View>(R.id.checkoutKitDragHandle)?.applyCheckoutSheetDragHandleStyle(
            color = colorScheme.dragHandleColor(activity.isDarkTheme()).getValue(activity),
            sheet = sheet,
        )

        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.apply {
            val maxWidthDp = sheet.resolveMaxWidthDp(activity)
            if (sheet.maxWidthDp != maxWidthDp) {
                log.w(LOG_TAG, "Invalid maximum sheet width; using the default.")
            }
            maxWidthPx = maxWidthDp.dpToPx(activity).roundToInt()
            dragToDismissEnabled = sheet.dismissal.dragToDismissEnabled
            applySystemBarTopMargin(sheet.snapPoints.single())
            onDismissRequested = {
                if (!dismissing) {
                    log.d(LOG_TAG, "Dismissed by gesture.")
                    dismissAfterSheetDismissAnimation()
                }
            }
        }
    }

    override fun cancel() {
        dismissedByBuyer()
    }

    /**
     * Dismisses checkout in response to a buyer action, notifies the listener once, and uses the
     * normal sheet animation.
     */
    private fun dismissedByBuyer() {
        if (dismissing) return

        notifyCheckoutDismissed()
        dismiss(animate = true)
    }

    /**
     * Dismisses checkout programmatically with the same slide-out animation as native controls.
     */
    override fun dismiss() {
        dismiss(animate = true)
    }

    /**
     * Dismisses the sheet, optionally skipping animation for lifecycle teardown.
     */
    internal fun dismiss(animate: Boolean) {
        val sheet = findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)
        if (dismissing) {
            if (!animate && !dismissFinalized) {
                sheet?.animate()?.cancel()
                sheet?.onDismissRequested = null
                finishDismiss()
            }
            return
        }

        log.d(LOG_TAG, "Dismiss invoked.")
        dismissing = true
        sheet?.onDismissRequested = null
        if (!animate || !isShowing || sheet == null) {
            sheet?.animate()?.cancel()
            finishDismiss()
            return
        }

        sheet.animateDismiss { finishDismiss() }
    }

    /**
     * Completes a gesture dismissal after the sheet view has already animated off screen.
     */
    private fun dismissAfterSheetDismissAnimation() {
        if (dismissing) return

        notifyCheckoutDismissed()
        dismissing = true
        finishDismiss()
    }

    /**
     * Releases callbacks and WebView resources before dismissing the underlying dialog window.
     */
    private fun finishDismiss() {
        if (dismissFinalized) return

        dismissFinalized = true
        onDismissFinalized?.invoke()
        onDismissFinalized = null
        destroyPresentedCheckoutView()
        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.onDismissRequested = null
        if (!isShowing) return

        try {
            super.dismiss()
        } catch (_: IllegalArgumentException) {
            log.w(LOG_TAG, "Window was already detached before dismissal completed.")
        }
    }

    /**
     * Sends the dismissal callback once across close button, back, outside touch, and gesture paths.
     */
    private fun notifyCheckoutDismissed() {
        if (!dismissNotified) {
            log.d(LOG_TAG, "Dismissal invoked, invoking onCheckoutDismissed.")
            dismissNotified = true
            checkoutListener.onCheckoutDismissed()
        }
    }

    /**
     * Releases checkout content retained for this presentation.
     */
    private fun destroyPresentedCheckoutView() {
        presentedCheckoutView?.let { checkoutView ->
            log.d(LOG_TAG, "Releasing presented checkout view.")
            checkoutView.destroy()
            presentedCheckoutView = null
        }
    }

    /**
     * Attaches checkout content and connects its WebView to sheet scroll handoff.
     */
    private fun addCheckoutViewToContainer(checkoutView: ShopifyCheckout) {
        findViewById<FrameLayout>(R.id.checkoutKitViewContainer)?.apply {
            addView(checkoutView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        checkoutView.applyBottomInsetPadding()
        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.let { sheet ->
            checkoutView.bindToBottomSheet(sheet)
        }
    }

    /**
     * Reports checkout failure to the consumer and closes the presentation.
     */
    internal fun closeCheckoutWithError(exception: CheckoutException) {
        log.d(LOG_TAG, "Closing with error, calling onCheckoutFailed.")
        checkoutListener.onCheckoutFailed(exception)
        dismiss()
    }
}

/**
 * Returns whether the activity is currently resolving night-mode resources.
 */
private fun ComponentActivity.isDarkTheme() =
    resources.configuration.uiMode and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES

/**
 * Keeps the requested window top margin while preventing the sheet from overlapping the status bar.
 */
private fun View.applySystemBarTopMargin(snapPoint: CheckoutSheetSnapPoint) {
    val initialLayoutParams = layoutParams as? ViewGroup.MarginLayoutParams ?: return
    val initialBottomMargin = initialLayoutParams.bottomMargin
    updateVerticalMargins(topMargin = snapPoint.resolveTopMarginPx(this), bottomMargin = initialBottomMargin)
    ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
        val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        view.updateVerticalMargins(
            topMargin = snapPoint.resolveTopMarginPx(view, systemBars.top),
            bottomMargin = initialBottomMargin,
        )
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

/**
 * Updates vertical margins only when they change, preserving configured sheet margins around inset updates.
 */
private fun View.updateVerticalMargins(topMargin: Int, bottomMargin: Int) {
    val marginLayoutParams = layoutParams as? ViewGroup.MarginLayoutParams ?: return
    if (marginLayoutParams.topMargin == topMargin && marginLayoutParams.bottomMargin == bottomMargin) return

    marginLayoutParams.topMargin = topMargin
    marginLayoutParams.bottomMargin = bottomMargin
    layoutParams = marginLayoutParams
}

/**
 * Configures the dialog window as a full-screen edge-to-edge host for the inner bottom sheet.
 *
 * `ADJUST_RESIZE` is kept so WebView form fields can scroll above the keyboard when focused.
 */
private fun Window.configureCheckoutBottomSheetWindow() {
    setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
    setGravity(Gravity.BOTTOM)
    setCheckoutBottomSheetWindowLayout()
    setTransparentSystemBars()
    WindowCompat.setDecorFitsSystemWindows(this, false)
    @Suppress("DEPRECATION")
    setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
    clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    attributes = attributes.apply {
        dimAmount = 0f
        windowAnimations = 0
    }
}

/**
 * Gives the dialog window the full screen so the inner sheet layout controls visible height and top margin.
 */
private fun Window.setCheckoutBottomSheetWindowLayout() {
    setLayout(MATCH_PARENT, MATCH_PARENT)
}

/**
 * Makes system bars transparent while retaining contrast for 3-button navigation controls.
 */
@Suppress("DEPRECATION")
private fun Window.setTransparentSystemBars(@ColorInt navigationBackgroundColor: Int? = null) {
    val shouldUseDarkNavigationButtons = navigationBackgroundColor?.let { backgroundColor ->
        ColorUtils.calculateLuminance(backgroundColor) > LIGHT_COLOR_LUMINANCE_THRESHOLD
    } ?: false

    statusBarColor = Color.TRANSPARENT
    navigationBarColor = if (shouldUseDarkNavigationButtons && Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        LEGACY_LIGHT_BACKGROUND_NAVIGATION_BAR_COLOR
    } else {
        Color.TRANSPARENT
    }
    if (navigationBackgroundColor != null) {
        WindowCompat.getInsetsController(this, decorView).isAppearanceLightNavigationBars = shouldUseDarkNavigationButtons
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        isNavigationBarContrastEnforced = true
    }
}

private const val LOG_TAG = "CheckoutBottomSheet"
private const val LIGHT_COLOR_LUMINANCE_THRESHOLD = 0.5
private const val LEGACY_LIGHT_BACKGROUND_NAVIGATION_BAR_COLOR = 0x52000000
