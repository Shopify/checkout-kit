package com.shopify.checkoutkit

import android.net.Uri
import android.os.Looper
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.isNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class WebMessageTransportTest {

    private val webView = mock<WebView>()

    @Test
    fun `listener adapter forwards string payload and frame metadata`() {
        var receivedMessage: String? = null
        var receivedFromMainFrame: Boolean? = null
        val listener = WebMessageListenerAdapter { message, isMainFrame ->
            receivedMessage = message
            receivedFromMainFrame = isMainFrame
        }

        dispatchMessage(listener, WebMessageCompat("hello"), isMainFrame = false)

        assertThat(receivedMessage).isEqualTo("hello")
        assertThat(receivedFromMainFrame).isFalse()
    }

    @Test
    fun `listener adapter ignores null string payload`() {
        var received = false
        val listener = WebMessageListenerAdapter { _, _ -> received = true }
        val message: String? = null

        dispatchMessage(listener, WebMessageCompat(message))

        assertThat(received).isFalse()
    }

    @Test
    fun `listener adapter ignores non-string payload`() {
        var received = false
        val listener = WebMessageListenerAdapter { _, _ -> received = true }

        dispatchMessage(listener, WebMessageCompat(byteArrayOf(1)))

        assertThat(received).isFalse()
    }

    @Test
    fun `send evaluates the response hook on the main thread`() {
        val response = """{"jsonrpc":"2.0","id":"1","result":{"message":"it's ready"}}"""

        Thread {
            WebMessageListenerTransport.send(webView, "EmbeddedCheckoutProtocol", response)
        }.apply {
            start()
            join()
        }

        verify(webView, never()).evaluateJavascript(any(), any())

        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val script = argumentCaptor<String>()
        verify(webView).evaluateJavascript(script.capture(), isNull())
        assertThat(script.firstValue).contains("window.EmbeddedCheckoutProtocol.postMessage")
        assertThat(script.firstValue).contains(
            """JSON.parse('{"jsonrpc":"2.0","id":"1","result":{"message":"it\'s ready"}}')"""
        )
    }

    @Test
    fun `send escapes backslashes and line breaks in the response`() {
        val response = "{\n\"path\":\"C:\\\\tmp's\"\r\n}"

        WebMessageListenerTransport.send(webView, "EmbeddedCheckoutProtocol", response)

        val script = argumentCaptor<String>()
        verify(webView).evaluateJavascript(script.capture(), isNull())
        assertThat(script.firstValue).contains(
            """JSON.parse('{\n"path":"C:\\\\tmp\'s"\r\n}')"""
        )
    }

    private fun dispatchMessage(
        listener: WebMessageListenerAdapter,
        message: WebMessageCompat,
        isMainFrame: Boolean = true,
    ) {
        listener.onPostMessage(
            webView,
            message,
            Uri.EMPTY,
            isMainFrame,
            mock<JavaScriptReplyProxy>(),
        )
    }
}
