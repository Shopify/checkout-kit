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
    /**
     * Reports checkout load failure through the presentation close path.
     */
    fun onCheckoutViewFailedWithError(error: CheckoutException) {
        onMainThread {
            closeCheckoutWithError(error)
        }
    }

    /**
     * Delegates geolocation permission prompts to the consumer listener.
     */
    fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        return listener.onGeolocationPermissionsShowPrompt(origin, callback)
    }

    /**
     * Delegates geolocation prompt dismissal to the consumer listener.
     */
    fun onGeolocationPermissionsHidePrompt() {
        return listener.onGeolocationPermissionsHidePrompt()
    }

    /**
     * Delegates file chooser requests to the consumer listener.
     */
    fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams,
    ): Boolean {
        return listener.onShowFileChooser(webView, filePathCallback, fileChooserParams)
    }

    /**
     * Delegates WebView permission requests to the consumer listener on the main thread.
     */
    fun onPermissionRequest(permissionRequest: PermissionRequest) {
        onMainThread {
            listener.onPermissionRequest(permissionRequest)
        }
    }

    /**
     * Clears presentation loading UI once the checkout WebView has completed its first visible load.
     */
    fun onCheckoutViewLoadComplete() {
        onMainThread {
            setProgressBarVisibility(INVISIBLE)
            hideLoadingBackground()
        }
    }

    /**
     * Forwards WebView load progress to the native progress indicator.
     */
    fun updateProgressBar(progress: Int) {
        onMainThread {
            updateProgressBarPercentage(progress)
        }
    }

    /**
     * Shows presentation loading UI when WebView navigation starts.
     */
    fun onCheckoutViewLoadStarted() {
        onMainThread {
            setProgressBarVisibility(VISIBLE)
        }
    }
}
