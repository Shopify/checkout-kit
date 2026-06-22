package com.shopify.checkoutkit

import android.net.Uri
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

/**
 * Interface to implement to allow responding to lifecycle events in checkout.
 * We'd strongly recommend extending DefaultCheckoutListener where possible.
 *
 * Completion (`ec.complete`) and in-checkout state updates (totals, line items,
 * messages) flow through [CheckoutProtocol.Client] / the Embedded Checkout
 * Protocol — not through this interface. Kit-level failures continue to surface
 * here via [onCheckoutFailed].
 */
public interface CheckoutListener {
    /**
     * Event representing an error that occurred during checkout. This can be used to display
     * error messages for example.
     *
     * @param error - the CheckoutErrorException that occurred
     * @see Exception
     */
    public fun onCheckoutFailed(error: CheckoutException)

    /**
     * Event representing the cancellation/closing of checkout by the buyer.
     */
    public fun onCheckoutCanceled()

    /**
     * A permission has been requested by the web chrome client, e.g. to access the camera.
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
     * pickup points in checkout.
     */
    public fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback)

    /**
     * Called when the client should hide the location permissions prompt, e.g. if the request is canceled.
     */
    public fun onGeolocationPermissionsHidePrompt()
}

internal class NoopCheckoutListener : CheckoutListener {
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
 * An abstract class that provides a default implementation of the [CheckoutListener] interface
 * for handling checkout events.
 */
public abstract class DefaultCheckoutListener : CheckoutListener {

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
