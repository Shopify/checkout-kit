package com.shopify.checkoutkit.androiddemo.settings.authentication

import android.net.Uri
import androidx.compose.runtime.staticCompositionLocalOf

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

fun interface BrowserAuthenticationLauncher {
    fun launch(
        request: BrowserAuthenticationRequest,
        onResult: (BrowserAuthenticationResult) -> Unit,
    )
}

val LocalBrowserAuthenticationLauncher = staticCompositionLocalOf<BrowserAuthenticationLauncher> {
    error("BrowserAuthenticationLauncher is not available")
}
