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
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEvent

/**
 * Kotlin-first builder for per-presentation checkout callbacks.
 *
 * Use through [ShopifyCheckoutKit.present].
 */
public class CheckoutPresentation internal constructor() {
    internal var onFail: ((CheckoutException) -> Unit)? = null
    internal var onCancel: (() -> Unit)? = null
    internal var onPermissionRequest: ((PermissionRequest) -> Unit)? = null
    internal var onShowFileChooser:
        ((WebView, ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams) -> Boolean)? = null
    internal var onGeolocationPermissionsShowPrompt:
        ((String, GeolocationPermissions.Callback) -> Unit)? = null
    internal var onGeolocationPermissionsHidePrompt: (() -> Unit)? = null
    internal var communicationClient: CheckoutCommunicationClient? = null

    /**
     * Called when checkout fails.
     */
    public fun onFail(handler: (CheckoutException) -> Unit) {
        onFail = handler
    }

    /**
     * Called when checkout is canceled by the buyer.
     */
    public fun onCancel(handler: () -> Unit) {
        onCancel = handler
    }

    /**
     * Called when checkout requests a web permission, such as camera access.
     */
    public fun onPermissionRequest(handler: (PermissionRequest) -> Unit) {
        onPermissionRequest = handler
    }

    /**
     * Called when checkout requests that the host app present a file chooser.
     */
    public fun onShowFileChooser(
        handler: (
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: WebChromeClient.FileChooserParams,
        ) -> Boolean,
    ) {
        onShowFileChooser = handler
    }

    /**
     * Called when checkout requests that the host app present a geolocation prompt.
     */
    public fun onGeolocationPermissionsShowPrompt(
        handler: (origin: String, callback: GeolocationPermissions.Callback) -> Unit,
    ) {
        onGeolocationPermissionsShowPrompt = handler
    }

    /**
     * Called when checkout requests that any visible geolocation prompt be dismissed.
     */
    public fun onGeolocationPermissionsHidePrompt(handler: () -> Unit) {
        onGeolocationPermissionsHidePrompt = handler
    }

    /**
     * Connects a communication client for Embedded Checkout Protocol messages.
     */
    public fun connect(client: CheckoutCommunicationClient?) {
        communicationClient = client
    }

    internal fun buildEventProcessor(): DefaultCheckoutEventProcessor =
        object : DefaultCheckoutEventProcessor() {
            override fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent) = Unit

            override fun onCheckoutFailed(error: CheckoutException) {
                onFail?.invoke(error)
            }

            override fun onCheckoutCanceled() {
                onCancel?.invoke()
            }

            override fun onPermissionRequest(permissionRequest: PermissionRequest) {
                onPermissionRequest?.invoke(permissionRequest)
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: WebChromeClient.FileChooserParams,
            ): Boolean {
                return onShowFileChooser?.invoke(webView, filePathCallback, fileChooserParams) ?: false
            }

            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                onGeolocationPermissionsShowPrompt?.invoke(origin, callback)
            }

            override fun onGeolocationPermissionsHidePrompt() {
                onGeolocationPermissionsHidePrompt?.invoke()
            }
        }
}
