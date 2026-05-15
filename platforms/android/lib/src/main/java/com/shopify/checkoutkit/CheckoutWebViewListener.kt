/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
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
 * Internal wrapper around the consumer-provided CheckoutListener. Handles dialog-internal
 * behavior (progress bar, modal header toggling, error close) and delegates the rest to
 * the listener.
 */
internal class CheckoutWebViewListener(
    private val listener: CheckoutListener,
    private val toggleHeader: (Boolean) -> Unit = {},
    private val closeCheckoutDialogWithError: (CheckoutException) -> Unit = { CheckoutWebView.clearCache() },
    private val setProgressBarVisibility: (Int) -> Unit = {},
    private val updateProgressBarPercentage: (Int) -> Unit = {},
) {
    fun onCheckoutViewModalToggled(modalVisible: Boolean) {
        onMainThread {
            toggleHeader(modalVisible)
        }
    }

    fun onCheckoutViewFailedWithError(error: CheckoutException) {
        onMainThread {
            closeCheckoutDialogWithError(error)
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
