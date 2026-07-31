package com.shopify.checkoutkit.androiddemo.settings.authentication

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.shopify.checkoutkit.androiddemo.BuildConfig

/**
 * WebView used to display the login page and intercept authorization code param redirects
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun LoginWebView(
    url: String,
    modifier: Modifier = Modifier,
    customerAccountApiRedirectUri: String,
    onCodeParamIntercepted: (String) -> Unit = {},
) {
    AndroidView(
        factory = {
            WebView(it).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                settings.apply {
                    javaScriptEnabled = true
                    BuildConfig.customUserAgent.takeIf(String::isNotEmpty)?.let { suffix ->
                        userAgentString = "$userAgentString $suffix"
                    }
                }
                webViewClient = AuthenticationWebViewClient(customerAccountApiRedirectUri, onCodeParamIntercepted)
            }
        },
        update = { it.loadUrl(url) },
        modifier = modifier,
    )
}

/**
 * Override URL loading when redirected to the
 * [redirect_uri](https://shopify.dev/docs/api/customer#authorization-propertydetail-redirecturi)
 * with a [code](https://shopify.dev/docs/api/customer#step-code) query parameter.
 */
class AuthenticationWebViewClient(
    private val customerAccountApiRedirectUri: String,
    private val onCodeParamIntercepted: (String) -> Unit
) : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        if ("${request.url.scheme}://${request.url.host}" != customerAccountApiRedirectUri) {
            return super.shouldOverrideUrlLoading(view, request)
        }

        val codeQueryParam = request.url.getQueryParameter("code") ?: return super.shouldOverrideUrlLoading(view, request)

        onCodeParamIntercepted(codeQueryParam)
        return true
    }
}
