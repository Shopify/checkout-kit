/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
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

    private val checkoutBridge = CheckoutBridge(CheckoutWebViewListener(NoopCheckoutListener()))
    private val embeddedCheckoutProtocol = EmbeddedCheckoutProtocol(this)
    private var loadComplete = false

    init {
        webViewClient = CheckoutWebViewClient()
        addJavascriptInterface(checkoutBridge, JAVASCRIPT_INTERFACE_NAME)
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocol.INTERFACE_NAME)
        settings.userAgentString = "${settings.userAgentString} ${userAgentSuffix()}"
    }

    fun hasFinishedLoading() = loadComplete

    fun setListener(listener: CheckoutWebViewListener) {
        log.d(LOG_TAG, "Setting listener $listener.")
        checkoutBridge.setListener(listener)
    }

    fun setClient(client: CheckoutCommunicationClient?) {
        log.d(LOG_TAG, "Setting communication client $client.")
        embeddedCheckoutProtocol.setClient(client)
    }

    override fun getListener(): CheckoutWebViewListener {
        return checkoutBridge.getListener()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        log.d(LOG_TAG, "Attached to window. Adding JavaScript interfaces.")
        addJavascriptInterface(checkoutBridge, JAVASCRIPT_INTERFACE_NAME)
        addJavascriptInterface(embeddedCheckoutProtocol, EmbeddedCheckoutProtocol.INTERFACE_NAME)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        log.d(LOG_TAG, "Detached from window. Removing JavaScript interfaces.")
        removeJavascriptInterface(JAVASCRIPT_INTERFACE_NAME)
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
            checkoutBridge.getListener().onCheckoutViewLoadStarted()
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

            when (val result = ExternalUriLauncher.launch(context, uri)) {
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
        private const val JAVASCRIPT_INTERFACE_NAME = "android"
    }
}
