package com.shopify.checkoutkit

import android.net.Uri
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.shopify.checkoutkit.ShopifyCheckoutKit.log

/**
 * Carries messages between the checkout WebView and the checkout protocol bridge.
 *
 * Keeping WebView-specific messaging behind this interface gives
 * [EmbeddedCheckoutProtocolBridge] a seam for injecting different implementations (including for
 * test).
 */
internal interface WebMessageTransport {
    /**
     * [onMessage] is invoked only for non-null string payloads.
     *
     * @return `true` when [onMessage] was registered, or `false` when WebMessageListener is not
     * supported.
     */
    fun attach(
        webView: WebView,
        jsObjectName: String,
        allowedOriginRules: Set<String>,
        onMessage: (message: String, isMainFrame: Boolean) -> Unit,
    ): Boolean

    /** Removes the listener registered under [jsObjectName]. */
    fun detach(webView: WebView, jsObjectName: String)

    /** Sends [message] to the JavaScript object named [targetObjectName]. */
    fun send(webView: WebView, targetObjectName: String, message: String)
}

/** Adapts AndroidX WebMessages to the text-only callback exposed by [WebMessageTransport]. */
internal class WebMessageListenerAdapter(
    private val onMessage: (message: String, isMainFrame: Boolean) -> Unit,
) : WebViewCompat.WebMessageListener {
    override fun onPostMessage(
        view: WebView,
        message: WebMessageCompat,
        sourceOrigin: Uri,
        isMainFrame: Boolean,
        replyProxy: JavaScriptReplyProxy,
    ) {
        if (message.type != WebMessageCompat.TYPE_STRING) {
            log.d(ECP_LOG_TAG, "Ignoring WebMessage with non-string payload.")
            return
        }

        val data = message.data
        if (data == null) {
            log.d(ECP_LOG_TAG, "Ignoring WebMessage with null payload.")
            return
        }

        onMessage(data, isMainFrame)
    }
}

/**
 * Production [WebMessageTransport] that receives messages through AndroidX WebKit's
 * WebMessageListener APIs and sends messages through the checkout's JavaScript response hook.
 *
 * WebMessageListener support is supplied by the installed WebView provider rather than the Android
 * framework, so availability is checked at runtime.
 */
internal object WebMessageListenerTransport : WebMessageTransport {
    override fun attach(
        webView: WebView,
        jsObjectName: String,
        allowedOriginRules: Set<String>,
        onMessage: (message: String, isMainFrame: Boolean) -> Unit,
    ): Boolean {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return false

        return try {
            WebViewCompat.addWebMessageListener(
                webView,
                jsObjectName,
                allowedOriginRules,
                WebMessageListenerAdapter(onMessage),
            )
            true
        } catch (_: UnsupportedOperationException) {
            false
        }
    }

    override fun detach(webView: WebView, jsObjectName: String) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return

        try {
            WebViewCompat.removeWebMessageListener(webView, jsObjectName)
        } catch (_: UnsupportedOperationException) {
            // Do not fail lifecycle cleanup when AndroidX reports the operation as unsupported.
        }
    }

    override fun send(webView: WebView, targetObjectName: String, message: String) {
        val escaped = message
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
        val script = """
            |if (window.$targetObjectName && window.$targetObjectName.postMessage) {
            |    window.$targetObjectName.postMessage(JSON.parse('$escaped'));
            |}
        """.trimMargin()
        onMainThread {
            webView.evaluateJavascript(script, null)
        }
    }
}

internal class UnsupportedWebViewException : IllegalStateException(ERROR_DESCRIPTION) {
    val checkoutError = CheckoutKitException(
        errorDescription = ERROR_DESCRIPTION,
        errorCode = CheckoutKitException.WEB_VIEW_NOT_SUPPORTED,
    )

    private companion object {
        private const val ERROR_DESCRIPTION = "This Android WebView does not support Shopify Checkout Kit."
    }
}
