package com.shopify.checkoutkit

import android.content.Context
import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.webkit.WebResourceRequest
import android.webkit.WebView
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

internal class CheckoutWebView(context: Context, attributeSet: AttributeSet? = null) :
    BaseWebView(context, attributeSet) {

    private var listener = CheckoutWebViewListener(NoopCheckoutListener())
    private val embeddedCheckoutProtocol = EmbeddedCheckoutProtocol(this)
    private var loadComplete = false

    init {
        webViewClient = CheckoutWebViewClient()
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocol.INTERFACE_NAME)
        settings.userAgentString = "${settings.userAgentString} ${userAgentSuffix()}"
    }

    fun hasFinishedLoading() = loadComplete

    fun setListener(listener: CheckoutWebViewListener) {
        log.d(LOG_TAG, "Setting listener $listener.")
        this.listener = listener
    }

    fun setClient(client: CheckoutCommunicationClient?) {
        log.d(LOG_TAG, "Setting communication client $client.")
        embeddedCheckoutProtocol.setClient(client)
    }

    override fun getListener(): CheckoutWebViewListener {
        return listener
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        log.d(LOG_TAG, "Attached to window. Adding JavaScript interfaces.")
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocol.INTERFACE_NAME)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        log.d(LOG_TAG, "Detached from window. Removing JavaScript interfaces.")
        removeJavascriptInterface(EmbeddedCheckoutProtocol.INTERFACE_NAME)
    }

    fun loadCheckout(url: String) {
        log.d(LOG_TAG, "Loading checkout with url $url.")
        Handler(Looper.getMainLooper()).post {
            val ecpUrl = url.appendEcpParams(specVersion = CheckoutProtocol.specVersion)
            loadUrl(ecpUrl)
        }
    }

    inner class CheckoutWebViewClient : BaseWebView.BaseWebViewClient() {

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            super.onPageStarted(view, url, favicon)
            log.d(LOG_TAG, "onPageStarted called $url.")
            getListener().onCheckoutViewLoadStarted()
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            log.d(LOG_TAG, "onPageFinished called $url.")
            loadComplete = true
            getListener().onCheckoutViewLoadComplete()
        }

        override fun shouldOverrideUrlLoading(
            view: WebView?,
            request: WebResourceRequest?
        ): Boolean {
            val uri = request?.url
            if (uri == null || (!uri.isContactLink() && !uri.isDeepLink())) return false

            when (val result = ExternalUriLauncher.launchExternalApp(context, uri)) {
                is ExternalUriLauncher.Result.Launched ->
                    log.d(LOG_TAG, "Deep link intercepted: $uri — allowed")
                is ExternalUriLauncher.Result.Rejected ->
                    log.d(LOG_TAG, "Deep link intercepted: $uri — rejected (${result.reason})")
            }
            return true
        }
    }

    companion object {
        private const val LOG_TAG = "CheckoutWebView"
    }
}
