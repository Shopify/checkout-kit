package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.ColorStateList
import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.View.INVISIBLE
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.findViewTreeOnBackPressedDispatcherOwner
import androidx.annotation.ColorInt
import androidx.annotation.MainThread
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.Toolbar
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

/**
 * Embeddable Shopify checkout content for hosts that own their presentation container.
 *
 * This view must be created programmatically because checkout state is required at construction;
 * XML inflation is not supported.
 *
 * The view owns checkout chrome, WebView navigation, loading UI, callbacks, and protocol
 * connectivity. Its parent owns presentation state, geometry, and dismissal gestures. A lifecycle
 * failure invokes the host callback; the parent remains responsible for removing its surrounding
 * presentation, destroying this view, and creating a new [ShopifyCheckout] for any retry. Call
 * [destroy] when the view is permanently removed so the underlying WebView is released promptly.
 */
@SuppressLint("ViewConstructor")
public class ShopifyCheckout @MainThread internal constructor(
    context: Context,
    checkoutUrl: String,
    webMessageTransport: WebMessageTransport,
    private val hostConfiguration: CheckoutHostConfiguration,
) : FrameLayout(context) {

    /**
     * Creates checkout content with a listener and optional typed protocol client.
     *
     * Initialization failures are reported on the main thread after this constructor returns. The
     * returned view remains inert when initialization fails.
     */
    @MainThread
    @JvmOverloads
    public constructor(
        context: Context,
        checkoutUrl: String,
        checkoutListener: DefaultCheckoutListener,
        protocolClient: CheckoutProtocol.Client? = null,
    ) : this(
        context = context,
        checkoutUrl = checkoutUrl,
        webMessageTransport = WebMessageListenerTransport,
        hostConfiguration = CheckoutHostConfiguration(
            listener = checkoutListener,
            protocolClient = protocolClient,
            onDismissRequest = checkoutListener::onCheckoutDismissed,
            onFailure = checkoutListener::onCheckoutFailed,
            reportInitializationFailure = true,
        ),
    )

    private var checkoutWebView: CheckoutWebView? = null
    private var lifecycleOwner: LifecycleOwner? = null
    private var dismissNotified = false
    private var destroyed = false
    private var webViewResumed = false
    private var headerBorderIsVisible = false
    internal var retainPreloadOnDestroy = false
    internal var initializationError: CheckoutException? = null
        private set

    @ColorInt
    internal var webViewBackgroundColor: Int = android.graphics.Color.TRANSPARENT
        private set

    private val progressBar: ProgressBar
        get() = findViewById(R.id.progressBar)

    private val lifecycleObserver = object : DefaultLifecycleObserver {
        override fun onDestroy(owner: LifecycleOwner) {
            log.d(LOG_TAG, "Host lifecycle was destroyed, destroying checkout view.")
            destroy()
        }
    }

    private val backNavigationCallback = object : OnBackPressedCallback(enabled = true) {
        override fun handleOnBackPressed() {
            if (checkoutWebView?.handleBackPressed() != true) {
                log.d(LOG_TAG, "Back press not handled by WebView, requesting dismissal.")
                notifyCheckoutDismissed()
            }
        }
    }

    init {
        LayoutInflater.from(context).inflate(R.layout.checkout_view_content, this, true)
        configureChrome()

        try {
            val webView = CheckoutWebView.checkoutViewFor(checkoutUrl, context, webMessageTransport)
            checkoutWebView = webView
            webView.markPresented()
            webView.setListener(webViewListener())
            webView.setClient(hostConfiguration.protocolClient)
            addWebViewToContainer(webView)
        } catch (error: UnsupportedWebViewException) {
            val checkoutError = error.checkoutError
            initializationError = checkoutError
            if (hostConfiguration.reportInitializationFailure) {
                Handler(Looper.getMainLooper()).post {
                    if (!destroyed) {
                        hostConfiguration.onFailure(checkoutError)
                    }
                }
            }
        } catch (checkoutError: CheckoutException) {
            initializationError = checkoutError
            if (hostConfiguration.reportInitializationFailure) {
                Handler(Looper.getMainLooper()).post {
                    if (!destroyed) {
                        hostConfiguration.onFailure(checkoutError)
                    }
                }
            }
        }
    }

    /**
     * Permanently releases this checkout and its underlying WebView.
     *
     * This method is idempotent and does not report dismissal or failure.
     */
    @MainThread
    public fun destroy() {
        if (destroyed) return

        destroyed = true
        backNavigationCallback.remove()
        lifecycleOwner?.lifecycle?.removeObserver(lifecycleObserver)
        lifecycleOwner = null
        checkoutWebView?.let { webView ->
            webView.setClient(null)
            webView.setListener(CheckoutWebViewListener(NoopCheckoutListener()))
            webView.setOnScrollChangeListener(null)
            pauseWebView()
            webView.clearBottomSheetScrollHandoff()
            webView.removeFromParent()
            if (retainPreloadOnDestroy && CheckoutWebView.releaseAfterPresentation(webView)) {
                log.d(LOG_TAG, "Retaining preloaded checkout WebView after dismissal.")
            } else {
                CheckoutWebView.discardAfterPresentation(webView)
                log.d(LOG_TAG, "Destroying checkout WebView.")
                webView.destroy()
            }
        }
        checkoutWebView = null
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (destroyed) return

        resumeWebView()
        bindLifecycleOwner()
        backNavigationCallback.isEnabled = !dismissNotified
        findViewTreeOnBackPressedDispatcherOwner()
            ?.onBackPressedDispatcher
            ?.addCallback(backNavigationCallback)
    }

    override fun onDetachedFromWindow() {
        backNavigationCallback.remove()
        pauseWebView()
        super.onDetachedFromWindow()
    }

    /**
     * Applies the sheet-owned parts of presentation configuration for the imperative presenter.
     */
    internal fun configureForBottomSheet(sheet: CheckoutSheetOptions) {
        val colorScheme = ShopifyCheckoutKit.configuration.appearance.effectiveColorScheme
        val headerBackgroundColor = colorScheme.headerBackgroundColor(context.isDarkTheme()).getValue(context)
        findViewById<Toolbar>(R.id.checkoutKitHeader).background =
            roundedTopCornerDrawable(context, headerBackgroundColor, sheet.cornerRadiusDp)
        findViewById<TextView>(R.id.checkoutKitHeaderTitle).apply {
            (layoutParams as? Toolbar.LayoutParams)?.let { params ->
                params.topMargin = if (sheet.showsDragHandle) {
                    resources.getDimensionPixelSize(R.dimen.checkout_sheet_drag_handle_title_top_margin)
                } else {
                    0
                }
                layoutParams = params
            }
        }
    }

    internal fun applyBottomInsetPadding() {
        findViewById<View>(R.id.checkoutKitContainer).applyCheckoutBottomInsetPadding()
    }

    internal fun bindToBottomSheet(sheet: CheckoutBottomSheetLayout) {
        checkoutWebView?.let { webView ->
            sheet.bindScrollableChild(webView)
            webView.installBottomSheetScrollHandoff(sheet)
        }
    }

    internal fun resumeForPresentation() {
        resumeWebView()
    }

    private fun configureChrome() {
        val colorScheme = ShopifyCheckoutKit.configuration.appearance.effectiveColorScheme
        val sheet = ShopifyCheckoutKit.configuration.sheet
        val isDarkTheme = context.isDarkTheme()
        val headerBackgroundColor = colorScheme.headerBackgroundColor(isDarkTheme).getValue(context)
        val headerFontColor = colorScheme.headerFontColor(isDarkTheme).getValue(context)
        webViewBackgroundColor = colorScheme.webViewBackgroundColor(isDarkTheme).getValue(context)

        findViewById<Toolbar>(R.id.checkoutKitHeader).apply {
            background = headerBackgroundColor.toDrawable()
            elevation = sheet.toolbarElevationDp.dpToPx(context)
            setTitleTextColor(headerFontColor)
            inflateMenu(R.menu.checkout_menu)
            menu.findItem(R.id.shopify_checkout_kit_close_button).setupCheckoutCloseButton(
                context = context,
                colorScheme = colorScheme,
                sheet = sheet,
                onClick = ::notifyCheckoutDismissed,
            )
        }

        findViewById<TextView>(R.id.checkoutKitHeaderTitle).apply {
            text = ShopifyCheckoutKit.configuration.resolveCheckoutTitle(context)
            setTextColor(headerFontColor)
            (layoutParams as? Toolbar.LayoutParams)?.let { params ->
                params.topMargin = 0
                params.gravity = when (sheet.titleAlignment) {
                    CheckoutSheetTitleAlignment.START -> Gravity.START or Gravity.CENTER_VERTICAL
                    CheckoutSheetTitleAlignment.CENTER -> Gravity.CENTER
                }
                layoutParams = params
            }
        }

        findViewById<RelativeLayout>(R.id.checkoutKitContainer).setBackgroundColor(webViewBackgroundColor)
        findViewById<View>(R.id.checkoutKitLoadingBackground).setBackgroundColor(webViewBackgroundColor)
        findViewById<View>(R.id.checkoutKitHeaderBorder).setBackgroundColor(
            colorScheme.headerBorderColor(isDarkTheme).getValue(context)
        )
        progressBar.progressTintList = ColorStateList.valueOf(
            colorScheme.progressIndicatorColor(isDarkTheme).getValue(context)
        )
    }

    private fun addWebViewToContainer(webView: CheckoutWebView) {
        webView.removeFromParent()
        webView.setBackgroundColor(webViewBackgroundColor)
        val headerBorder = findViewById<View>(R.id.checkoutKitHeaderBorder)
        webView.setOnScrollChangeListener { _, _, scrollY, _, _ ->
            val shouldShowBorder = scrollY > 0
            if (headerBorderIsVisible == shouldShowBorder) return@setOnScrollChangeListener

            headerBorderIsVisible = shouldShowBorder
            headerBorder.animate().cancel()
            headerBorder.animate()
                .alpha(if (shouldShowBorder) 1f else 0f)
                .setDuration(HEADER_BORDER_FADE_DURATION_MS)
                .start()
        }
        headerBorderIsVisible = webView.scrollY > 0
        headerBorder.animate().cancel()
        headerBorder.alpha = if (headerBorderIsVisible) 1f else 0f
        findViewById<RelativeLayout>(R.id.checkoutKitContainer).apply {
            addView(webView, 0, RelativeLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
            progressBar.bringToFront()
        }

        if (webView.hasFinishedLoading()) {
            progressBar.visibility = INVISIBLE
            hideLoadingBackground()
        }
    }

    private fun notifyCheckoutDismissed() {
        if (dismissNotified || destroyed) return

        dismissNotified = true
        backNavigationCallback.isEnabled = false
        hostConfiguration.onDismissRequest()
    }

    private fun webViewListener(): CheckoutWebViewListener = CheckoutWebViewListener(
        listener = hostConfiguration.listener,
        closeCheckoutWithError = hostConfiguration.onFailure,
        setProgressBarVisibility = { progressBar.visibility = it },
        hideLoadingBackground = ::hideLoadingBackground,
        updateProgressBarPercentage = { percentage -> progressBar.setProgressCompat(percentage) },
    )

    private fun hideLoadingBackground() {
        findViewById<View>(R.id.checkoutKitLoadingBackground).visibility = INVISIBLE
    }

    private fun bindLifecycleOwner() {
        val nextOwner = findViewTreeLifecycleOwner() ?: return
        if (lifecycleOwner === nextOwner) return

        lifecycleOwner?.lifecycle?.removeObserver(lifecycleObserver)
        lifecycleOwner = nextOwner
        nextOwner.lifecycle.addObserver(lifecycleObserver)
    }

    private fun resumeWebView() {
        if (webViewResumed || destroyed) return

        checkoutWebView?.onResume()
        webViewResumed = checkoutWebView != null
    }

    private fun pauseWebView() {
        if (!webViewResumed) return

        checkoutWebView?.onPause()
        webViewResumed = false
    }

    public companion object {
        private const val LOG_TAG = "ShopifyCheckout"
        private const val HEADER_BORDER_FADE_DURATION_MS = 120L

        /**
         * Creates checkout content using the Kotlin presentation builder.
         *
         * Callbacks and the connected protocol client are fixed for the lifetime of this view.
         * Initialization failures are reported through the configured `onFail` callback on the
         * main thread after this function returns. The returned view remains inert when
         * initialization fails.
         */
        @JvmSynthetic
        @MainThread
        public fun create(
            context: Context,
            checkoutUrl: String,
            configure: CheckoutPresentation.() -> Unit,
        ): ShopifyCheckout = ShopifyCheckout(
            context = context,
            checkoutUrl = checkoutUrl,
            webMessageTransport = WebMessageListenerTransport,
            hostConfiguration = buildCheckoutHostConfiguration(configure),
        )

        @MainThread
        internal fun create(
            context: Context,
            checkoutUrl: String,
            webMessageTransport: WebMessageTransport,
            configure: CheckoutPresentation.() -> Unit,
        ): ShopifyCheckout = ShopifyCheckout(
            context = context,
            checkoutUrl = checkoutUrl,
            webMessageTransport = webMessageTransport,
            hostConfiguration = buildCheckoutHostConfiguration(configure),
        )
    }
}

private fun Context.isDarkTheme(): Boolean =
    resources.configuration.uiMode and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES

internal data class CheckoutHostConfiguration(
    val listener: CheckoutListener,
    val protocolClient: CheckoutProtocol.Client?,
    val onDismissRequest: () -> Unit,
    val onFailure: (CheckoutException) -> Unit,
    val reportInitializationFailure: Boolean,
)

private fun buildCheckoutHostConfiguration(
    configure: CheckoutPresentation.() -> Unit,
): CheckoutHostConfiguration {
    val presentation = CheckoutPresentation().apply(configure)
    val listener = presentation.buildListener()
    return CheckoutHostConfiguration(
        listener = listener,
        protocolClient = presentation.protocolClient,
        onDismissRequest = listener::onCheckoutDismissed,
        onFailure = listener::onCheckoutFailed,
        reportInitializationFailure = true,
    )
}

private fun View.applyCheckoutBottomInsetPadding() {
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
        val systemBarsBottomInset = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
        val imeBottomInset = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        val bottomInset = maxOf(systemBarsBottomInset, imeBottomInset)
        if (paddingBottom != bottomInset) {
            setPadding(paddingLeft, paddingTop, paddingRight, bottomInset)
        }
        insets
    }
    ViewCompat.requestApplyInsets(this)
}

private fun ProgressBar.setProgressCompat(percentage: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        setProgress(percentage, true)
    } else {
        progress = percentage
    }
}

private fun MenuItem.setupCheckoutCloseButton(
    context: Context,
    colorScheme: ColorScheme,
    sheet: CheckoutSheetOptions,
    onClick: () -> Unit,
) {
    val isDarkTheme = context.isDarkTheme()
    val customCloseIcon = sheet.closeIcon ?: colorScheme.closeIcon(isDarkTheme)
    if (customCloseIcon != null) {
        icon = AppCompatResources.getDrawable(context, customCloseIcon.id)
    } else {
        val customTint = sheet.closeIconTint ?: colorScheme.closeIconTint(isDarkTheme)
        val closeIcon = icon
        if (customTint != null && closeIcon != null) {
            val wrappedDrawable = DrawableCompat.wrap(closeIcon)
            DrawableCompat.setTint(wrappedDrawable.mutate(), customTint.getValue(context))
        }
    }

    setOnMenuItemClickListener {
        onClick()
        true
    }
}
