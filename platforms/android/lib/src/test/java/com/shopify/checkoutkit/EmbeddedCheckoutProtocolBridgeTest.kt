package com.shopify.checkoutkit

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Looper
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.mockito.kotlin.any
import org.mockito.kotlin.argThat
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
class EmbeddedCheckoutProtocolBridgeTest {

    private lateinit var activity: ComponentActivity
    private lateinit var viewSpy: CheckoutWebView
    private lateinit var mockListener: CheckoutWebViewListener
    private lateinit var ecp: EmbeddedCheckoutProtocolBridge

    @Before
    fun setUp() {
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        // Mirror real-Android behavior: startActivity throws ActivityNotFoundException when
        // no activity resolves the intent. Robolectric defaults to silently recording the
        // intent instead — turning on checkActivities aligns the shadow with production.
        shadowOf(activity.application).checkActivities(true)
        viewSpy = Mockito.spy(CheckoutWebView(activity))
        mockListener = mock()
        whenever(viewSpy.getListener()).thenReturn(mockListener)
        ecp = EmbeddedCheckoutProtocolBridge(viewSpy)
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
    fun `ec ready ACK echoes null request id`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":null,"params":{"delegate":[]}}""")
        }
        assertThat(js).contains("\"id\":null")
    }

    @Test
    fun `ec ready without request id sends no response`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ec.ready","params":{"delegate":[]}}""")
    }

    @Test
    fun `ec ready with fractional request id sends no response`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ec.ready","id":1.5,"params":{"delegate":[]}}""")
    }

    @Test
    fun `ec ready response dispatches via window EmbeddedCheckoutProtocol`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(ecReadyMessage())
        }
        assertThat(js).contains("window.EmbeddedCheckoutProtocol")
        assertThat(js).contains(".postMessage(")
    }

    @Test
    fun `ec ready echoes window open delegation when requested`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":["window.open"]}}"""
            )
        }
        assertThat(js).contains("\"delegate\":[\"window.open\"]")
        assertThat(js).contains("\"status\":\"success\"")
    }

    @Test
    fun `ec ready filters unsupported delegations down to intersection`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r2","params":{"delegate":["window.open","payment.credential"]}}"""
            )
        }
        assertThat(js).contains("\"delegate\":[\"window.open\"]")
        assertThat(js).doesNotContain("payment.credential")
    }

    @Test
    fun `ec ready with non-string delegate values sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r2","params":{"delegate":["window.open",null,{}]}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
        assertThat(js).contains(""""id":"r2"""")
    }

    @Test
    fun `ec ready omits delegate field when no supported delegations requested`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r3","params":{"delegate":["fulfillment.address_change"]}}"""
            )
        }
        assertThat(js).doesNotContain("\"delegate\"")
        assertThat(js).contains("\"status\":\"success\"")
    }

    @Test
    fun `ec ready omits delegate field when delegate array is empty`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"r4","params":{"delegate":[]}}""")
        }
        assertThat(js).doesNotContain("\"delegate\"")
        assertThat(js).contains("\"status\":\"success\"")
    }

    @Test
    fun `ec ready omits delegate field when params has no delegate key`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"r5","params":{}}""")
        }
        assertThat(js).doesNotContain("\"delegate\"")
        assertThat(js).contains("\"status\":\"success\"")
    }

    // endregion

    // region unsupported methods

    @Test
    fun `ec auth request returns method not found and is not delegated to client`() {
        assertMethodNotFoundByBridge(
            """{"jsonrpc":"2.0","method":"ec.auth","id":"1","params":{"type":"oauth"}}""",
            """"id":"1"""",
        )
    }

    @Test
    fun `ec payment instruments change request returns method not found and is not delegated to client`() {
        assertMethodNotFoundByBridge(
            """{"jsonrpc":"2.0","method":"ec.payment.instruments_change_request","id":"2","params":{}}""",
            """"id":"2"""",
        )
    }

    @Test
    fun `ec payment credential request returns method not found and is not delegated to client`() {
        assertMethodNotFoundByBridge(
            """{"jsonrpc":"2.0","method":"ec.payment.credential_request","id":"3","params":{}}""",
            """"id":"3"""",
        )
    }

    @Test
    fun `ec fulfillment address change request returns method not found and is not delegated to client`() {
        assertMethodNotFoundByBridge(
            """{"jsonrpc":"2.0","method":"ec.fulfillment.address_change_request","id":"4","params":{}}""",
            """"id":"4"""",
        )
    }

    @Test
    fun `ep cart request returns method not found and is not delegated to client`() {
        assertMethodNotFoundByBridge(
            """{"jsonrpc":"2.0","method":"ep.cart.ready","id":"5","params":{}}""",
            """"id":"5"""",
        )
    }

    @Test
    fun `ec buyer change notification is ignored and not delegated to client`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ec.buyer.change","params":{"checkout":{}}}""")
    }

    @Test
    fun `unsupported notifications are ignored and not delegated to client`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ec.auth","params":{"type":"oauth"}}""")
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ec.buyer.change","params":{"checkout":{}}}""")
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"ep.cart.ready","params":{}}""")
    }

    // endregion

    // region ec.window.open_request — merchant-overridable with kit fallback

    @Test
    fun `window open launches intent when activity resolves the uri`() {
        registerFakeBrowserFor("https://example.com")

        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "\"7\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"status\":\"success\"")
        val launched = shadowOf(activity).nextStartedActivity
        assertThat(launched).isNotNull()
        assertThat(launched.action).isEqualTo(Intent.ACTION_VIEW)
        assertThat(launched.data.toString()).isEqualTo("https://example.com")
    }

    @Test
    fun `window open emits UCP rejection when no activity resolves the uri`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "\"42\"", url = "https://nothing-resolves.invalid"))
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(js).contains("\"severity\":\"unrecoverable\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open falls back to kit default when consumer client has no handler`() {
        registerFakeBrowserFor("https://example.com")
        // Empty typed client — no .on(CheckoutProtocol.windowOpen) registered.
        ecp.setClient(CheckoutProtocol.Client())

        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"status\":\"success\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNotNull()
    }

    @Test
    fun `window open uses merchant handler when registered and skips kit default`() {
        registerFakeBrowserFor("https://example.com")
        val merchantClient = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { _ ->
                WindowOpenResult.Rejected(reason = "merchant says no")
            }
        ecp.setClient(merchantClient)

        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(js).contains("merchant says no")
        // Kit default never ran — no intent launched.
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open passes the parsed url through to the merchant handler`() {
        var captured: WindowOpenRequest? = null
        val merchantClient = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { request ->
                captured = request
                WindowOpenResult.Success
            }
        ecp.setClient(merchantClient)

        ecp.postMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com/promo?id=42"))
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(captured).isNotNull()
        assertThat(captured!!.url.toString()).isEqualTo("https://example.com/promo?id=42")
    }

    @Test
    fun `window open emits invalid params when params url is missing`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.window.open_request","id":"9","params":{}}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params url is null`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"10","params":{"url":null}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params url is not a string`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"11","params":{"url":{}}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params is not an object`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.window.open_request","id":"12","params":[]}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
    }

    @Test
    fun `window open response echoes null request id`() {
        val merchantClient = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { WindowOpenResult.Success }
        ecp.setClient(merchantClient)

        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "null", url = "https://example.com"))
        }

        assertThat(js).contains("\"id\":null")
        assertThat(js).contains("\"status\":\"success\"")
    }

    @Test
    fun `window open without request id sends no response`() {
        assertIgnoredByBridge(
            """{"jsonrpc":"2.0","method":"ec.window.open_request","params":{"url":"https://example.com"}}"""
        )
    }

    @Test
    fun `window open with fractional request id sends no response`() {
        assertIgnoredByBridge(windowOpenRequest(id = "1.5", url = "https://example.com"))
    }

    // endregion

    // region ec.start

    @Test
    fun `ec start hides progress bar`() {
        ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        verify(mockListener).onCheckoutViewLoadComplete()
    }

    @Test
    fun `ec start bubbles up to client`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { received = true }
        ecp.setClient(client)

        ecp.postMessage(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
    }

    @Test
    fun `ec start sends no response to checkout`() {
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(ecStartMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    // endregion

    // region ec.error — severity-driven dismissal

    @Test
    fun `ec error is forwarded to client regardless of severity`() {
        val rawMessage = ecErrorMessage(severity = "recoverable")
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { received = true }
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
    }

    @Test
    fun `ec error with unrecoverable severity dismisses via listener`() {
        val rawMessage = ecErrorMessage(severity = "unrecoverable")
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { received = true }
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue).isInstanceOf(ClientException::class.java)
        assertThat(captor.firstValue.errorDescription)
            .isEqualTo("Embedded checkout reported unrecoverable error.")
    }

    @Test
    fun `ec error with unrecoverable severity invalidates cached preload`() {
        CheckoutWebView.preload("https://shopify.dev/cart/123", activity)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ecp.postMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `ec error with unrecoverable severity dismisses even when merchant handles error`() {
        val rawMessage = ecErrorMessage(severity = "unrecoverable")
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { received = true }
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
        verify(mockListener).onCheckoutViewFailedWithError(
            argThat { this is ClientException },
        )
    }

    @Test
    fun `ec error with recoverable severity does not dismiss`() {
        val rawMessage = ecErrorMessage(severity = "recoverable")
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `ec error with requires_buyer_input severity does not dismiss`() {
        val rawMessage = ecErrorMessage(severity = "requires_buyer_input")
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `ec error with requires_buyer_review severity does not dismiss`() {
        val rawMessage = ecErrorMessage(severity = "requires_buyer_review")
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `ec error dismisses when any message has unrecoverable severity`() {
        val messages = """[
            |{"type":"error","code":"a","content":"x","severity":"recoverable"},
            |{"type":"error","code":"b","content":"y","severity":"unrecoverable"}
        |]
        """.trimMargin()
        val rawMessage = ecErrorMessageWithMessages(messages)
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener).onCheckoutViewFailedWithError(
            argThat { this is ClientException },
        )
    }

    @Test
    fun `ec error without required messages field is ignored by typed handler`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.error","params":{"error":{$ERROR_RESPONSE_UCP}}}"""
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.error) { fail("Malformed ec.error should not dispatch") }
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(mockListener, never()).onCheckoutViewFailedWithError(any())
    }

    // endregion

    // region delegated notifications

    @Test
    fun `ec complete is delegated to client`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { received = true }
        ecp.setClient(client)

        ecp.postMessage(ecCompleteMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(received).isTrue()
    }

    @Test
    fun `ec complete invalidates cached preload`() {
        CheckoutWebView.preload("https://shopify.dev/cart/123", activity)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ecp.postMessage(ecCompleteMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
    }

    // endregion

    // region client delegation — requests

    @Test
    fun `unknown request returns method not found and is not delegated to client`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"customMethod","id":"8","params":{}}"""
        assertMethodNotFoundByBridge(rawMessage, """"id":"8"""")
    }

    @Test
    fun `typed delegation response for supported request is sent back to checkout`() {
        val rawMessage = windowOpenRequest(id = "\"9\"", url = "https://example.com")
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) {
                WindowOpenResult.Rejected(reason = "merchant says no")
            }
        ecp.setClient(client)

        val js = captureEvaluatedJs { ecp.postMessage(rawMessage) }

        assertThat(js).contains("window.EmbeddedCheckoutProtocol")
        assertThat(js).contains(".postMessage(")
        assertThat(js).contains("merchant says no")
    }

    @Test
    fun `null client response for supported notification sends nothing to checkout`() {
        val rawMessage = ecMessagesChangeMessage()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.messagesChange) { /* no-op */ }
        ecp.setClient(client)

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    @Test
    fun `unknown notification sends nothing to checkout`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"unknownMethod"}""")
    }

    @Test
    fun `unknown request with no client returns method not found`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"unknownMethod","id":"11"}""")
        }

        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
        assertThat(js).contains("Method not found")
        assertThat(js).contains(""""id":"11"""")
    }

    @Test
    fun `unknown request with null id returns method not found`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"unknownMethod","id":null}""")
        }

        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
        assertThat(js).contains("Method not found")
        assertThat(js).contains("\"id\":null")
    }

    @Test
    fun `unknown request with invalid id sends no response`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"unknownMethod","id":{},"params":{}}""")
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"unknownMethod","id":1.5,"params":{}}""")
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"unknownMethod","id":true,"params":{}}""")
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

    @Test
    fun `ec ready with non-object params sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"13","params":[]}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
        assertThat(js).contains(""""id":"13"""")
    }

    @Test
    fun `ec ready with non-array delegate sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"14","params":{"delegate":{}}}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
        assertThat(js).contains(""""id":"14"""")
    }

    // endregion

    // region helpers

    private fun ecReadyMessage(id: String = "\"1\""): String {
        val params = """{"delegate":["fulfillment.address_change","payment.instruments_change"]}"""
        return """{"jsonrpc":"2.0","method":"ec.ready","id":$id,"params":$params}"""
    }

    private fun windowOpenRequest(id: String, url: String): String =
        """{"jsonrpc":"2.0","method":"ec.window.open_request","id":$id,"params":{"url":"$url"}}"""

    private fun assertIgnoredByBridge(rawMessage: String) {
        ecp.setClient(CheckoutProtocol.Client())

        ecp.postMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        verify(viewSpy, never()).evaluateJavascript(any(), any())
    }

    private fun assertMethodNotFoundByBridge(rawMessage: String, expectedId: String) {
        ecp.setClient(CheckoutProtocol.Client())

        val js = captureEvaluatedJs {
            ecp.postMessage(rawMessage)
        }

        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32601")
        assertThat(js).contains("Method not found")
        assertThat(js).contains(expectedId)
    }

    private fun ecErrorMessage(severity: String): String {
        val messages =
            """[{"type":"error","code":"session_failed","content":"Session failed","severity":"$severity"}]"""
        return ecErrorMessageWithMessages(messages)
    }

    private fun ecErrorMessageWithMessages(messages: String): String {
        val error = """{$ERROR_RESPONSE_UCP,"messages":$messages}"""
        return """{"jsonrpc":"2.0","method":"ec.error","params":{"error":$error}}"""
    }

    private fun ecStartMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":${checkoutJson()}}}"""

    private fun ecMessagesChangeMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.messages.change","params":{"checkout":${checkoutJson()}}}"""

    private fun ecCompleteMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.complete","params":{"checkout":${checkoutJson(status = "completed")}}}"""

    private fun checkoutJson(
        id: String = "chk1",
        currency: String = "USD",
        status: String = "incomplete",
    ): String {
        val ucp = """{"payment_handlers":{},"version":"1.0"}"""
        return """{"id":"$id","currency":"$currency","status":"$status","line_items":[],"totals":[],"links":[],"ucp":$ucp}"""
    }

    private companion object {
        private const val ERROR_RESPONSE_UCP = """"ucp":{"version":"2026-04-08","status":"error"}"""
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

    /**
     * Makes [uri] resolvable through Robolectric's shadow package manager so that
     * `queryIntentActivities(Intent.ACTION_VIEW, uri)` returns a non-empty list.
     * Mirrors the behavior of a real device with a browser installed.
     */
    private fun registerFakeBrowserFor(uri: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
        val resolveInfo = ResolveInfo().apply {
            activityInfo = ActivityInfo().apply {
                packageName = "com.fake.browser"
                name = "FakeBrowserActivity"
            }
        }
        shadowOf(activity.packageManager).addResolveInfoForIntent(intent, resolveInfo)
    }

    // endregion
}
