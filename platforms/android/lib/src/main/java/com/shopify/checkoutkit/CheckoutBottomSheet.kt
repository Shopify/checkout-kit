package com.shopify.checkoutkit

import android.content.res.ColorStateList
import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.graphics.Color
import android.os.Build
import android.view.Gravity
import android.view.MenuItem
import android.view.View
import android.view.View.INVISIBLE
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.Window
import android.view.WindowManager
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.ComponentDialog
import androidx.activity.OnBackPressedCallback
import androidx.annotation.ColorInt
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.children
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

internal class CheckoutBottomSheet(
    private val checkoutUrl: String,
    private val checkoutListener: CheckoutListener,
    private val activity: ComponentActivity,
    private val protocolClient: CheckoutProtocol.Client? = null,
) : ComponentDialog(activity, R.style.CheckoutKitBottomSheetDialog) {

    private var presentedCheckoutWebView: CheckoutWebView? = null
    private var cancelNotified = false
    private var dismissing = false
    private var dismissFinalized = false
    private val progressBar: ProgressBar?
        get() = findViewById(R.id.progressBar)

    private val backNavigationCallback = object : OnBackPressedCallback(enabled = true) {
        override fun handleOnBackPressed() {
            val webView = findViewById<RelativeLayout>(R.id.checkoutKitContainer)
                ?.children?.firstOrNull { it is BaseWebView } as? BaseWebView
            if (webView?.handleBackPressed() != true) {
                log.d(LOG_TAG, "Back press not handled by WebView, cancelling checkout.")
                cancel()
            }
        }
    }

    /**
     * Inflates, configures, and shows the bottom sheet around the retained checkout WebView.
     */
    fun start() {
        log.d(LOG_TAG, "Start called.")
        if (isShowing) {
            log.d(LOG_TAG, "Already showing, ignoring start.")
            return
        }

        cancelNotified = false
        dismissing = false
        dismissFinalized = false

        setContentView(R.layout.checkout_sheet_content)
        val colorScheme = ShopifyCheckoutKit.configuration.colorScheme
        val sheet = ShopifyCheckoutKit.configuration.sheet
        window?.configureCheckoutBottomSheetWindow()
        configureSheet(sheet)

        log.d(LOG_TAG, "Configured colorScheme $colorScheme")
        val sheetColors = applySheetColors(colorScheme, sheet)

        onBackPressedDispatcher.addCallback(backNavigationCallback)

        log.d(LOG_TAG, "Finding or creating WebView.")
        val checkoutWebView = CheckoutWebView.checkoutViewFor(checkoutUrl, activity)
        presentedCheckoutWebView = checkoutWebView

        checkoutWebView.onResume()
        checkoutWebView.markPresented()
        log.d(LOG_TAG, "Setting listener on WebView.")
        checkoutWebView.setListener(webViewListener())
        log.d(LOG_TAG, "Setting protocol client on WebView.")
        checkoutWebView.setClient(protocolClient)

        progressBar?.apply {
            log.d(LOG_TAG, "Setting progress tint.")
            progressTintList = ColorStateList.valueOf(sheetColors.progressIndicatorColor)
            if (checkoutWebView.hasFinishedLoading()) {
                log.d(LOG_TAG, "Page has finished loading, hiding progress bar.")
                this.visibility = INVISIBLE
                hideLoadingBackground()
            }
        }

        addWebViewToContainer(sheetColors.webViewBackgroundColor, checkoutWebView)
        show()
        // Dialog.show() can apply default window sizing and decor flags after the initial configuration.
        window?.setCheckoutBottomSheetWindowLayout()
        window?.setTransparentSystemBars(navigationBackgroundColor = sheetColors.webViewBackgroundColor)
        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.animateIn()
        focusCloseButtonForAccessibility(activity)
        log.d(LOG_TAG, "Shown.")
    }

    /**
     * Applies configured colors to native sheet chrome and returns colors needed by WebView-owned surfaces.
     */
    private fun applySheetColors(
        colorScheme: ColorScheme,
        sheet: CheckoutSheetOptions,
    ): SheetColors {
        val isDarkTheme = activity.isDarkTheme()
        val headerBackgroundColor = colorScheme.headerBackgroundColor(isDarkTheme).getValue(activity)
        val headerFontColor = colorScheme.headerFontColor(isDarkTheme).getValue(activity)
        val webViewBackgroundColor = colorScheme.webViewBackgroundColor(isDarkTheme).getValue(activity)
        val cornerRadiusPx = sheet.cornerRadiusDp.dpToPx(activity)

        findViewById<Toolbar>(R.id.checkoutKitHeader)?.apply {
            log.d(LOG_TAG, "Applying configured header colors and inflating menu.")
            title = ""
            background = roundedTopCornerDrawable(headerBackgroundColor, cornerRadiusPx)
            elevation = sheet.toolbarElevationDp.dpToPx(activity)
            setTitleTextColor(headerFontColor)
            inflateMenu(R.menu.checkout_menu)
            menu.findItem(R.id.shopify_checkout_kit_close_button).setupCloseButton(activity, colorScheme, sheet) {
                cancel()
            }
        }

        findViewById<View>(R.id.checkoutKitDragHandle)?.applyCheckoutSheetDragHandleStyle(
            color = colorScheme.dragHandleColor(isDarkTheme).getValue(activity),
            sheet = sheet,
        )

        findViewById<TextView>(R.id.checkoutKitHeaderTitle)?.apply {
            setTextColor(headerFontColor)
            (layoutParams as? Toolbar.LayoutParams)?.let { params ->
                params.topMargin = if (sheet.showsDragHandle) {
                    resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_title_top_margin)
                } else {
                    0
                }
                params.gravity = when (sheet.titleAlignment) {
                    CheckoutSheetTitleAlignment.START -> Gravity.START or Gravity.CENTER_VERTICAL
                    CheckoutSheetTitleAlignment.CENTER -> Gravity.CENTER
                }
                layoutParams = params
            }
        }

        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.topCornerRadiusPx = cornerRadiusPx

        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            ?.setBackgroundColor(webViewBackgroundColor)

        findViewById<View>(R.id.checkoutKitLoadingBackground)
            ?.setBackgroundColor(webViewBackgroundColor)

        findViewById<View>(R.id.checkoutKitOutsideTouchTarget)
            ?.setBackgroundColor(sheet.scrimColor.getValue(activity))

        return SheetColors(
            webViewBackgroundColor = webViewBackgroundColor,
            progressIndicatorColor = colorScheme.progressIndicatorColor(isDarkTheme).getValue(activity),
        )
    }

    /**
     * Wires native sheet dismissal affordances after the layout has been inflated.
     */
    private fun configureSheet(sheet: CheckoutSheetOptions) {
        findViewById<View>(R.id.checkoutKitOutsideTouchTarget)?.apply {
            setOnClickListener(
                if (sheet.dismissal.tapAwayToDismissEnabled) {
                    View.OnClickListener {
                        log.d(LOG_TAG, "Outside touch cancel invoked.")
                        cancel()
                    }
                } else {
                    null
                }
            )
            isClickable = sheet.dismissal.tapAwayToDismissEnabled
        }

        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.apply {
            dragToDismissEnabled = sheet.dismissal.dragToDismissEnabled
            applySystemBarTopMargin(sheet.snapPoints.single())
            onDismissRequested = {
                if (!dismissing) {
                    log.d(LOG_TAG, "Dismissed by gesture, cancelling checkout.")
                    cancelAfterSheetDismissAnimation()
                }
            }
        }
    }

    /**
     * Cancels checkout, notifies the listener once, and dismisses with the normal sheet animation.
     */
    override fun cancel() {
        if (dismissing) return

        notifyCheckoutCanceled()
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
    private fun cancelAfterSheetDismissAnimation() {
        if (dismissing) return

        notifyCheckoutCanceled()
        dismissing = true
        finishDismiss()
    }

    /**
     * Releases callbacks and WebView resources before dismissing the underlying dialog window.
     */
    private fun finishDismiss() {
        if (dismissFinalized) return

        dismissFinalized = true
        backNavigationCallback.remove()
        destroyPresentedWebView()
        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.onDismissRequested = null
        if (!isShowing) return

        try {
            super.dismiss()
        } catch (_: IllegalArgumentException) {
            log.w(LOG_TAG, "Window was already detached before dismissal completed.")
        }
    }

    /**
     * Sends the cancellation callback once across close button, back, outside touch, and gesture paths.
     */
    private fun notifyCheckoutCanceled() {
        if (!cancelNotified) {
            log.d(LOG_TAG, "Cancel invoked, invoking onCheckoutCanceled.")
            cancelNotified = true
            checkoutListener.onCheckoutCanceled()
        }
    }

    /**
     * Destroys the WebView retained for this presentation so it cannot outlive the host activity.
     */
    private fun destroyPresentedWebView() {
        presentedCheckoutWebView?.let { webView ->
            log.d(LOG_TAG, "Destroying presented WebView.")
            webView.removeFromParent()
            webView.destroy()
            presentedCheckoutWebView = null
        }
    }

    /**
     * Attaches the checkout WebView below native chrome and connects scroll handoff to the sheet container.
     */
    private fun addWebViewToContainer(
        @ColorInt webViewBackgroundColor: Int,
        checkoutWebView: BaseWebView,
    ) {
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)?.apply {
            log.d(LOG_TAG, "Found parent view, setting its colors and layout params.")
            setBackgroundColor(webViewBackgroundColor)
            applyBottomInsetPadding()
            val layoutParams = RelativeLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
            checkoutWebView.removeFromParent()
            checkoutWebView.setBackgroundColor(webViewBackgroundColor)
            this@CheckoutBottomSheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.let { sheet ->
                sheet.bindScrollableChild(checkoutWebView)
                checkoutWebView.installBottomSheetScrollHandoff(sheet)
            }
            log.d(LOG_TAG, "Adding WebView behind the progress bar.")
            addView(checkoutWebView, 0, layoutParams)
            progressBar?.bringToFront()
        }
    }

    /**
     * Updates checkout load progress, using animated platform progress updates when available.
     */
    private fun updateProgressBarPercentage(percentage: Int) {
        log.d(LOG_TAG, "Updating progress bar percentage, $percentage.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            progressBar?.setProgress(percentage, true)
        } else {
            progressBar?.progress = percentage
        }
    }

    /**
     * Shows or hides the horizontal loading indicator as WebView load state changes.
     */
    private fun setProgressBarVisibility(visibility: Int) {
        log.d(LOG_TAG, "Setting progress bar visibility $visibility.")
        progressBar?.visibility = visibility
    }

    /**
     * Reports checkout failure to the consumer and closes the presentation.
     */
    internal fun closeCheckoutWithError(exception: CheckoutException) {
        log.d(LOG_TAG, "Closing with error, calling onCheckoutFailed.")
        checkoutListener.onCheckoutFailed(exception)
        dismiss()
    }

    /**
     * Creates the listener adapter that separates consumer callbacks from presentation behavior.
     */
    private fun webViewListener(): CheckoutWebViewListener {
        return CheckoutWebViewListener(
            listener = checkoutListener,
            closeCheckoutWithError = ::closeCheckoutWithError,
            setProgressBarVisibility = ::setProgressBarVisibility,
            hideLoadingBackground = ::hideLoadingBackground,
            updateProgressBarPercentage = ::updateProgressBarPercentage,
        )
    }
}

/**
 * Returns whether the activity is currently resolving night-mode resources.
 */
private fun ComponentActivity.isDarkTheme() =
    resources.configuration.uiMode and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES

/**
 * Applies the configured close icon/tint and routes close button clicks through the sheet cancel path.
 */
private fun MenuItem.setupCloseButton(
    activity: ComponentActivity,
    colorScheme: ColorScheme,
    sheet: CheckoutSheetOptions,
    onClick: () -> Unit,
) {
    val isDarkTheme = activity.isDarkTheme()
    val customCloseIcon = sheet.closeIcon ?: colorScheme.closeIcon(isDarkTheme)
    if (customCloseIcon != null) {
        log.d(LOG_TAG, "Setting custom menu item drawable.")
        icon = AppCompatResources.getDrawable(activity, customCloseIcon.id)
    } else {
        val customTint = sheet.closeIconTint ?: colorScheme.closeIconTint(isDarkTheme)
        val closeIcon = icon
        if (customTint != null && closeIcon != null) {
            log.d(LOG_TAG, "Setting menu item tint.")
            val wrappedDrawable = DrawableCompat.wrap(closeIcon)
            DrawableCompat.setTint(wrappedDrawable.mutate(), customTint.getValue(activity))
        }
    }

    setOnMenuItemClickListener {
        log.d(LOG_TAG, "Menu click cancel invoked.")
        onClick()
        true
    }
}

/**
 * Pads checkout content above bottom insets while the dialog window draws edge-to-edge.
 */
private fun View.applyBottomInsetPadding() {
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
        val systemBarsBottomInset = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
        val imeBottomInset = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        updateBottomPadding(checkoutBottomInsetPadding(systemBarsBottomInset, imeBottomInset))
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

internal fun checkoutBottomInsetPadding(
    systemBarsBottomInset: Int,
    imeBottomInset: Int,
    sdkInt: Int = Build.VERSION.SDK_INT,
): Int =
    if (sdkInt <= Build.VERSION_CODES.Q) {
        maxOf(systemBarsBottomInset, imeBottomInset)
    } else {
        systemBarsBottomInset
    }

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
 * Updates bottom padding only when it changes to avoid redundant layout passes during inset redispatch.
 */
private fun View.updateBottomPadding(bottomPadding: Int) {
    if (paddingBottom == bottomPadding) return

    setPadding(paddingLeft, paddingTop, paddingRight, bottomPadding)
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

private data class SheetColors(
    @ColorInt val webViewBackgroundColor: Int,
    @ColorInt val progressIndicatorColor: Int,
)

/**
 * Removes the loading cover once checkout has content ready to display.
 */
private fun CheckoutBottomSheet.hideLoadingBackground() {
    findViewById<View>(R.id.checkoutKitLoadingBackground)?.visibility = INVISIBLE
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
