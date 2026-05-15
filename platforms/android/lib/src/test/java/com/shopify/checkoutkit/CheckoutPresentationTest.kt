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
package com.shopify.checkoutkit

import android.net.Uri
import android.os.Looper
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebView
import android.widget.RelativeLayout
import androidx.activity.ComponentActivity
import androidx.core.view.children
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowDialog

@RunWith(RobolectricTestRunner::class)
class CheckoutPresentationTest {

    private lateinit var activity: ComponentActivity
    private lateinit var configuration: Configuration

    @Before
    fun setUp() {
        configuration = ShopifyCheckoutKit.getConfiguration()
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        ShopifyCheckoutKit.configure {
            it.preloading = configuration.preloading
            it.colorScheme = configuration.colorScheme
            it.errorRecovery = configuration.errorRecovery
            it.platform = configuration.platform
            it.logLevel = configuration.logLevel
        }
        CheckoutWebView.cacheEntry = null
    }

    @Test
    fun `present builder invokes onFail callback`() {
        var received: CheckoutException? = null

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onFail { received = it }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val error = CheckoutKitException("boom", isRecoverable = false)

        dialog.closeCheckoutDialogWithError(error)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isSameAs(error)
    }

    @Test
    fun `present builder invokes onCancel callback`() {
        var canceled = false

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onCancel { canceled = true }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog()
        dialog.cancel()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(canceled).isTrue()
    }

    @Test
    fun `present builder forwards connected client to embedded checkout protocol`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"customMethod","id":"1"}"""
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.process(rawMessage)).thenReturn(null)

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            connect(client)
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog
        val webView = dialog.currentWebView()

        webView.embeddedCheckoutProtocol().postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    @Test
    fun `present builder invokes onPermissionRequest callback`() {
        var received: PermissionRequest? = null
        val permissionRequest = mock<PermissionRequest>()

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onPermissionRequest { received = it }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog

        dialog.currentWebView().getListener().onPermissionRequest(permissionRequest)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isSameAs(permissionRequest)
    }

    @Test
    fun `present builder invokes onShowFileChooser callback`() {
        val webView = mock<WebView>()
        val filePathCallback = mock<ValueCallback<Array<Uri>>>()
        val fileChooserParams = mock<FileChooserParams>()
        var receivedWebView: WebView? = null
        var receivedFilePathCallback: ValueCallback<Array<Uri>>? = null
        var receivedFileChooserParams: FileChooserParams? = null

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onShowFileChooser { presentedWebView, callback, params ->
                receivedWebView = presentedWebView
                receivedFilePathCallback = callback
                receivedFileChooserParams = params
                true
            }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog

        val handled = dialog.currentWebView().getListener().onShowFileChooser(
            webView,
            filePathCallback,
            fileChooserParams,
        )

        assertThat(handled).isTrue()
        assertThat(receivedWebView).isSameAs(webView)
        assertThat(receivedFilePathCallback).isSameAs(filePathCallback)
        assertThat(receivedFileChooserParams).isSameAs(fileChooserParams)
    }

    @Test
    fun `present builder invokes onGeolocationPermissionsShowPrompt callback`() {
        val callback = mock<GeolocationPermissions.Callback>()
        var receivedOrigin: String? = null
        var receivedCallback: GeolocationPermissions.Callback? = null

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onGeolocationPermissionsShowPrompt { origin, geolocationCallback ->
                receivedOrigin = origin
                receivedCallback = geolocationCallback
            }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog

        dialog.currentWebView().getListener().onGeolocationPermissionsShowPrompt("origin", callback)

        assertThat(receivedOrigin).isEqualTo("origin")
        assertThat(receivedCallback).isSameAs(callback)
    }

    @Test
    fun `present builder invokes onGeolocationPermissionsHidePrompt callback`() {
        var hidden = false

        ShopifyCheckoutKit.present("https://shopify.com", activity) {
            onGeolocationPermissionsHidePrompt { hidden = true }
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog

        dialog.currentWebView().getListener().onGeolocationPermissionsHidePrompt()

        assertThat(hidden).isTrue()
    }

    @Test
    fun `present builder with no callbacks is safe`() {
        val dialogHandle = ShopifyCheckoutKit.present("https://shopify.com", activity) {}
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val dialog = ShadowDialog.getLatestDialog() as CheckoutDialog

        dialogHandle?.dismiss()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(dialog.isShowing).isFalse()
    }

    private fun CheckoutDialog.currentWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children.first { it is CheckoutWebView } as CheckoutWebView

    private fun CheckoutWebView.embeddedCheckoutProtocol(): EmbeddedCheckoutProtocol {
        val field = CheckoutWebView::class.java.getDeclaredField("embeddedCheckoutProtocol")
        field.isAccessible = true
        return field.get(this) as EmbeddedCheckoutProtocol
    }
}
