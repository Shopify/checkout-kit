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
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import java.util.concurrent.CountDownLatch

internal class CheckoutWebView(context: Context, attributeSet: AttributeSet? = null) :
    BaseWebView(context, attributeSet) {

    private var listener = CheckoutWebViewListener(NoopCheckoutListener())
    private val embeddedCheckoutProtocol = EmbeddedCheckoutProtocolBridge(this)
    private var loadComplete = false
    internal var isPresented = false
        private set
    internal var isPreloadRequest = false
        private set

    init {
        webViewClient = CheckoutWebViewClient()
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)
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
        log.d(LOG_TAG, "Attached to window. Adding JavaScript interfaces.")
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        log.d(LOG_TAG, "Detached from window. Removing JavaScript interfaces.")
        removeJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)
    }

    fun loadCheckout(url: String, isPreload: Boolean = false) {
        log.d(LOG_TAG, "Loading checkout with url ${url.redactedUrlForLogging()}. IsPreload: $isPreload.")
        loadComplete = false
        isPreloadRequest = isPreload
        Handler(Looper.getMainLooper()).post {
            val checkoutUrl = CheckoutUrlDecorator.decorate(url)
            val headers = if (isPreload) {
                mutableMapOf(SHOPIFY_PURPOSE_HEADER to PREFETCH_PURPOSE)
            } else {
                mutableMapOf()
            }
            ShopifyCheckoutKit.configuration.cookieStore.prepare(checkoutUrl)
            loadUrl(checkoutUrl, headers)
        }
    }

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
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (request?.isForMainFrame == true) {
                CheckoutWebView.invalidate()
            }
            super.onReceivedError(view, request, error)
        }

        override fun onReceivedHttpError(
            view: WebView?,
            request: WebResourceRequest?,
            errorResponse: WebResourceResponse?
        ) {
            if (request?.isForMainFrame == true) {
                CheckoutWebView.invalidate()
            }
            super.onReceivedHttpError(view, request, errorResponse)
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

        private val preloadCache = PreloadCache()
        internal var cacheClock: PreloadCache.Clock
            get() = preloadCache.clock
            set(value) {
                preloadCache.clock = value
            }

        fun preload(url: String, activity: ComponentActivity) {
            if (!ShopifyCheckoutKit.configuration.preloading.enabled) {
                return
            }

            runOnUiThreadBlocking(activity) {
                invalidate()
                val view = CheckoutWebView(activity as Context).apply {
                    loadCheckout(url, isPreload = true)
                    log.d(LOG_TAG, "Pausing preloaded WebView.")
                    onPause()
                }
                preloadCache.store(PreloadKey.forUrl(url), view)
            }
        }

        fun checkoutViewFor(url: String, activity: ComponentActivity): CheckoutWebView {
            var checkoutWebView: CheckoutWebView? = null
            runOnUiThreadBlocking(activity) {
                val cachedView = if (ShopifyCheckoutKit.configuration.preloading.enabled) {
                    preloadCache.take(PreloadKey.forUrl(url))
                } else {
                    preloadCache.invalidate()
                    null
                }

                checkoutWebView = cachedView ?: run {
                    CheckoutWebView(activity as Context).apply {
                        loadCheckout(url)
                    }
                }
            }

            return checkoutWebView!!
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

            val countDownLatch = CountDownLatch(1)
            activity.runOnUiThread {
                action()
                countDownLatch.countDown()
            }
            countDownLatch.await()
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
