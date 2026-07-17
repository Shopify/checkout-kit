package com.shopify.checkout_kit_android_demo

import android.Manifest
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import timber.log.Timber
import timber.log.Timber.DebugTree

class MainActivity : ComponentActivity() {
    private lateinit var requestPermissionLauncher: ActivityResultLauncher<String>
    private lateinit var showFileChooserLauncher: ActivityResultLauncher<FileChooserParams>
    private lateinit var geolocationLauncher: ActivityResultLauncher<Array<String>>

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var fileChooserParams: FileChooserParams? = null

    private var geolocationPermissionCallback: GeolocationPermissions.Callback? = null
    private var geolocationOrigin: String? = null
    private var incomingUrl by mutableStateOf<Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()

        // Allow debugging the WebView via chrome://inspect
        setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        // Setup logging in debug build
        if (BuildConfig.DEBUG) {
            Timber.plant(DebugTree())
        }

        incomingUrl = intent?.data
        setContent {
            CheckoutKitApp(
                incomingUrl = incomingUrl,
                onIncomingUrlHandled = { handledUrl ->
                    if (incomingUrl == handledUrl) {
                        incomingUrl = null
                    }
                },
            )
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
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        incomingUrl = intent.data
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
}
