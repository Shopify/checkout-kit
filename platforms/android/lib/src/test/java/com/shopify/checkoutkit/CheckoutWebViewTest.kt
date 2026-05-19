/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

import android.graphics.Color
import android.net.Uri
import android.os.Looper
import android.view.View.VISIBLE
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class CheckoutWebViewTest {

    private lateinit var activity: ComponentActivity

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configuration.platform = null
    }

    @Test
    fun `configures web view on initialization`() {
        val view = CheckoutWebView(activity)

        assertThat(view.visibility).isEqualTo(VISIBLE)
        assertThat(view.settings.javaScriptEnabled).isTrue
        assertThat(view.settings.domStorageEnabled).isTrue
        assertThat(view.id).isNotNull
        assertThat(shadowOf(view).webViewClient.javaClass).isEqualTo(CheckoutWebView.CheckoutWebViewClient::class.java)
        assertThat(shadowOf(view).backgroundColor).isEqualTo(Color.TRANSPARENT)
        assertThat(shadowOf(view).getJavascriptInterface("android").javaClass)
            .isEqualTo(CheckoutBridge::class.java)
    }

    @Test
    fun `user agent suffix contains ShopifyCheckoutKit version and android platform`() {
        val view = CheckoutWebView(activity)

        assertThat(view.settings.userAgentString).contains("ShopifyCheckoutKit/")
        assertThat(view.settings.userAgentString).contains("(Android;")
    }

    @Test
    fun `user agent suffix appends platform identifier and version when set`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative("0.80.0")
        val view = CheckoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith(
                "ShopifyCheckoutKit/${ShopifyCheckoutKit.version} (Android; Kotlin $kotlinVersion) ReactNative/0.80.0"
            )
    }

    @Test
    fun `user agent suffix omits version when platform version is null`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative()
        val view = CheckoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith("ShopifyCheckoutKit/${ShopifyCheckoutKit.version} (Android; Kotlin $kotlinVersion) ReactNative")
    }

    @Test
    fun `attaches javascript interface onAttachedToWindow`() {
        val view = CheckoutWebView(activity)

        val shadow = shadowOf(view)
        shadow.callOnAttachedToWindow()

        assertThat(shadow.getJavascriptInterface("android").javaClass)
            .isEqualTo(CheckoutBridge::class.java)
    }

    @Test
    fun `removes javascript interface onDetachedFromWindow`() {
        val view = CheckoutWebView(activity)

        val shadow = shadowOf(view)
        shadow.callOnDetachedFromWindow()

        assertThat(shadow.getJavascriptInterface("android")).isNull()
    }

    @Test
    fun `calls update progress when new progress is reported by WebChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)

        shadow.webChromeClient?.onProgressChanged(view, 20)
        verify(webViewListener).updateProgressBar(20)

        shadow.webChromeClient?.onProgressChanged(view, 50)
        verify(webViewListener).updateProgressBar(50)
    }

    @Test
    fun `calls processors onPermissionRequest when resource permission requested`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val permissionRequest = mock<PermissionRequest>()
        val requestedResources = arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
        whenever(permissionRequest.resources).thenReturn(requestedResources)

        val shadow = shadowOf(view)
        shadow.webChromeClient?.onPermissionRequest(permissionRequest)

        verify(webViewListener).onPermissionRequest(permissionRequest)
    }

    @Test
    fun `calls processors onShowFileChooser when called on webChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)
        val filePathCallback = mock<ValueCallback<Array<Uri>>>()
        val fileChooserParams = mock<FileChooserParams>()

        shadow.webChromeClient.onShowFileChooser(view, filePathCallback, fileChooserParams)

        verify(webViewListener).onShowFileChooser(view, filePathCallback, fileChooserParams)
    }

    @Test
    fun `calls processors onGeolocationPermissionsShowPrompt when called on webChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)

        val callback = mock<GeolocationPermissions.Callback>()
        val origin = "origin"

        shadow.webChromeClient.onGeolocationPermissionsShowPrompt(origin, callback)

        verify(webViewListener).onGeolocationPermissionsShowPrompt(origin, callback)
    }

    @Test
    fun `removeFromParent() should remove parent if a parent exists but not destroy WebView`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val ctx = activityController.get()
            val webView = CheckoutWebView(ctx)
            val container = FrameLayout(ctx)
            container.addView(webView)
            assertThat(webView.parent).isNotNull()

            webView.removeFromParent()
            shadowOf(Looper.getMainLooper()).runToEndOfTasks()

            val shadow = shadowOf(webView)
            assertThat(shadow.wasDestroyCalled()).isFalse()
            assertThat(webView.parent).isNull()
        }
    }

    @Test
    fun `removeFromParent() should do nothing if no parent exists`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val ctx = activityController.get()
            val webView = CheckoutWebView(ctx)
            webView.removeFromParent()
            shadowOf(Looper.getMainLooper()).runToEndOfTasks()

            val shadow = shadowOf(webView)
            assertThat(shadow.wasDestroyCalled()).isFalse()
            assertThat(webView.parent).isNull()
        }
    }

    // region buildEcpUrl (tested through loadCheckout)

    @Test
    fun `loadCheckout appends ec_version to URL when absent`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_version=${CheckoutProtocol.specVersion}")
    }

    @Test
    fun `loadCheckout preserves existing query params alongside ec_version`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123?foo=bar")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl
        assertThat(loadedUrl).contains("foo=bar")
        assertThat(loadedUrl).contains("ec_version=${CheckoutProtocol.specVersion}")
    }

    @Test
    fun `loadCheckout does not duplicate ec_version when already present`() {
        val view = CheckoutWebView(activity)
        val urlWithVersion = "https://checkout.shopify.com/cart/123?ec_version=2026-01-23"
        view.loadCheckout(urlWithVersion)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_version=2026-01-23")
        assertThat(loadedUrl.split("ec_version").size - 1).isEqualTo(1)
    }

    // endregion

    // region buildEcpUrl — ec_delegate

    @Test
    fun `loadCheckout appends ec_delegate=window_open to URL`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_delegate=window.open")
    }

    @Test
    fun `loadCheckout does not duplicate ec_delegate when already present`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123?ec_delegate=window.open")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_delegate=window.open")
        assertThat(loadedUrl.split("ec_delegate").size - 1).isEqualTo(1)
    }

    // endregion
}
