package com.shopify.checkoutkit

import android.net.Uri
import android.os.Looper
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebView
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class CheckoutPresentationTest {

    @Test
    fun `present builder invokes onFail callback`() {
        var received: CheckoutException? = null

        val listener = listener {
            onFail { received = it }
        }

        val error = CheckoutKitException("boom")
        listener.onCheckoutFailed(error)

        assertThat(received).isSameAs(error)
    }

    @Test
    fun `present builder invokes onDismiss callback`() {
        var dismissed = false

        val listener = listener {
            onDismiss { dismissed = true }
        }
        listener.onCheckoutDismissed()

        assertThat(dismissed).isTrue()
    }

    @Test
    fun `present builder stores connected client`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.messagesChange) { received = true }

        val presentation = presentation {
            connect(client)
        }

        presentation.protocolClient?.process(ecMessagesChangeMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
    }

    @Test
    fun `present builder invokes onPermissionRequest callback`() {
        var received: PermissionRequest? = null
        val permissionRequest = mock<PermissionRequest>()

        val listener = listener {
            onPermissionRequest { received = it }
        }

        listener.onPermissionRequest(permissionRequest)

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

        val listener = listener {
            onShowFileChooser { presentedWebView, callback, params ->
                receivedWebView = presentedWebView
                receivedFilePathCallback = callback
                receivedFileChooserParams = params
                true
            }
        }

        val handled = listener.onShowFileChooser(
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

        val listener = listener {
            onGeolocationPermissionsShowPrompt { origin, geolocationCallback ->
                receivedOrigin = origin
                receivedCallback = geolocationCallback
            }
        }

        listener.onGeolocationPermissionsShowPrompt("origin", callback)

        assertThat(receivedOrigin).isEqualTo("origin")
        assertThat(receivedCallback).isSameAs(callback)
    }

    @Test
    fun `present builder invokes onGeolocationPermissionsHidePrompt callback`() {
        var hidden = false

        val listener = listener {
            onGeolocationPermissionsHidePrompt { hidden = true }
        }

        listener.onGeolocationPermissionsHidePrompt()

        assertThat(hidden).isTrue()
    }

    @Test
    fun `present builder with no callbacks is safe`() {
        val listener = listener {}

        listener.onCheckoutFailed(CheckoutKitException("boom"))
        listener.onCheckoutDismissed()
        listener.onPermissionRequest(mock())
        listener.onGeolocationPermissionsShowPrompt("origin", mock())
        listener.onGeolocationPermissionsHidePrompt()
        val handled = listener.onShowFileChooser(mock(), mock(), mock())

        assertThat(handled).isFalse()
    }

    private fun presentation(configure: CheckoutPresentation.() -> Unit): CheckoutPresentation =
        CheckoutPresentation().apply(configure)

    private fun listener(configure: CheckoutPresentation.() -> Unit): DefaultCheckoutListener =
        presentation(configure).buildListener()

    private fun ecMessagesChangeMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.messages.change","params":{"checkout":$CHECKOUT_JSON}}"""

    private companion object {
        private const val CHECKOUT_JSON =
            """{"id":"chk1","currency":"USD","status":"incomplete","line_items":[],"totals":[],"links":[],"ucp":""" +
                """{"payment_handlers":{},"version":"1.0"}}"""
    }
}
