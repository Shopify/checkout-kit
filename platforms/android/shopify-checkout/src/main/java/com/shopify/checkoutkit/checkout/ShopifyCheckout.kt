package com.shopify.checkoutkit.checkout
import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.findViewTreeOnBackPressedDispatcherOwner
import androidx.annotation.ColorInt
import androidx.annotation.MainThread
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.shopify.checkoutkit.checkout.ShopifyCheckout.Companion.log
import com.shopify.checkoutkit.internal.logging.LogWrapper
import com.shopify.checkoutkit.internal.presentation.CheckoutBottomSheetLayout
import com.shopify.checkoutkit.internal.presentation.clearBottomSheetScrollHandoff
import com.shopify.checkoutkit.internal.presentation.installBottomSheetScrollHandoff
import com.shopify.checkoutkit.internal.protocol.CheckoutProtocol
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import com.shopify.checkoutkit.internal.web.CheckoutWebViewListener
import com.shopify.checkoutkit.internal.web.UnsupportedWebViewException
import com.shopify.checkoutkit.internal.web.WebMessageListenerTransport
import com.shopify.checkoutkit.internal.web.WebMessageTransport
import com.shopify.checkoutkit.internal.web.removeFromParent

/**
 * Entry point for Checkout Kit's checkout feature, and the embeddable checkout view.
 *
 * `ShopifyCheckout` has two roles:
 *
 * - **Companion (`ShopifyCheckout.configure`, [preload], [clearPreload], [present]):** operations on
 *   shared checkout state. Configuration and preloads apply to every checkout entry point, and
 *   [present] shows checkout in an SDK-managed bottom sheet. Call these on the type, including from
 *   Java, not on a view instance.
 * - **Instance (created with [create] or the listener constructor):** checkout content hosted by your
 *   app. Instance members, such as [destroy], affect only that view.
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
    checkoutUrl: String,
    context: Context,
    webMessageTransport: WebMessageTransport,
    private val hostConfiguration: CheckoutHostConfiguration,
) : FrameLayout(context) {

    /**
     * Creates checkout content with a listener for checkout events and browser hooks.
     *
     * Initialization failures are reported on the main thread after this constructor returns. The
     * returned view remains inert when initialization fails.
     */
    @MainThread
    public constructor(
        checkoutUrl: String,
        context: Context,
        checkoutListener: DefaultCheckoutListener,
    ) : this(
        checkoutUrl = checkoutUrl,
        context = context,
        webMessageTransport = WebMessageListenerTransport,
        hostConfiguration = CheckoutHostConfiguration(
            listener = checkoutListener,
            protocolClient = null,
            onDismissRequest = checkoutListener::onCheckoutDismissed,
            onFailure = { checkoutListener.onCheckoutFailed(CheckoutFailureEvent(it)) },
            reportInitializationFailure = true,
        ),
    )

    private val colorScheme = ShopifyCheckout.configuration.appearance.effectiveColorScheme
    private val chrome = CheckoutChrome(
        root = this,
        colorScheme = colorScheme,
        sheetOptions = ShopifyCheckout.configuration.sheet,
        onCloseRequested = ::notifyCheckoutDismissed,
    )

    /**
     * Follows the system theme for automatic color schemes only. Explicit light, dark and storefront color
     * schemes keep their colors.
     */
    private val systemTheme: SystemThemeObserver? = if (colorScheme is ColorScheme.Automatic) {
        SystemThemeObserver(this) { isDarkTheme ->
            if (!chrome.applyTheme(isDarkTheme)) return@SystemThemeObserver

            log.d(LOG_TAG, "System theme changed, applied ${if (isDarkTheme) "dark" else "light"} colors.")
            onThemeColorsChanged?.invoke(isDarkTheme)
        }
    } else {
        null
    }
    private var checkoutWebView: CheckoutWebView? = null
    private var lifecycleOwner: LifecycleOwner? = null
    private var dismissNotified = false
    private var destroyed = false
    private var webViewResumed = false
    internal var initializationError: CheckoutException? = null
        private set

    /**
     * Invoked after this view applies the colors for a new system theme, so the presenting sheet can
     * update the chrome it owns.
     */
    internal var onThemeColorsChanged: ((isDarkTheme: Boolean) -> Unit)? = null

    @get:ColorInt
    internal val webViewBackgroundColor: Int
        get() = chrome.webViewBackgroundColor

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
        try {
            val webView = CheckoutWebView.checkoutViewFor(checkoutUrl, context, webMessageTransport)
            checkoutWebView = webView
            webView.markPresented()
            webView.setListener(webViewListener())
            webView.setClient(hostConfiguration.protocolClient)
            chrome.attachWebView(webView)
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
        systemTheme?.release()
        checkoutWebView?.let { webView ->
            webView.setClient(null)
            webView.setListener(CheckoutWebViewListener(NoopCheckoutListener()))
            chrome.detachWebView()
            pauseWebView()
            webView.clearBottomSheetScrollHandoff()
            webView.removeFromParent()
            CheckoutWebView.discardAfterPresentation(webView)
            log.d(LOG_TAG, "Destroying checkout WebView.")
            webView.destroy()
        }
        checkoutWebView = null
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (destroyed) return

        resumeWebView()
        bindLifecycleOwner()
        systemTheme?.bind()
        systemTheme?.checkNow()
        backNavigationCallback.isEnabled = !dismissNotified
        findViewTreeOnBackPressedDispatcherOwner()
            ?.onBackPressedDispatcher
            ?.addCallback(backNavigationCallback)
    }

    override fun onDetachedFromWindow() {
        backNavigationCallback.remove()
        systemTheme?.unbind()
        pauseWebView()
        super.onDetachedFromWindow()
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        systemTheme?.scheduleCheck()
    }

    /**
     * Applies the sheet-owned parts of presentation configuration for the imperative presenter.
     */
    internal fun configureForBottomSheet(sheet: CheckoutSheetOptions) {
        chrome.configureForBottomSheet(sheet)
    }

    internal fun applyBottomInsetPadding() {
        chrome.applyBottomInsetPadding()
    }

    internal fun bindToBottomSheet(sheet: CheckoutBottomSheetLayout) {
        checkoutWebView?.let { webView ->
            sheet.bindScrollableChild(webView)
            webView.installBottomSheetScrollHandoff(sheet)
        }
    }

    internal fun resumeWebView() {
        if (webViewResumed || destroyed) return

        checkoutWebView?.onResume()
        webViewResumed = checkoutWebView != null
    }

    private fun pauseWebView() {
        if (!webViewResumed) return

        checkoutWebView?.onPause()
        webViewResumed = false
    }

    private fun notifyCheckoutDismissed() {
        if (dismissNotified || destroyed) return

        dismissNotified = true
        backNavigationCallback.isEnabled = false
        hostConfiguration.onDismissRequest()
    }

    private fun webViewListener(): CheckoutWebViewListener = CheckoutWebViewListener(
        listener = hostConfiguration.listener,
        closeCheckoutWithError = { error ->
            checkoutWebView?.endPresentationEvents()
            hostConfiguration.onFailure(error)
        },
        setProgressBarVisibility = chrome::setProgressBarVisibility,
        hideLoadingBackground = chrome::hideLoadingBackground,
        updateProgressBarPercentage = chrome::setProgress,
    )

    private fun bindLifecycleOwner() {
        val nextOwner = findViewTreeLifecycleOwner() ?: return
        if (lifecycleOwner === nextOwner) return

        lifecycleOwner?.lifecycle?.removeObserver(lifecycleObserver)
        lifecycleOwner = nextOwner
        nextOwner.lifecycle.addObserver(lifecycleObserver)
    }

    public companion object {
        private const val LOG_TAG = "ShopifyCheckout"

        internal val configuration: Configuration
            get() = CheckoutService.configuration

        internal val log: LogWrapper
            get() = CheckoutService.log

        /**
         * Returns a snapshot of the currently applied shared checkout configuration.
         * Configuration changes should be made through [configure].
         *
         * @return the currently applied configuration
         * @see configure
         */
        @JvmStatic
        public fun getConfiguration(): Configuration = CheckoutService.configurationSnapshot()

        /**
         * Updates the shared checkout configuration, not the configuration of an individual view.
         *
         * Calling this function invalidates any cached preload.
         * Call through `ShopifyCheckout.configure(...)`, including from Java.
         *
         * Kotlin example:
         * ```kotlin
         * ShopifyCheckout.configure { it.appearance = CheckoutAppearance.App(ColorScheme.Dark()) }
         * ```
         *
         * @param setter a function that modifies the configuration object
         * @see Configuration
         */
        @JvmStatic
        public fun configure(setter: ConfigurationUpdater) {
            CheckoutService.configure(setter)
        }

        /**
         * Clears any shared checkout cached by [preload], not an individual view's rendering state.
         *
         * If the preloaded checkout is already being presented, this does not destroy the active
         * buyer session. The WebView will be discarded after it is dismissed or detached.
         *
         * Call through `ShopifyCheckout.clearPreload()`, including from Java.
         * An embedded view's `invalidate()` requests an Android redraw; it does not clear preloads.
         */
        @JvmStatic
        public fun clearPreload() {
            CheckoutService.clearPreload()
        }

        /**
         * Preloads a Shopify checkout in a background WebView as a best-effort performance hint.
         *
         * Preloaded checkouts are reused only when [present] is later called or a [ShopifyCheckout] is
         * created with the same fully parameterized checkout URL. Otherwise the cached checkout is
         * discarded and checkout loads normally.
         *
         * @param checkoutUrl The URL of the checkout to preload, obtained via the Storefront API.
         * @param context The activity used to create the background WebView.
         * @param listener optional listener invoked on the main thread whenever the preload state changes.
         * @return A [CheckoutPreload] handle exposing the current preload state, or `null` if preloading
         * is disabled or the context is unavailable and no preload was started.
         */
        @JvmStatic
        @JvmOverloads
        public fun preload(
            checkoutUrl: String,
            context: ComponentActivity,
            listener: PreloadStateListener? = null,
        ): CheckoutPreload? = CheckoutService.preload(checkoutUrl, context, listener)

        /**
         * Presents a Shopify checkout within an SDK-managed bottom sheet, not an existing embedded view.
         *
         * Must be called on the main thread.
         *
         * @param checkoutUrl The URL of the checkout to be presented, obtained via the Storefront API.
         * @param context The activity the checkout is being presented from.
         * @param configure a Kotlin-first builder for checkout events and browser/system hooks
         * @return A [CheckoutHandle] if the sheet was successfully created and displayed, the existing
         * handle if checkout is already presented, or `null` if the activity is unavailable or presentation cannot start.
         */
        @JvmStatic
        @JvmSynthetic
        @MainThread
        public fun present(
            checkoutUrl: String,
            context: ComponentActivity,
            configure: CheckoutPresentation.() -> Unit,
        ): CheckoutHandle? = CheckoutService.present(checkoutUrl, context, configure)

        /**
         * Presents a Shopify checkout within an SDK-managed bottom sheet, not an existing embedded view.
         *
         * Must be called on the main thread. Call through `ShopifyCheckout.present(...)`, including from Java.
         *
         * @param checkoutUrl The URL of the checkout to be presented, obtained via the Storefront API.
         * @param context The activity the checkout is being presented from.
         * @param checkoutListener provides callbacks to allow clients to listen for and respond to checkout lifecycle events
         * (start, updates, completion, failure, dismissal, links, permission prompts, file chooser).
         * @return A [CheckoutHandle] if the sheet was successfully created and displayed, the existing
         * handle if checkout is already presented, or `null` if the activity is unavailable or presentation cannot start.
         */
        @JvmStatic
        @MainThread
        public fun <T : DefaultCheckoutListener> present(
            checkoutUrl: String,
            context: ComponentActivity,
            checkoutListener: T,
        ): CheckoutHandle? = CheckoutService.present(checkoutUrl, context, checkoutListener)

        /**
         * Creates checkout content using the Kotlin presentation builder.
         *
         * Callbacks are fixed for the lifetime of this view.
         * Initialization failures are reported through the configured `onFail` callback on the
         * main thread after this function returns. The returned view remains inert when
         * initialization fails.
         */
        @JvmSynthetic
        @MainThread
        public fun create(
            checkoutUrl: String,
            context: Context,
            configure: CheckoutPresentation.() -> Unit,
        ): ShopifyCheckout = ShopifyCheckout(
            checkoutUrl = checkoutUrl,
            context = context,
            webMessageTransport = WebMessageListenerTransport,
            hostConfiguration = buildCheckoutHostConfiguration(configure),
        )

        @MainThread
        internal fun create(
            checkoutUrl: String,
            context: Context,
            webMessageTransport: WebMessageTransport,
            configure: CheckoutPresentation.() -> Unit,
        ): ShopifyCheckout = ShopifyCheckout(
            checkoutUrl = checkoutUrl,
            context = context,
            webMessageTransport = webMessageTransport,
            hostConfiguration = buildCheckoutHostConfiguration(configure),
        )
    }
}

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
        protocolClient = null,
        onDismissRequest = listener::onCheckoutDismissed,
        onFailure = { listener.onCheckoutFailed(CheckoutFailureEvent(it)) },
        reportInitializationFailure = true,
    )
}
