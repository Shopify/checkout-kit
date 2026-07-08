package com.shopify.checkoutkit

import android.webkit.WebView

internal class FakeWebMessageTransport(
    var supported: Boolean = true,
) : WebMessageTransport {
    data class Attachment(
        val webView: WebView,
        val jsObjectName: String,
        val allowedOriginRules: Set<String>,
    )

    data class Detachment(
        val webView: WebView,
        val jsObjectName: String,
    )

    data class SentMessage(
        val targetObjectName: String,
        val message: String,
    )

    private var onMessage: ((message: String, isMainFrame: Boolean) -> Unit)? = null
    var lastAttachment: Attachment? = null
        private set
    var lastDetachment: Detachment? = null
        private set
    val sentMessages = mutableListOf<SentMessage>()
    var attachCount = 0
        private set
    var detachCount = 0
        private set

    override fun attach(
        webView: WebView,
        jsObjectName: String,
        allowedOriginRules: Set<String>,
        onMessage: (message: String, isMainFrame: Boolean) -> Unit,
    ): Boolean {
        attachCount += 1
        if (!supported) return false

        lastAttachment = Attachment(webView, jsObjectName, allowedOriginRules.toSet())
        this.onMessage = onMessage
        return true
    }

    override fun detach(webView: WebView, jsObjectName: String) {
        detachCount += 1
        lastDetachment = Detachment(webView, jsObjectName)
        onMessage = null
    }

    override fun send(webView: WebView, targetObjectName: String, message: String) {
        sentMessages += SentMessage(targetObjectName, message)
    }

    fun dispatchMessage(
        message: String,
        isMainFrame: Boolean = true,
    ) {
        checkNotNull(onMessage)(message, isMainFrame)
    }
}
