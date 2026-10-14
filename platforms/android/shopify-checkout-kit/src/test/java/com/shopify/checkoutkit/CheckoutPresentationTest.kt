package com.shopify.checkoutkit

import android.net.Uri
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

@RunWith(RobolectricTestRunner::class)
class CheckoutPresentationTest {

    @Test
    fun `present builder invokes onFail callback`() {
        var received: CheckoutFailureEvent? = null

        val listener = listener {
            onFail { received = it }
        }

        val error = CheckoutException(code = CheckoutErrorCode.SDK_ERROR, message = "boom")
        val event = CheckoutFailureEvent(error)
        listener.onCheckoutFailed(event)

        assertThat(received).isSameAs(event)
        assertThat(received!!.error).isSameAs(error)
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
    fun `present builder forwards typed checkout events`() {
        val checkout = mock<Checkout>()
        val start = CheckoutStartEvent(checkout)
        val update = CheckoutUpdateEvent(checkout)
        val complete = CheckoutCompleteEvent(checkout)
        val received = mutableListOf<Any>()
        val listener = listener {
            onStart { received.add(it) }
            onUpdate { received.add(it) }
            onComplete { received.add(it) }
        }

        listener.onCheckoutStarted(start)
        listener.onCheckoutUpdated(update)
        listener.onCheckoutCompleted(complete)

        assertThat(received).containsExactly(start, update, complete)
    }

    @Test
    fun `present builder returns configured link action`() {
        val link = CheckoutLink(Uri.parse("https://example.com/privacy"))
        var received: CheckoutLink? = null
        val listener = listener {
            onLinkClick {
                received = it
                CheckoutLinkAction.Handled
            }
        }

        assertThat(listener.onCheckoutLinkClicked(link)).isEqualTo(CheckoutLinkAction.Handled)
        assertThat(received).isSameAs(link)
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

        val checkout = mock<Checkout>()
        listener.onCheckoutStarted(CheckoutStartEvent(checkout))
        listener.onCheckoutUpdated(CheckoutUpdateEvent(checkout))
        listener.onCheckoutCompleted(CheckoutCompleteEvent(checkout))
        listener.onCheckoutFailed(
            CheckoutFailureEvent(CheckoutException(code = CheckoutErrorCode.SDK_ERROR, message = "boom"))
        )
        listener.onCheckoutDismissed()
        listener.onPermissionRequest(mock())
        listener.onGeolocationPermissionsShowPrompt("origin", mock())
        listener.onGeolocationPermissionsHidePrompt()
        val handled = listener.onShowFileChooser(mock(), mock(), mock())

        assertThat(handled).isFalse()
        assertThat(listener.onCheckoutLinkClicked(CheckoutLink(Uri.parse("https://example.com"))))
            .isEqualTo(CheckoutLinkAction.Open)
    }

    private fun presentation(configure: CheckoutPresentation.() -> Unit): CheckoutPresentation =
        CheckoutPresentation().apply(configure)

    private fun listener(configure: CheckoutPresentation.() -> Unit): DefaultCheckoutListener =
        presentation(configure).buildListener()
}
