package com.shopify.checkoutkit

import android.net.Uri
import android.view.View.INVISIBLE
import android.view.View.VISIBLE
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebView

/**
 * Internal wrapper around the consumer-provided CheckoutListener. Handles presentation-internal
 * behavior (progress bar and error close) and delegates the rest to the listener.
 */
internal class CheckoutWebViewListener(
    private val listener: CheckoutListener,
    private val closeCheckoutWithError: (CheckoutException) -> Unit = {},
    private val setProgressBarVisibility: (Int) -> Unit = {},
    private val hideLoadingBackground: () -> Unit = {},
    private val updateProgressBarPercentage: (Int) -> Unit = {},
) {
    fun onCheckoutViewFailedWithError(error: CheckoutException) {
        onMainThread {
            closeCheckoutWithError(error)
        }
    }

    fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        return listener.onGeolocationPermissionsShowPrompt(origin, callback)
    }

    fun onGeolocationPermissionsHidePrompt() {
        return listener.onGeolocationPermissionsHidePrompt()
    }

    fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams,
    ): Boolean {
        return listener.onShowFileChooser(webView, filePathCallback, fileChooserParams)
    }

    fun onPermissionRequest(permissionRequest: PermissionRequest) {
        onMainThread {
            listener.onPermissionRequest(permissionRequest)
        }
    }

    fun onCheckoutViewLoadComplete() {
        onMainThread {
            setProgressBarVisibility(INVISIBLE)
            hideLoadingBackground()
        }
    }

    fun updateProgressBar(progress: Int) {
        onMainThread {
            updateProgressBarPercentage(progress)
        }
    }

    fun onCheckoutViewLoadStarted() {
        onMainThread {
            setProgressBarVisibility(VISIBLE)
        }
    }
}
