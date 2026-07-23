package com.shopify.checkout_kit_android_demo

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebView.setWebContentsDebuggingEnabled
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.browser.auth.AuthTabIntent
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import com.shopify.checkout_kit_android_demo.settings.authentication.BrowserAuthenticationRequest
import com.shopify.checkout_kit_android_demo.settings.authentication.BrowserAuthenticationResult
import timber.log.Timber
import timber.log.Timber.DebugTree

class MainActivity : ComponentActivity() {
    private lateinit var requestPermissionLauncher: ActivityResultLauncher<String>
    private lateinit var showFileChooserLauncher: ActivityResultLauncher<FileChooserParams>
    private lateinit var geolocationLauncher: ActivityResultLauncher<Array<String>>
    private lateinit var authTabLauncher: ActivityResultLauncher<Intent>

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var fileChooserParams: FileChooserParams? = null

    private var geolocationPermissionCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null

    private var pendingBrowserAuthentication: PendingBrowserAuthentication? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()

        // Allow debugging the WebView via chrome://inspect
        setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        // Setup logging in debug build
        if (BuildConfig.DEBUG) {
            Timber.plant(DebugTree())
        }

        authTabLauncher = AuthTabIntent.registerActivityResultLauncher(this) { result ->
            val resultUri = result.resultUri
            val browserResult = when {
                result.resultCode == AuthTabIntent.RESULT_OK && resultUri != null -> {
                    BrowserAuthenticationResult.Redirect(resultUri)
                }

                result.resultCode == AuthTabIntent.RESULT_CANCELED -> BrowserAuthenticationResult.Cancelled
                else -> BrowserAuthenticationResult.Failed("Authentication browser verification failed")
            }
            completeBrowserAuthentication(browserResult)
        }

        requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            val fileChooserParams = this.fileChooserParams
            if (isGranted && fileChooserParams != null) {
                showFileChooserLauncher.launch(fileChooserParams)
                this.fileChooserParams = null
            }
        }

        showFileChooserLauncher = registerForActivityResult(FileChooserResultContract()) { uri: Uri? ->
            filePathCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
            filePathCallback = null
            fileChooserParams = null
        }

        geolocationLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            val isGranted = result.any { it.value }
            geolocationPermissionCallback?.invoke(geolocationOrigin, isGranted, false)
            geolocationPermissionCallback = null
            geolocationOrigin = null
        }

        setContent {
            CheckoutKitApp()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.let { callbackUri ->
            if (pendingBrowserAuthentication?.usesCustomTabs == true) {
                completeBrowserAuthentication(BrowserAuthenticationResult.Redirect(callbackUri))
            }
        }
    }

    override fun onPause() {
        pendingBrowserAuthentication?.takeIf { it.usesCustomTabs }?.didLeaveApp = true
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        val pending = pendingBrowserAuthentication
        if (pending?.usesCustomTabs == true && pending.didLeaveApp) {
            window.decorView.post {
                if (pendingBrowserAuthentication === pending) {
                    completeBrowserAuthentication(BrowserAuthenticationResult.Cancelled)
                }
            }
        }
    }

    /**
     * Opens OAuth in the browser's shared session. Auth Tab securely returns the redirect URI on
     * supported browsers; Custom Tabs and an app deep link provide the compatibility fallback.
     */
    fun launchCustomerAccountAuthentication(
        request: BrowserAuthenticationRequest,
        onResult: (BrowserAuthenticationResult) -> Unit,
    ) {
        if (pendingBrowserAuthentication != null) {
            onResult(BrowserAuthenticationResult.Failed("Another authentication request is already active"))
            return
        }

        val browserPackage = CustomTabsClient.getPackageName(this, emptyList())
        val useAuthTab = browserPackage != null && CustomTabsClient.isAuthTabSupported(this, browserPackage)
        pendingBrowserAuthentication = PendingBrowserAuthentication(
            onResult = onResult,
            usesCustomTabs = !useAuthTab,
        )

        try {
            if (useAuthTab) {
                launchAuthTab(request, requireNotNull(browserPackage))
            } else {
                val customTabsIntent = CustomTabsIntent.Builder().build()
                browserPackage?.let(customTabsIntent.intent::setPackage)
                customTabsIntent.launchUrl(this, request.url)
            }
        } catch (error: ActivityNotFoundException) {
            completeBrowserAuthentication(BrowserAuthenticationResult.Failed("No browser is available"))
        } catch (error: IllegalArgumentException) {
            completeBrowserAuthentication(BrowserAuthenticationResult.Failed("The authentication URL is invalid"))
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

    private fun completeBrowserAuthentication(result: BrowserAuthenticationResult) {
        val pending = pendingBrowserAuthentication ?: return
        pendingBrowserAuthentication = null
        pending.onResult(result)
    }

    fun onShowFileChooser(filePathCallback: ValueCallback<Array<Uri>>, fileChooserParams: FileChooserParams): Boolean {
        this.filePathCallback = filePathCallback
        if (permissionAlreadyGranted(Manifest.permission.CAMERA)) {
            showFileChooserLauncher.launch(fileChooserParams)
            this.fileChooserParams = null
        } else {
            this.fileChooserParams = fileChooserParams
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
        return true
    }

    fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
        if (permissionAlreadyGranted(Manifest.permission.ACCESS_FINE_LOCATION) &&
            permissionAlreadyGranted(Manifest.permission.ACCESS_COARSE_LOCATION)
        ) {
            callback(origin, true, true)
        } else {
            geolocationPermissionCallback = callback
            geolocationOrigin = origin
            geolocationLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    fun onGeolocationPermissionsHidePrompt() {
        geolocationPermissionCallback = null
        geolocationOrigin = null
    }

    private fun permissionAlreadyGranted(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
    }

    private data class PendingBrowserAuthentication(
        val onResult: (BrowserAuthenticationResult) -> Unit,
        val usesCustomTabs: Boolean,
        var didLeaveApp: Boolean = false,
    )
}
