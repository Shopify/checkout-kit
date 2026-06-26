package com.shopify.checkoutkit

import android.content.res.ColorStateList
import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.graphics.Color
import android.os.Build
import android.view.MenuItem
import android.view.View
import android.view.View.INVISIBLE
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.annotation.ColorInt
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.children
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

internal class CheckoutBottomSheet(
    private val checkoutUrl: String,
    private val checkoutListener: CheckoutListener,
    private val activity: ComponentActivity,
    private val protocolClient: CheckoutProtocol.Client? = null,
) : BottomSheetDialog(activity) {

    private var presentedCheckoutWebView: CheckoutWebView? = null
    private var bottomSheetBehavior: BottomSheetBehavior<*>? = null
    private var cancelNotified = false
    private var dismissing = false

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

    private val bottomSheetCallback = object : BottomSheetBehavior.BottomSheetCallback() {
        override fun onStateChanged(bottomSheet: View, newState: Int) {
            if (newState == BottomSheetBehavior.STATE_HIDDEN && !dismissing) {
                log.d(LOG_TAG, "Bottom sheet hidden by gesture, cancelling checkout.")
                cancel()
            }
        }

        override fun onSlide(bottomSheet: View, slideOffset: Float) = Unit
    }

    fun start() {
        log.d(LOG_TAG, "Bottom sheet start called.")
        if (isShowing) {
            log.d(LOG_TAG, "Bottom sheet is already showing, ignoring start.")
            return
        }

        cancelNotified = false
        dismissing = false

        setContentView(R.layout.checkout_sheet_content)
        window?.setBackgroundDrawable(Color.TRANSPARENT.toDrawable())

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
        configureBottomSheet()
        log.d(LOG_TAG, "Bottom sheet shown.")
    }

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
            menu.findItem(R.id.checkoutKitCloseBtn).apply { setupCloseButton(colorScheme) }
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

    private fun configureBottomSheet() {
        val sheet = findViewById<View>(com.google.android.material.R.id.design_bottom_sheet) ?: return
        sheet.setBackgroundColor(Color.TRANSPARENT)
        bottomSheetBehavior = behavior.apply {
            isFitToContents = false
            expandedOffset = activity.resources.getDimensionPixelSize(R.dimen.checkout_sheet_top_gap)
            skipCollapsed = true
            isHideable = true
            addBottomSheetCallback(bottomSheetCallback)
            state = BottomSheetBehavior.STATE_EXPANDED
        }
        sheet.post {
            bottomSheetBehavior?.state = BottomSheetBehavior.STATE_EXPANDED
        }
    }

    private fun MenuItem.setupCloseButton(colorScheme: ColorScheme) {
        val customCloseIcon = colorScheme.closeIcon(activity.isDarkTheme())
        if (customCloseIcon != null) {
            log.d(LOG_TAG, "Setting custom menu item drawable.")
            this.icon = AppCompatResources.getDrawable(activity, customCloseIcon.id)
        } else {
            val customTint = colorScheme.closeIconTint(activity.isDarkTheme())
            val icon = this.icon
            if (customTint != null && icon != null) {
                log.d(LOG_TAG, "Setting menu item tint.")
                val wrappedDrawable = DrawableCompat.wrap(icon)
                DrawableCompat.setTint(wrappedDrawable.mutate(), customTint.getValue(activity))
            }
        }

        setOnMenuItemClickListener {
            log.d(LOG_TAG, "Menu click cancel invoked.")
            cancel()
            true
        }
    }

    override fun cancel() {
        if (!cancelNotified) {
            log.d(LOG_TAG, "Cancel invoked, invoking onCheckoutCanceled.")
            cancelNotified = true
            checkoutListener.onCheckoutCanceled()
        }
        super.cancel()
    }

    override fun dismiss() {
        if (!isShowing && dismissing) return

        log.d(LOG_TAG, "Dismiss invoked.")
        dismissing = true
        bottomSheetBehavior?.removeBottomSheetCallback(bottomSheetCallback)
        backNavigationCallback.remove()
        destroyPresentedWebView()
        bottomSheetBehavior = null
        super.dismiss()
    }

    private fun destroyPresentedWebView() {
        presentedCheckoutWebView?.let { webView ->
            log.d(LOG_TAG, "Destroying presented WebView.")
            webView.removeFromParent()
            webView.destroy()
            presentedCheckoutWebView = null
        }
    }

    private fun addWebViewToContainer(
        @ColorInt webViewBackgroundColor: Int,
        checkoutWebView: BaseWebView,
    ) {
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)?.apply {
            log.d(LOG_TAG, "Found parent view, setting its colors and layout params.")
            setBackgroundColor(webViewBackgroundColor)
            val layoutParams = RelativeLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
            checkoutWebView.removeFromParent()
            checkoutWebView.setBackgroundColor(webViewBackgroundColor)
            ViewCompat.setNestedScrollingEnabled(checkoutWebView, true)
            checkoutWebView.installBottomSheetScrollHandoff()
            log.d(LOG_TAG, "Adding WebView behind the progress bar.")
            addView(checkoutWebView, 0, layoutParams)
            findViewById<ProgressBar>(R.id.progressBar)?.bringToFront()
        }
    }

    private fun updateProgressBarPercentage(percentage: Int) {
        log.d(LOG_TAG, "Updating progress bar percentage, $percentage.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            findViewById<ProgressBar>(R.id.progressBar)?.setProgress(percentage, true)
        } else {
            findViewById<ProgressBar>(R.id.progressBar)?.progress = percentage
        }
    }

    private fun setProgressBarVisibility(visibility: Int) {
        log.d(LOG_TAG, "Setting progress bar visibility $visibility.")
        findViewById<ProgressBar>(R.id.progressBar)?.visibility = visibility
    }

    internal fun closeCheckoutWithError(exception: CheckoutException) {
        log.d(LOG_TAG, "Closing bottom sheet with error, calling onCheckoutFailed.")
        checkoutListener.onCheckoutFailed(exception)
        dismiss()
    }

    private fun webViewListener(): CheckoutWebViewListener {
        return CheckoutWebViewListener(
            listener = checkoutListener,
            closeCheckoutWithError = ::closeCheckoutWithError,
            setProgressBarVisibility = ::setProgressBarVisibility,
            hideLoadingBackground = ::hideLoadingBackground,
            updateProgressBarPercentage = ::updateProgressBarPercentage,
        )
    }

    private fun ComponentActivity.isDarkTheme() =
        resources.configuration.uiMode and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES

    companion object {
        private const val LOG_TAG = "CheckoutBottomSheet"
    }
}

private data class SheetColors(
    @ColorInt val webViewBackgroundColor: Int,
    @ColorInt val progressIndicatorColor: Int,
)

private fun CheckoutBottomSheet.hideLoadingBackground() {
    findViewById<View>(R.id.checkoutKitLoadingBackground)?.visibility = INVISIBLE
}
