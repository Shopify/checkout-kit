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
 * Use through [ShopifyCheckoutKit.present] or [ShopifyCheckout.create].
 */
public class CheckoutPresentation internal constructor() {
    internal var onStart: ((CheckoutStartEvent) -> Unit)? = null
    internal var onUpdate: ((CheckoutUpdateEvent) -> Unit)? = null
    internal var onComplete: ((CheckoutCompleteEvent) -> Unit)? = null
    internal var onFail: ((CheckoutFailureEvent) -> Unit)? = null
    internal var onLinkClick: ((CheckoutLink) -> CheckoutLinkAction)? = null
    internal var onDismiss: (() -> Unit)? = null
    internal var onPermissionRequest: ((PermissionRequest) -> Unit)? = null
    internal var onShowFileChooser:
        ((WebView, ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams) -> Boolean)? = null
    internal var onGeolocationPermissionsShowPrompt:
        ((String, GeolocationPermissions.Callback) -> Unit)? = null
    internal var onGeolocationPermissionsHidePrompt: (() -> Unit)? = null

    /**
     * Called for checkout start events received during this presentation.
     *
     * Events received before presentation callbacks are bound, including during preload, are not replayed.
     * This callback is not guaranteed for every presentation or when reusing a loaded checkout.
     */
    public fun onStart(handler: (CheckoutStartEvent) -> Unit) {
        onStart = handler
    }

    /** Called when the buyer-visible checkout state changes. */
    public fun onUpdate(handler: (CheckoutUpdateEvent) -> Unit) {
        onUpdate = handler
    }

    /** Called when checkout completes. */
    public fun onComplete(handler: (CheckoutCompleteEvent) -> Unit) {
        onComplete = handler
    }

    /** Chooses how Checkout Kit handles links. Defaults to [CheckoutLinkAction.Open]. */
    public fun onLinkClick(handler: (CheckoutLink) -> CheckoutLinkAction) {
        onLinkClick = handler
    }

    /**
     * Called when checkout cannot continue.
     *
     * Use [CheckoutException.code] for your app's recovery policy.
     */
    public fun onFail(handler: (CheckoutFailureEvent) -> Unit) {
        onFail = handler
    }

    /**
     * Called when the buyer dismisses checkout.
     */
    public fun onDismiss(handler: () -> Unit) {
        onDismiss = handler
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

    internal fun buildListener(): DefaultCheckoutListener =
        object : DefaultCheckoutListener() {
            override fun onCheckoutStarted(event: CheckoutStartEvent) {
                onStart?.invoke(event)
            }

            override fun onCheckoutUpdated(event: CheckoutUpdateEvent) {
                onUpdate?.invoke(event)
            }

            override fun onCheckoutCompleted(event: CheckoutCompleteEvent) {
                onComplete?.invoke(event)
            }

            override fun onCheckoutLinkClicked(link: CheckoutLink): CheckoutLinkAction =
                onLinkClick?.invoke(link) ?: CheckoutLinkAction.Open

            override fun onCheckoutFailed(event: CheckoutFailureEvent) {
                onFail?.invoke(event)
            }

            override fun onCheckoutDismissed() {
                onDismiss?.invoke()
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
