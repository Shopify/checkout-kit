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
package com.shopify.checkout_kit_mobile_buy_integration_sample

import android.Manifest
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()

        // Allow debugging the WebView via chrome://inspect
        setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        // Setup logging in debug build
        if (BuildConfig.DEBUG) {
            Timber.plant(DebugTree())
        }

        setContent {
            CheckoutKitApp()
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
