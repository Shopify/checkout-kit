package com.shopify.checkoutkit

import android.net.Uri
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

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
    internal var protocolClient: CheckoutProtocol.Client? = null

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
     * Connects a typed client for supported Embedded Checkout Protocol callbacks.
     */
    public fun connect(client: CheckoutProtocol.Client?) {
        protocolClient = client
    }

    internal fun buildListener(): DefaultCheckoutListener =
        object : DefaultCheckoutListener() {
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
