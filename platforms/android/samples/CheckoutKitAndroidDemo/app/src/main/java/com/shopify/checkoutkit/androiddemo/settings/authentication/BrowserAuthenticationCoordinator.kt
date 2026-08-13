package com.shopify.checkoutkit.androiddemo.settings.authentication

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.browser.auth.AuthTabIntent
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsIntent

class BrowserAuthenticationCoordinator(
    private val activity: ComponentActivity,
) : BrowserAuthenticationLauncher {
    private val authTabLauncher: ActivityResultLauncher<Intent> =
        AuthTabIntent.registerActivityResultLauncher(activity) { result ->
            val resultUri = result.resultUri
            val browserResult = when {
                result.resultCode == AuthTabIntent.RESULT_OK && resultUri != null -> {
                    BrowserAuthenticationResult.Redirect(resultUri)
                }

                result.resultCode == AuthTabIntent.RESULT_CANCELED -> BrowserAuthenticationResult.Cancelled
                else -> BrowserAuthenticationResult.Failed("Authentication browser verification failed")
            }
            complete(browserResult)
        }

    private var pendingAuthentication: PendingBrowserAuthentication? = null

    override fun launch(
        request: BrowserAuthenticationRequest,
        onResult: (BrowserAuthenticationResult) -> Unit,
    ) {
        if (pendingAuthentication != null) {
            onResult(BrowserAuthenticationResult.Failed("Another authentication request is already active"))
            return
        }

        val browserPackage = CustomTabsClient.getPackageName(activity, emptyList())
        val useAuthTab = browserPackage != null && CustomTabsClient.isAuthTabSupported(activity, browserPackage)
        pendingAuthentication = PendingBrowserAuthentication(
            onResult = onResult,
            usesCustomTabs = !useAuthTab,
        )

        try {
            if (useAuthTab) {
                launchAuthTab(request, requireNotNull(browserPackage))
            } else {
                val customTabsIntent = CustomTabsIntent.Builder().build()
                browserPackage?.let(customTabsIntent.intent::setPackage)
                customTabsIntent.launchUrl(activity, request.url)
            }
        } catch (error: ActivityNotFoundException) {
            complete(BrowserAuthenticationResult.Failed("No browser is available"))
        } catch (error: IllegalArgumentException) {
            complete(BrowserAuthenticationResult.Failed("The authentication URL is invalid"))
        }
    }

    fun onNewIntent(callbackUri: Uri) {
        if (pendingAuthentication?.usesCustomTabs == true) {
            complete(BrowserAuthenticationResult.Redirect(callbackUri))
        }
    }

    fun onPause() {
        pendingAuthentication?.takeIf { it.usesCustomTabs }?.didLeaveApp = true
    }

    fun onResume() {
        val pending = pendingAuthentication
        if (pending?.usesCustomTabs == true && pending.didLeaveApp) {
            activity.window.decorView.post {
                if (pendingAuthentication === pending) {
                    complete(BrowserAuthenticationResult.Cancelled)
                }
            }
        }
    }

    private fun launchAuthTab(request: BrowserAuthenticationRequest, browserPackage: String) {
        val authTabIntent = AuthTabIntent.Builder().build()
        authTabIntent.intent.setPackage(browserPackage)
        val redirectScheme = request.redirectUri.scheme.orEmpty()
        if (redirectScheme.equals("https", ignoreCase = true)) {
            val host = requireNotNull(request.redirectUri.host)
            authTabIntent.launch(
                authTabLauncher,
                request.url,
                host,
                request.redirectUri.path.orEmpty(),
            )
        } else {
            authTabIntent.launch(authTabLauncher, request.url, redirectScheme)
        }
    }

    private fun complete(result: BrowserAuthenticationResult) {
        val pending = pendingAuthentication ?: return
        pendingAuthentication = null
        pending.onResult(result)
    }

    private data class PendingBrowserAuthentication(
        val onResult: (BrowserAuthenticationResult) -> Unit,
        val usesCustomTabs: Boolean,
        var didLeaveApp: Boolean = false,
    )
}
