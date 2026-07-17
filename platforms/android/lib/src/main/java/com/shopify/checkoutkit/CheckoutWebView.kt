package com.shopify.checkoutkit

import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient.ERROR_CONNECT
import android.webkit.WebViewClient.ERROR_HOST_LOOKUP
import android.webkit.WebViewClient.ERROR_TIMEOUT
import androidx.activity.ComponentActivity
import androidx.annotation.MainThread
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import java.util.concurrent.CountDownLatch

internal class CheckoutWebView private constructor(
    context: Context,
    attributeSet: AttributeSet?,
    webMessageTransport: WebMessageTransport,
) : BaseWebView(context, attributeSet) {

    constructor(context: Context, attributeSet: AttributeSet? = null) :
        this(context, attributeSet, WebMessageListenerTransport)

    internal constructor(context: Context, webMessageTransport: WebMessageTransport) :
        this(context, null, webMessageTransport)

    private var listener = CheckoutWebViewListener(NoopCheckoutListener())
    private val embeddedCheckoutProtocol = EmbeddedCheckoutProtocolBridge(this, webMessageTransport)
    private var loadComplete = false
    internal var isPresented = false
        private set
    internal var isPreloadRequest = false
        private set
    private var checkoutRequest: CheckoutRequest? = null
    private var didRetryCheckoutRequest = false

    init {
        webViewClient = CheckoutWebViewClient()
        try {
            embeddedCheckoutProtocol.attach()
        } catch (error: UnsupportedWebViewException) {
            destroy()
            throw error
        }
        settings.userAgentString = "${settings.userAgentString} ${userAgentSuffix()}"
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

    override fun getListener(): CheckoutWebViewListener {
        return listener
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
        log.d(LOG_TAG, "Loading checkout with url ${url.redactedUrlForLogging()}. IsPreload: $isPreload.")
        loadComplete = false
        isPreloadRequest = isPreload
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

    inner class CheckoutWebViewClient : BaseWebViewClient() {

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            CheckoutWebView.invalidate()
            return super.onRenderProcessGone(view, detail)
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            super.onPageStarted(view, url, favicon)
            log.d(LOG_TAG, "onPageStarted called ${url?.redactedUrlForLogging()}.")
            getListener().onCheckoutViewLoadStarted()
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            log.d(LOG_TAG, "onPageFinished called ${url.redactedUrlForLogging()}.")
            loadComplete = true
            getListener().onCheckoutViewLoadComplete()
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
                CheckoutWebView.invalidate()
            }
            super.onReceivedError(view, request, error)
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
                CheckoutWebView.invalidate()
            }
            super.onReceivedHttpError(view, request, errorResponse)
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
                    log.d(LOG_TAG, "Deep link intercepted: ${uri.redactedForLogging()} — rejected (${result.reason})")
            }
            return true
        }
    }

    companion object {
        private const val LOG_TAG = "CheckoutWebView"
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
        ) {
            if (!ShopifyCheckoutKit.configuration.preloading.enabled) {
                return
            }

            try {
                runOnUiThreadBlocking(activity) {
                    invalidate()
                    val view = CheckoutWebView(activity, webMessageTransport).apply {
                        loadCheckout(url, isPreload = true)
                        log.d(LOG_TAG, "Pausing preloaded WebView.")
                        onPause()
                    }
                    preloadCache.store(PreloadKey.forUrl(url), view)
                }
            } catch (_: UnsupportedWebViewException) {
                return
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
                preloadCache.invalidate()
            }
        }

        fun clearCache() {
            if (!preloadCache.hasEntry) return
            invalidate()
        }

        private fun runOnUiThreadBlocking(activity: ComponentActivity, action: () -> Unit) {
            if (Looper.myLooper() == Looper.getMainLooper()) {
                action()
                return
            }

            var result: Result<Unit>? = null
            val countDownLatch = CountDownLatch(1)
            activity.runOnUiThread {
                result = runCatching { action() }
                countDownLatch.countDown()
            }
            countDownLatch.await()
            result?.getOrThrow()
        }

        private fun runOnMainThread(action: () -> Unit) {
            if (Looper.myLooper() == Looper.getMainLooper()) {
                action()
            } else {
                Handler(Looper.getMainLooper()).post(action)
            }
        }

        internal fun cachedPreloadViewForTesting(): CheckoutWebView? = preloadCache.cachedViewForTesting()
    }
}
