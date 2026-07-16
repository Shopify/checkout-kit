package com.shopify.checkoutkit

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color.TRANSPARENT
import android.net.Uri
import android.os.Build
import android.util.AttributeSet
import android.view.MotionEvent
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
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import java.net.HttpURLConnection.HTTP_GONE

@SuppressLint("SetJavaScriptEnabled")
internal abstract class BaseWebView(context: Context, attributeSet: AttributeSet? = null) :
    WebView(context, attributeSet) {

    private var lastTouchRawY = 0f
    private var touchGestureOwnerResolved = false

    init {
        configureWebView()
    }

    abstract fun getListener(): CheckoutWebViewListener

    /**
     * Keeps checkout scrolling in the WebView, but lets a parent container intercept a downward
     * gesture that starts while checkout is already at scroll-top.
     */
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchRawY = event.rawY
                touchGestureOwnerResolved = false
                requestDisallowInterceptTouchEvent(true)
            }
            MotionEvent.ACTION_MOVE -> {
                val dragDistance = event.rawY - lastTouchRawY
                lastTouchRawY = event.rawY
                if (!touchGestureOwnerResolved && dragDistance != 0f) {
                    touchGestureOwnerResolved = true
                    if (dragDistance > 0f && !canScrollVertically(SCROLL_UP_DIRECTION)) {
                        requestDisallowInterceptTouchEvent(false)
                    }
                }
            }
            MotionEvent.ACTION_UP,
            MotionEvent.ACTION_CANCEL -> {
                requestDisallowInterceptTouchEvent(false)
                touchGestureOwnerResolved = false
            }
        }
        return super.onTouchEvent(event)
    }

    private fun configureWebView() {
        visibility = VISIBLE
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowContentAccess = true
        }

        if (WebViewFeature.isFeatureSupported(
                WebViewFeature.PAYMENT_REQUEST
            )
        ) {
            WebSettingsCompat.setPaymentRequestEnabled(settings, true)
        }

        webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                log.d(LOG_TAG, "On progress change called. New progress $newProgress.")
                getListener().updateProgressBar(newProgress)
            }

            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                log.d(LOG_TAG, "onGeolocationPermissionsShowPrompt called, origin $origin, invoking listener callback.")
                getListener().onGeolocationPermissionsShowPrompt(origin, callback)
            }

            override fun onGeolocationPermissionsHidePrompt() {
                log.d(LOG_TAG, "onGeolocationPermissionsHidePrompt called, invoking listener callback.")
                getListener().onGeolocationPermissionsHidePrompt()
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                log.d(LOG_TAG, "onPermissionRequest called $request, invoking listener callback.")
                getListener().onPermissionRequest(request)
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                log.d(LOG_TAG, "onShowFileChooser called, invoking listener callback.")
                return getListener().onShowFileChooser(webView, filePathCallback, fileChooserParams)
            }
        }
        isHorizontalScrollBarEnabled = false
        setBackgroundColor(TRANSPARENT)
        layoutParams = LayoutParams(MATCH_PARENT, MATCH_PARENT)
        id = generateViewId()
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

    internal fun userAgentSuffix(): String {
        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        val platformPart = ShopifyCheckoutKit.configuration.platform?.run {
            " $identifier${version?.let { "/$it" } ?: ""}"
        } ?: ""
        val suffix = "ShopifyCheckoutKit/${BuildConfig.SDK_VERSION} (Android; Kotlin $kotlinVersion)$platformPart"
        log.d(LOG_TAG, "Setting User-Agent suffix $suffix")
        return suffix
    }

    open inner class BaseWebViewClient : WebViewClient() {
        init {
            if (BuildConfig.DEBUG) {
                log.d(LOG_TAG, "Setting web contents debugging enabled.")
                setWebContentsDebuggingEnabled(true)
            }
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !detail.didCrash()) {
                // Renderer was killed because system ran out of memory.
                log.d(LOG_TAG, "onRenderProcessGone called, calling onCheckoutFailedWithError")
                val listener = getListener()
                listener.onCheckoutViewFailedWithError(
                    CheckoutKitException(
                        errorDescription = "Render process gone.",
                        errorCode = CheckoutKitException.RENDER_PROCESS_GONE,
                    )
                )
                true
            } else {
                false
            }
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            super.onReceivedError(view, request, error)
            if (error != null) {
                handleError(
                    request,
                    error.errorCode,
                    error.description.toString()
                )
            }
        }

        override fun onReceivedHttpError(
            view: WebView?,
            request: WebResourceRequest?,
            errorResponse: WebResourceResponse?
        ) {
            super.onReceivedHttpError(view, request, errorResponse)
            if (errorResponse != null) {
                handleError(
                    request,
                    errorResponse.statusCode,
                    errorResponse.reasonPhrase.ifBlank { "HTTP ${errorResponse.statusCode} Error" },
                )
            }
        }

        private fun handleError(
            request: WebResourceRequest?,
            errorCode: Int,
            errorDescription: String,
        ) {
            if (request?.isForMainFrame == true) {
                log.d(
                    LOG_TAG,
                    "Handling error for main frame. URL: ${request.url.redactedForLogging()}, " +
                        "errorCode: $errorCode, errorDescription: $errorDescription"
                )
                val listener = getListener()
                when {
                    errorCode == HTTP_GONE -> {
                        log.d(LOG_TAG, "Failing with cart expired.")
                        listener.onCheckoutViewFailedWithError(
                            CheckoutExpiredException(
                                errorCode = CheckoutExpiredException.CART_EXPIRED
                            ),
                        )
                    }

                    else -> {
                        log.d(LOG_TAG, "Failing with other error. Code: $errorCode")
                        listener.onCheckoutViewFailedWithError(
                            HttpException(
                                errorDescription = errorDescription,
                                statusCode = errorCode,
                            )
                        )
                    }
                }
            }
        }
    }

    companion object {
        private const val LOG_TAG = "BaseWebView"
        internal const val ECP_LOG_TAG = "CheckoutECP"
    }
}

internal const val SCROLL_UP_DIRECTION: Int = -1

/**
 * Removes the WebView from its parent if a parent exists
 */
internal fun BaseWebView.removeFromParent() {
    val parent = this.parent
    if (parent is ViewGroup) {
        log.d("BaseWebView", "Existing parent found for WebView, removing.")
        parent.removeView(this)
    }
}
