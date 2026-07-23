package com.shopify.checkout_kit_android_demo.settings.authentication

import android.net.Uri

/** A browser request that returns to the app through [redirectUri]. */
data class BrowserAuthenticationRequest(
    val url: Uri,
    val redirectUri: Uri,
)

/** Result of an Auth Tab or Custom Tabs authentication request. */
sealed interface BrowserAuthenticationResult {
    data class Redirect(val uri: Uri) : BrowserAuthenticationResult
    data object Cancelled : BrowserAuthenticationResult
    data class Failed(val reason: String) : BrowserAuthenticationResult
}
