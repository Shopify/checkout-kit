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
 */
public interface CheckoutListener {
    /** Called when checkout starts. */
    public fun onCheckoutStarted(event: CheckoutStartEvent)

    /** Called when the buyer-visible checkout state changes. */
    public fun onCheckoutUpdated(event: CheckoutUpdateEvent)

    /** Called when checkout completes. */
    public fun onCheckoutCompleted(event: CheckoutCompleteEvent)

    /** Chooses how Checkout Kit handles a link that checkout asked the host app to open. */
    public fun onCheckoutLinkClicked(link: CheckoutLink): CheckoutLinkAction

    /**
     * Called when checkout cannot continue.
     *
     * Use [CheckoutException.code] for your app's recovery policy. Use the
     * [CheckoutException.message] and exception cause only for debugging and logging.
     */
    public fun onCheckoutFailed(event: CheckoutFailureEvent)

    /**
     * Event representing dismissal of checkout by the buyer.
     */
    public fun onCheckoutDismissed()

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

internal class NoopCheckoutListener : DefaultCheckoutListener() {
    override fun onCheckoutFailed(event: CheckoutFailureEvent) {
        /* noop */
    }

    override fun onCheckoutDismissed() {
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

    override fun onCheckoutStarted(event: CheckoutStartEvent) {
        // no-op override to implement
    }

    override fun onCheckoutUpdated(event: CheckoutUpdateEvent) {
        // no-op override to implement
    }

    override fun onCheckoutCompleted(event: CheckoutCompleteEvent) {
        // no-op override to implement
    }

    override fun onCheckoutLinkClicked(link: CheckoutLink): CheckoutLinkAction = CheckoutLinkAction.Open

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
