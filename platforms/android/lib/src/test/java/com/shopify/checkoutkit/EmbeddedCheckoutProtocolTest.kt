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
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.isNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class EmbeddedCheckoutProtocolTest {

    private lateinit var activity: ComponentActivity
    private lateinit var viewSpy: CheckoutWebView
    private lateinit var mockEventProcessor: CheckoutWebViewEventProcessor
    private lateinit var ecp: EmbeddedCheckoutProtocol

    @Before
    fun setUp() {
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        viewSpy = Mockito.spy(CheckoutWebView(activity))
        mockEventProcessor = mock()
        whenever(viewSpy.getEventProcessor()).thenReturn(mockEventProcessor)
        ecp = EmbeddedCheckoutProtocol(viewSpy)
    }

    // region ec.ready

    @Test
    fun `ec ready sends UCP success ACK`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(ecReadyMessage())
        }
        assertThat(js).contains("\"result\"")
        assertThat(js).contains("\"ucp\"")
        assertThat(js).contains("\"status\":\"success\"")
        assertThat(js).doesNotContain("\"error\"")
    }

    @Test
    fun `ec ready ACK echoes string request id`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(ecReadyMessage(id = "\"req-42\""))
        }
        assertThat(js).contains("\"id\":\"req-42\"")
    }

    @Test
    fun `ec ready ACK echoes numeric id`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":7,"params":{"delegate":[]}}""")
        }
        assertThat(js).contains("\"id\":7")
    }

    @Test
    fun `ec ready response dispatches via window EmbeddedCheckoutProtocol`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(ecReadyMessage())
        }
        assertThat(js).contains("window.EmbeddedCheckoutProtocol")
        assertThat(js).contains(".postMessage(")
    }

    // endregion

    // region unsupported methods — explicit error response

    @Test
    fun `ec auth sends method not supported error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.auth","id":"1","params":{"type":"oauth"}}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
    }

    @Test
    fun `ec auth does not invoke client`() {
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)
        ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.auth","id":"1","params":{"type":"oauth"}}""")
        verify(client, never()).process(any())
    }

    @Test
    fun `ec payment instruments change request sends method not supported error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.payment.instruments_change_request","id":"2","params":{}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
    }

    @Test
    fun `ec payment credential request sends method not supported error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.payment.credential_request","id":"3","params":{}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
    }

    @Test
    fun `ec fulfillment address change request sends method not supported error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.fulfillment.address_change_request","id":"4","params":{}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
    }

    @Test
    fun `ep cart methods are silently ignored and not delegated to client`() {
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        ecp.postMessage("""{"jsonrpc":"2.0","method":"ep.cart.ready","id":"5","params":{}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
        verify(client, never()).process(any())
    }

    // endregion

    // region ec.window.open_request

    @Test
    fun `ec window open request calls openExternalUrl on client with parsed uri`() {
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.openExternalUrl(any())).thenReturn(true)
        ecp.setClient(client)

        ecp.postMessage(
            """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"5","params":{"url":"https://example.com/page"}}"""
        )
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        val captor = argumentCaptor<Uri>()
        verify(client).openExternalUrl(captor.capture())
        assertThat(captor.firstValue.toString()).isEqualTo("https://example.com/page")
    }

    @Test
    fun `ec window open request sends UCP success result when client returns true`() {
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.openExternalUrl(any())).thenReturn(true)
        ecp.setClient(client)

        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"5","params":{"url":"https://example.com"}}"""
            )
        }
        assertThat(js).contains("\"result\"")
        assertThat(js).contains("\"ucp\"")
        assertThat(js).contains("\"status\":\"success\"")
        assertThat(js).doesNotContain("\"error\"")
    }

    @Test
    fun `ec window open request falls back to event processor when client returns false`() {
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.openExternalUrl(any())).thenReturn(false)
        ecp.setClient(client)

        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"6","params":{"url":"https://example.com"}}"""
            )
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"result\"")
        assertThat(js).contains("\"ucp\"")
        assertThat(js).contains("\"status\":\"success\"")
        assertThat(js).doesNotContain("\"error\"")
        verify(mockEventProcessor).onCheckoutViewLinkClicked(Uri.parse("https://example.com"))
    }

    @Test
    fun `ec window open request falls back to event processor when no client is set`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"7","params":{"url":"https://example.com"}}"""
            )
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"result\"")
        assertThat(js).contains("\"ucp\"")
        assertThat(js).contains("\"status\":\"success\"")
        assertThat(js).doesNotContain("\"error\"")
        verify(mockEventProcessor).onCheckoutViewLinkClicked(Uri.parse("https://example.com"))
    }

    @Test
    fun `ec window open request does not call event processor when client handles it`() {
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.openExternalUrl(any())).thenReturn(true)
        ecp.setClient(client)

        ecp.postMessage(
            """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"8","params":{"url":"https://example.com"}}"""
        )
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockEventProcessor, never()).onCheckoutViewLinkClicked(any())
    }

    @Test
    fun `ec window open request rejects non-http schemes`() {
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"8","params":{"url":"intent://evil"}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
        verify(client, never()).openExternalUrl(any())
    }

    // endregion

    // region ec.start

    @Test
    fun `ec start shows progress bar`() {
        ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        verify(mockEventProcessor).onCheckoutViewLoadStarted()
    }

    @Test
    fun `ec start bubbles up to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}"""
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    @Test
    fun `ec start sends no response to checkout`() {
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.process(any())).thenReturn(null)
        ecp.setClient(client)

        ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    // endregion

    // region delegated notifications

    @Test
    fun `ec error is delegated to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.error","params":{"error":{"code":-1,"message":"fail"}}}"""
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    @Test
    fun `ec complete is delegated to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":{}}}"""
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    @Test
    fun `ec payment change is delegated to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.payment.change","params":{"checkout":{}}}"""
        val client = mock<CheckoutCommunicationClient>()
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    // endregion

    // region client delegation — requests

    @Test
    fun `unknown method is delegated to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"customMethod","id":"8","params":{}}"""
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.process(rawMessage)).thenReturn(null)
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(client).process(rawMessage)
    }

    @Test
    fun `non-null client response is sent back to checkout`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"customMethod","id":"9"}"""
        val clientResponse = """{"jsonrpc":"2.0","id":"9","result":{"data":"ok"}}"""
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.process(rawMessage)).thenReturn(clientResponse)
        ecp.setClient(client)

        val js = captureEvaluatedJs { ecp.postMessage(rawMessage) }

        assertThat(js).contains("window.EmbeddedCheckoutProtocol")
        assertThat(js).contains(".postMessage(")
        assertThat(js).contains("ok")
    }

    @Test
    fun `null client response sends nothing to checkout`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"customMethod","id":"10"}"""
        val client = mock<CheckoutCommunicationClient>()
        whenever(client.process(rawMessage)).thenReturn(null)
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    @Test
    fun `unknown method with no client sends nothing to checkout`() {
        ecp.postMessage("""{"jsonrpc":"2.0","method":"unknownMethod","id":"11"}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    // endregion

    // region malformed input

    @Test
    fun `malformed JSON sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("not valid json {{{")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
    }

    @Test
    fun `message missing method field sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","id":"12"}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
    }

    // endregion

    // region helpers

    private fun ecReadyMessage(id: String = "\"1\""): String {
        val params = """{"delegate":["fulfillment.address_change","payment.instruments_change"]}"""
        return """{"jsonrpc":"2.0","method":"ec.ready","id":$id,"params":$params}"""
    }

    /**
     * Runs [block], drains the main-thread queue, captures the first JS string
     * passed to [CheckoutWebView.evaluateJavascript].
     */
    private fun captureEvaluatedJs(block: () -> Unit): String {
        block()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val captor = argumentCaptor<String>()
        verify(viewSpy).evaluateJavascript(captor.capture(), isNull())
        return captor.firstValue
    }

    // endregion
}
