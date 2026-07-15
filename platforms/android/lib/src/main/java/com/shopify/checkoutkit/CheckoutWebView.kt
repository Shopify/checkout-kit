package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color.TRANSPARENT
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebViewClient.ERROR_CONNECT
import android.webkit.WebViewClient.ERROR_HOST_LOOKUP
import android.webkit.WebViewClient.ERROR_TIMEOUT
import androidx.activity.ComponentActivity
import androidx.annotation.MainThread
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import java.util.concurrent.CountDownLatch

internal class CheckoutWebView private constructor(
    context: Context,
    attributeSet: AttributeSet?,
    webMessageTransport: WebMessageTransport,
) : WebView(context, attributeSet) {

    constructor(context: Context, attributeSet: AttributeSet? = null) :
        this(context, attributeSet, WebMessageListenerTransport)

    internal constructor(context: Context, webMessageTransport: WebMessageTransport) :
        this(context, null, webMessageTransport)

    internal var listener = CheckoutWebViewListener(NoopCheckoutListener())
        private set
    private val embeddedCheckoutProtocol = EmbeddedCheckoutProtocolBridge(this, webMessageTransport)
    private var loadComplete = false
    internal var isPresented = false
        private set

    @Volatile
    internal var isPreloadRequest = false
        private set

    private var checkoutRequest: CheckoutRequest? = null
    private var didRetryCheckoutRequest = false
    private val touchHandler = CheckoutWebViewTouchHandler()

    /** Origin of the loaded checkout URL, trusted as a safe default for incoming-message validation. */
    internal var checkoutOrigin: String? = null
        private set

    init {
        configureWebView(::listener)
        webViewClient = CheckoutWebViewClient()
        try {
            embeddedCheckoutProtocol.attach()
        } catch (error: UnsupportedWebViewException) {
            destroy()
            throw error
        }
        settings.userAgentString = "${settings.userAgentString} ${checkoutUserAgentSuffix()}"
    }

    fun hasFinishedLoading() = loadComplete

    fun setListener(listener: CheckoutWebViewListener) {
        log.d(LOG_TAG, "Setting listener $listener.")
        this.listener = listener
    }

    fun setClient(client: CheckoutProtocol.Client?) {
        log.d(LOG_TAG, "Setting protocol client $client.")
        embeddedCheckoutProtocol.setClient(client)
    }

    fun markPresented() {
        isPresented = true
    }

    internal fun markDismissed() {
        isPresented = false
    }

    /**
     * Keeps checkout scrolling in the WebView, but lets a parent container intercept a downward
     * gesture that starts while checkout is already at scroll-top.
     */
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        touchHandler.handle(this, event)
        return super.onTouchEvent(event)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        log.d(LOG_TAG, "Attached to window. Adding protocol bridge.")
        embeddedCheckoutProtocol.attach()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        log.d(LOG_TAG, "Detached from window. Removing protocol bridge.")
        embeddedCheckoutProtocol.detach()
    }

    fun loadCheckout(url: String, isPreload: Boolean = false) {
        log.d(
            LOG_TAG,
            "Loading checkout with url ${url.redactedUrlForLogging()}. IsPreload: $isPreload."
        )
        loadComplete = false
        isPreloadRequest = isPreload
        checkoutOrigin = OriginAllowlist.originFromUrl(url)
        Handler(Looper.getMainLooper()).post {
            val request = CheckoutRequest(
                url = CheckoutUrlDecorator.decorate(url),
                headers = if (isPreload) {
                    mapOf(SHOPIFY_PURPOSE_HEADER to PREFETCH_PURPOSE)
                } else {
                    emptyMap()
                },
            )
            checkoutRequest = request
            didRetryCheckoutRequest = false
            loadCheckoutRequest(request)
        }
    }

    private fun loadCheckoutRequest(request: CheckoutRequest) {
        loadUrl(request.url, request.headers)
    }

    private fun shouldRetryCheckoutRequest(
        request: WebResourceRequest?,
        error: WebResourceError?,
    ): Boolean {
        return request?.isForMainFrame == true &&
            !didRetryCheckoutRequest &&
            checkoutRequest != null &&
            error?.errorCode in RETRYABLE_CHECKOUT_ERROR_CODES
    }

    private fun resetCheckoutRequestRetryState() {
        checkoutRequest = null
        didRetryCheckoutRequest = false
    }

    private data class CheckoutRequest(
        val url: String,
        val headers: Map<String, String>,
    )

    internal fun markPreloadConsumed() {
        isPreloadRequest = false
    }

    inner class CheckoutWebViewClient : WebViewClient() {

        init {
            if (BuildConfig.DEBUG) {
                log.d(LOG_TAG, "Setting web contents debugging enabled.")
                setWebContentsDebuggingEnabled(true)
            }
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            preloadCache.evict(this@CheckoutWebView, PreloadState.Idle)
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !detail.didCrash()) {
                // Renderer was killed because system ran out of memory.
                log.d(LOG_TAG, "onRenderProcessGone called, calling onCheckoutFailedWithError")
                listener.onCheckoutViewFailedWithError(
                    CheckoutException.webContentProcessTerminated("Render process gone.")
                )
                true
            } else {
                false
            }
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            super.onPageStarted(view, url, favicon)
            log.d(LOG_TAG, "onPageStarted called ${url?.redactedUrlForLogging()}.")
            listener.onCheckoutViewLoadStarted()
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            log.d(LOG_TAG, "onPageFinished called ${url.redactedUrlForLogging()}.")
            loadComplete = true
            preloadCache.transition(this@CheckoutWebView, PreloadState.Ready)
            listener.onCheckoutViewLoadComplete()
            resetCheckoutRequestRetryState()
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (shouldRetryCheckoutRequest(request, error)) {
                val checkoutRequest = requireNotNull(checkoutRequest)
                didRetryCheckoutRequest = true
                log.w(
                    LOG_TAG,
                    "Retrying checkout navigation. Error code: ${error?.errorCode}, " +
                        "URL: ${request?.url?.redactedForLogging()}"
                )
                loadCheckoutRequest(checkoutRequest)
                return
            }

            val isMainFrame = request?.isForMainFrame == true
            if (isMainFrame) {
                preloadCache.evict(
                    this@CheckoutWebView,
                    PreloadState.Failed(PreloadState.FailureReason.NavigationFailed),
                )
            }
            super.onReceivedError(view, request, error)
            error?.let {
                handleClientError(request, it)
            }
            if (isMainFrame) {
                resetCheckoutRequestRetryState()
            }
        }

        override fun onReceivedHttpError(
            view: WebView?,
            request: WebResourceRequest?,
            errorResponse: WebResourceResponse?
        ) {
            val isMainFrame = request?.isForMainFrame == true
            if (isMainFrame) {
                val statusCode = errorResponse?.statusCode ?: 0
                preloadCache.evict(
                    this@CheckoutWebView,
                    PreloadState.Failed(PreloadState.FailureReason.HttpError(statusCode)),
                )
            }
            super.onReceivedHttpError(view, request, errorResponse)
            errorResponse?.let {
                handleHttpError(
                    request,
                    it.statusCode,
                    it.reasonPhrase.ifBlank { "HTTP ${it.statusCode} Error" },
                )
            }
            if (isMainFrame) {
                resetCheckoutRequestRetryState()
            }
        }

        override fun shouldOverrideUrlLoading(
            view: WebView?,
            request: WebResourceRequest?
        ): Boolean {
            val uri = request?.url
            if (uri == null || (!uri.isContactLink() && !uri.isDeepLink())) return false

            when (val result = ExternalUriLauncher.launch(context, uri)) {
                is ExternalUriLauncher.Result.Launched ->
                    log.d(LOG_TAG, "Deep link intercepted: ${uri.redactedForLogging()} — allowed")
                is ExternalUriLauncher.Result.Rejected ->
                    log.d(
                        LOG_TAG,
                        "Deep link intercepted: ${uri.redactedForLogging()} — rejected (${result.reason})"
                    )
            }
            return true
        }

        private fun handleClientError(
            request: WebResourceRequest?,
            error: WebResourceError,
        ) {
            if (request?.isForMainFrame != true) return

            val errorDescription = error.description.toString()
            log.d(
                LOG_TAG,
                "Handling client error for main frame. URL: ${request.url.redactedForLogging()}, " +
                    "errorCode: ${error.errorCode}, errorDescription: $errorDescription"
            )
            val failure = if (error.errorCode in RETRYABLE_CHECKOUT_ERROR_CODES) {
                CheckoutException.network(errorDescription)
            } else {
                CheckoutException.unknown(errorDescription)
            }
            listener.onCheckoutViewFailedWithError(failure)
        }

        private fun handleHttpError(
            request: WebResourceRequest?,
            statusCode: Int,
            errorDescription: String,
        ) {
            if (request?.isForMainFrame != true) return

            log.d(
                LOG_TAG,
                "Handling HTTP error for main frame. URL: ${request.url.redactedForLogging()}, " +
                    "statusCode: $statusCode, errorDescription: $errorDescription"
            )
            listener.onCheckoutViewFailedWithError(
                CheckoutException.http(statusCode, errorDescription),
            )
        }
    }

    internal fun handleBackPressed(): Boolean {
        if (canGoBack() && !isOnConfirmationPage()) {
            log.d(LOG_TAG, "Back navigation handled by WebView history.")
            goBack()
            return true
        }
        return false
    }

    private fun isOnConfirmationPage(): Boolean = url?.let(Uri::parse).isConfirmationPage()

    companion object {
        private const val SHOPIFY_PURPOSE_HEADER = "Shopify-Purpose"
        private const val PREFETCH_PURPOSE = "prefetch"
        private val RETRYABLE_CHECKOUT_ERROR_CODES = setOf(
            ERROR_TIMEOUT,
            ERROR_CONNECT,
            ERROR_HOST_LOOKUP,
        )
        private val preloadCache = PreloadCache()

        internal var cacheClock: PreloadCache.Clock
            get() = preloadCache.clock
            set(value) {
                preloadCache.clock = value
            }

        fun preload(
            url: String,
            activity: ComponentActivity,
            webMessageTransport: WebMessageTransport = WebMessageListenerTransport,
            listener: PreloadStateListener? = null,
        ): CheckoutPreload? {
            if (!ShopifyCheckoutKit.configuration.preloading.enabled) {
                return null
            }

            return try {
                runOnUiThreadBlocking(activity) {
                    val view = CheckoutWebView(activity, webMessageTransport)
                    val handle = CheckoutPreload(preloadCache)
                    view.apply {
                        loadCheckout(url, isPreload = true)
                        log.d(LOG_TAG, "Pausing preloaded WebView.")
                        onPause()
                    }
                    preloadCache.store(PreloadKey.forUrl(url), view, activity)
                    handle.listener = listener
                    handle
                }
            } catch (_: UnsupportedWebViewException) {
                null
            }
        }

        @MainThread
        internal fun checkoutViewFor(
            url: String,
            context: Context,
            webMessageTransport: WebMessageTransport = WebMessageListenerTransport,
        ): CheckoutWebView {
            check(Looper.myLooper() == Looper.getMainLooper()) {
                "Checkout views must be created on the main thread."
            }
            val cachedView = if (ShopifyCheckoutKit.configuration.preloading.enabled) {
                preloadCache.take(PreloadKey.forUrl(url))
            } else {
                preloadCache.invalidate()
                null
            }

            return cachedView ?: run {
                CheckoutWebView(context, webMessageTransport).apply {
                    loadCheckout(url)
                }
            }
        }

        fun invalidate() {
            runOnMainThread {
                preloadCache.evict(PreloadState.Idle)
            }
        }

        fun clearCache() {
            if (!preloadCache.hasEntry) return
            invalidate()
        }

        internal fun releaseAfterPresentation(view: CheckoutWebView): Boolean =
            preloadCache.release(view)

        internal fun discardAfterPresentation(view: CheckoutWebView) {
            preloadCache.discard(view)
        }

        private fun <T> runOnUiThreadBlocking(activity: ComponentActivity, action: () -> T): T {
            if (Looper.myLooper() == Looper.getMainLooper()) {
                return action()
            }

            var result: Result<T>? = null
            val countDownLatch = CountDownLatch(1)
            activity.runOnUiThread {
                result = runCatching { action() }
                countDownLatch.countDown()
            }
            countDownLatch.await()
            return requireNotNull(result).getOrThrow()
        }

        private fun runOnMainThread(action: () -> Unit) {
            if (Looper.myLooper() == Looper.getMainLooper()) {
                action()
            } else {
                Handler(Looper.getMainLooper()).post(action)
            }
        }

        internal fun cachedPreloadViewForTesting(): CheckoutWebView? = preloadCache.cachedViewForTesting()

        internal fun hasCacheEntryForTesting(): Boolean = preloadCache.hasEntry
    }
}

private const val LOG_TAG = "CheckoutWebView"

internal class CheckoutWebViewTouchHandler {
    private var lastTouchRawY = 0f
    private var touchGestureOwnerResolved = false

    fun handle(webView: WebView, event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchRawY = event.rawY
                touchGestureOwnerResolved = false
                webView.requestDisallowInterceptTouchEvent(true)
            }
            MotionEvent.ACTION_MOVE -> {
                val dragDistance = event.rawY - lastTouchRawY
                lastTouchRawY = event.rawY
                if (!touchGestureOwnerResolved && dragDistance != 0f) {
                    touchGestureOwnerResolved = true
                    if (dragDistance > 0f && !webView.canScrollVertically(SCROLL_UP_DIRECTION)) {
                        webView.requestDisallowInterceptTouchEvent(false)
                    }
                }
            }
            MotionEvent.ACTION_UP,
            MotionEvent.ACTION_CANCEL -> {
                webView.requestDisallowInterceptTouchEvent(false)
                touchGestureOwnerResolved = false
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
private fun WebView.configureWebView(listener: () -> CheckoutWebViewListener) {
    visibility = View.VISIBLE
    settings.apply {
        javaScriptEnabled = true
        domStorageEnabled = true
        allowContentAccess = true
    }
    if (WebViewFeature.isFeatureSupported(WebViewFeature.PAYMENT_REQUEST)) {
        WebSettingsCompat.setPaymentRequestEnabled(settings, true)
    }

    webChromeClient = object : WebChromeClient() {
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            super.onProgressChanged(view, newProgress)
            log.d(LOG_TAG, "On progress change called. New progress $newProgress.")
            listener().updateProgressBar(newProgress)
        }

        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
            log.d(LOG_TAG, "onGeolocationPermissionsShowPrompt called, origin $origin, invoking listener callback.")
            listener().onGeolocationPermissionsShowPrompt(origin, callback)
        }

        override fun onGeolocationPermissionsHidePrompt() {
            log.d(LOG_TAG, "onGeolocationPermissionsHidePrompt called, invoking listener callback.")
            listener().onGeolocationPermissionsHidePrompt()
        }

        override fun onPermissionRequest(request: PermissionRequest) {
            log.d(LOG_TAG, "onPermissionRequest called $request, invoking listener callback.")
            listener().onPermissionRequest(request)
        }

        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean {
            log.d(LOG_TAG, "onShowFileChooser called, invoking listener callback.")
            return listener().onShowFileChooser(webView, filePathCallback, fileChooserParams)
        }
    }
    isHorizontalScrollBarEnabled = false
    setBackgroundColor(TRANSPARENT)
    layoutParams = LayoutParams(MATCH_PARENT, MATCH_PARENT)
    id = View.generateViewId()
}

private fun checkoutUserAgentSuffix(): String {
    val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
    val platformPart = ShopifyCheckoutKit.configuration.platform?.run {
        " $identifier${version?.let { "/$it" } ?: ""}"
    } ?: ""
    val suffix = "ShopifyCheckoutKit/${BuildConfig.SDK_VERSION} (Android; Kotlin $kotlinVersion)$platformPart"
    log.d(LOG_TAG, "Setting User-Agent suffix $suffix")
    return suffix
}

/** Removes the WebView from its parent if a parent exists. */
internal fun CheckoutWebView.removeFromParent() {
    val parent = parent
    if (parent is ViewGroup) {
        log.d(LOG_TAG, "Existing parent found for WebView, removing.")
        parent.removeView(this)
    }
}
