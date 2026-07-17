package com.shopify.checkoutkit

import android.webkit.WebView
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import org.robolectric.annotation.RealObject
import org.robolectric.annotation.Resetter
import org.robolectric.shadows.ShadowWebView

@Implements(WebView::class)
class RecordingShadowWebView : ShadowWebView() {

    @RealObject
    private lateinit var webView: WebView

    @Implementation
    override fun loadUrl(url: String, additionalHttpHeaders: Map<String, String>?) {
        loadRequests.getOrPut(webView) { mutableListOf() }.add(
            LoadRequest(url, additionalHttpHeaders.orEmpty())
        )
        super.loadUrl(url, additionalHttpHeaders)
    }

    companion object {
        data class LoadRequest(
            val url: String,
            val headers: Map<String, String>,
        )

        private val loadRequests = mutableMapOf<WebView, MutableList<LoadRequest>>()

        fun loadRequestsFor(webView: WebView): List<LoadRequest> = loadRequests[webView].orEmpty()

        @Resetter
        @JvmStatic
        fun resetLoadRequests() {
            loadRequests.clear()
        }
    }
}
