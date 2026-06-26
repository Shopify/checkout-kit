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

    private val backNavigationCallback = object : OnBackPressedCallback(enabled = true) {
        override fun handleOnBackPressed() {
            val webView = findViewById<RelativeLayout>(R.id.checkoutKitContainer)
                ?.children?.firstOrNull { it is BaseWebView } as? BaseWebView
            if (webView?.handleBackPressed() != true) {
                log.d(LOG_TAG, "Back press not handled by WebView, cancelling bottom sheet.")
                cancel()
            }
        }
    }

    /**
     * Inflates, configures, and shows the bottom sheet around the retained checkout WebView.
     */
    fun start() {
        log.d(LOG_TAG, "Bottom sheet start called.")
        if (isShowing) {
            log.d(LOG_TAG, "Bottom sheet is already showing, ignoring start.")
            return
        }

        cancelNotified = false
        dismissing = false
        dismissFinalized = false

        setContentView(R.layout.checkout_sheet_content)
        window?.configureCheckoutBottomSheetWindow()
        configureSheet()

        val colorScheme = ShopifyCheckoutKit.configuration.colorScheme
        log.d(LOG_TAG, "Configured colorScheme $colorScheme")
        val sheetColors = applySheetColors(colorScheme)

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

        findViewById<ProgressBar>(R.id.progressBar)?.apply {
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
        // Dialog.show() can apply default window sizing after the initial configuration.
        window?.setCheckoutBottomSheetWindowLayout()
        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.animateIn()
        focusCloseButtonForAccessibility(activity)
        log.d(LOG_TAG, "Bottom sheet shown.")
    }

    /**
     * Applies configured colors to native sheet chrome and returns colors needed by WebView-owned surfaces.
     */
    private fun applySheetColors(colorScheme: ColorScheme): SheetColors {
        val isDarkTheme = activity.isDarkTheme()
        val headerBackgroundColor = colorScheme.headerBackgroundColor(isDarkTheme).getValue(activity)
        val headerFontColor = colorScheme.headerFontColor(isDarkTheme).getValue(activity)
        val webViewBackgroundColor = colorScheme.webViewBackgroundColor(isDarkTheme).getValue(activity)

        findViewById<Toolbar>(R.id.checkoutKitHeader)?.apply {
            log.d(LOG_TAG, "Applying configured header colors and inflating menu.")
            title = ""
            background = roundedTopCornerDrawable(activity, headerBackgroundColor)
            setTitleTextColor(headerFontColor)
            inflateMenu(R.menu.checkout_menu)
            menu.findItem(R.id.checkoutKitCloseBtn).setupCloseButton(activity, colorScheme) {
                cancel()
            }
        }

        findViewById<TextView>(R.id.checkoutKitHeaderTitle)
            ?.setTextColor(headerFontColor)

        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            ?.setBackgroundColor(webViewBackgroundColor)

        findViewById<View>(R.id.checkoutKitLoadingBackground)
            ?.setBackgroundColor(webViewBackgroundColor)

        return SheetColors(
            webViewBackgroundColor = webViewBackgroundColor,
            progressIndicatorColor = colorScheme.progressIndicatorColor(isDarkTheme).getValue(activity),
        )
    }

    /**
     * Wires native sheet dismissal affordances after the layout has been inflated.
     */
    private fun configureSheet() {
        findViewById<View>(R.id.checkoutKitOutsideTouchTarget)?.setOnClickListener {
            log.d(LOG_TAG, "Outside touch cancel invoked.")
            cancel()
        }

        findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)?.apply {
            applySystemBarTopMargin()
            onDismissRequested = {
                if (!dismissing) {
                    log.d(LOG_TAG, "Bottom sheet dismissed by gesture, cancelling checkout.")
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
            log.w(LOG_TAG, "Bottom sheet window was already detached before dismissal completed.")
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
            findViewById<ProgressBar>(R.id.progressBar)?.bringToFront()
        }
    }

    /**
     * Updates checkout load progress, using animated platform progress updates when available.
     */
    private fun updateProgressBarPercentage(percentage: Int) {
        log.d(LOG_TAG, "Updating progress bar percentage, $percentage.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            findViewById<ProgressBar>(R.id.progressBar)?.setProgress(percentage, true)
        } else {
            findViewById<ProgressBar>(R.id.progressBar)?.progress = percentage
        }
    }

    /**
     * Shows or hides the horizontal loading indicator as WebView load state changes.
     */
    private fun setProgressBarVisibility(visibility: Int) {
        log.d(LOG_TAG, "Setting progress bar visibility $visibility.")
        findViewById<ProgressBar>(R.id.progressBar)?.visibility = visibility
    }

    /**
     * Reports checkout failure to the consumer and closes the presentation.
     */
    internal fun closeCheckoutWithError(exception: CheckoutException) {
        log.d(LOG_TAG, "Closing bottom sheet with error, calling onCheckoutFailed.")
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
    onClick: () -> Unit,
) {
    val customCloseIcon = colorScheme.closeIcon(activity.isDarkTheme())
    if (customCloseIcon != null) {
        log.d(LOG_TAG, "Setting custom menu item drawable.")
        icon = AppCompatResources.getDrawable(activity, customCloseIcon.id)
    } else {
        val customTint = colorScheme.closeIconTint(activity.isDarkTheme())
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
 * Pads checkout content above system bars and the keyboard while the dialog window draws edge-to-edge.
 */
private fun View.applyBottomInsetPadding() {
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
        val systemBarsBottomInset = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
        val imeBottomInset = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        updateBottomPadding(maxOf(systemBarsBottomInset, imeBottomInset))
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

/**
 * Keeps the intended top gap visible below the status bar while the dialog window draws edge-to-edge.
 */
private fun View.applySystemBarTopMargin() {
    val initialLayoutParams = layoutParams as? ViewGroup.MarginLayoutParams ?: return
    val initialTopMargin = initialLayoutParams.topMargin
    val initialBottomMargin = initialLayoutParams.bottomMargin
    ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
        val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        view.updateVerticalMargins(
            topMargin = initialTopMargin + systemBars.top,
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
@Suppress("DEPRECATION")
private fun Window.configureCheckoutBottomSheetWindow() {
    setBackgroundDrawable(Color.TRANSPARENT.toDrawable())
    setGravity(Gravity.BOTTOM)
    setCheckoutBottomSheetWindowLayout()
    setTransparentSystemBars()
    WindowCompat.setDecorFitsSystemWindows(this, false)
    setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
    addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    attributes = attributes.apply {
        dimAmount = WINDOW_DIM_AMOUNT
        windowAnimations = 0
    }
}

/**
 * Gives the dialog window the full screen so the inner sheet layout controls visible height and top gap.
 */
private fun Window.setCheckoutBottomSheetWindowLayout() {
    setLayout(MATCH_PARENT, MATCH_PARENT)
}

/**
 * Makes system bars transparent while retaining contrast enforcement for 3-button navigation controls.
 */
@Suppress("DEPRECATION")
private fun Window.setTransparentSystemBars() {
    statusBarColor = Color.TRANSPARENT
    navigationBarColor = Color.TRANSPARENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        isNavigationBarContrastEnforced = true
    }
}

private const val LOG_TAG = "CheckoutBottomSheet"
private const val WINDOW_DIM_AMOUNT = 0.32f
