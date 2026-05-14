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
 * Interface to implement to allow responding to lifecycle events in checkout.
 * We'd strongly recommend extending DefaultCheckoutEventProcessor where possible
 */
public interface CheckoutEventProcessor {
    /**
     * Event representing the successful completion of a checkout.
     */
    public fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent)

    /**
     * Event representing an error that occurred during checkout. This can be used to display
     * error messages for example.
     *
     * @param error - the CheckoutErrorException that occurred
     * @see Exception
     */
    public fun onCheckoutFailed(error: CheckoutException)

    /**
     * Event representing the cancellation/closing of checkout by the buyer
     */
    public fun onCheckoutCanceled()

    /**
     * A permission has been requested by the web chrome client, e.g. to access the camera
     */
    public fun onPermissionRequest(permissionRequest: PermissionRequest)

    /**
     * Called when the client should show a file chooser. This is called to handle HTML forms with 'file' input type, in response to the
     * user pressing the "Select File" button. To cancel the request, call filePathCallback.onReceiveValue(null) and return true.
     */
    public fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: WebChromeClient.FileChooserParams,
    ): Boolean

    /**
     * Called when the client should show a location permissions prompt. For example when using 'Use my location' for
     * pickup points in checkout
     */
    public fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback)

    /**
     * Called when the client should hide the location permissions prompt, e.g. if th request is cancelled
     */
    public fun onGeolocationPermissionsHidePrompt()
}

internal class NoopEventProcessor : CheckoutEventProcessor {
    override fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent) {
        /* noop */
    }

    override fun onCheckoutFailed(error: CheckoutException) {
        /* noop */
    }

    override fun onCheckoutCanceled() {
        /* noop */
    }

    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: WebChromeClient.FileChooserParams,
    ): Boolean {
        return false
    }

    override fun onPermissionRequest(permissionRequest: PermissionRequest) {
        /* noop */
    }

    override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        /* noop */
    }

    override fun onGeolocationPermissionsHidePrompt() {
        /* noop */
    }
}

/**
 * An abstract class that provides a default implementation of the CheckoutEventProcessor interface
 * for the optional permission and file-chooser callbacks. Override in subclasses as needed.
 */
public abstract class DefaultCheckoutEventProcessor : CheckoutEventProcessor {

    override fun onPermissionRequest(permissionRequest: PermissionRequest) {
        // no-op override to implement
    }

    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: WebChromeClient.FileChooserParams,
    ): Boolean {
        return false
    }

    override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        // no-op override to implement
    }

    override fun onGeolocationPermissionsHidePrompt() {
        // no-op override to implement
    }
}
