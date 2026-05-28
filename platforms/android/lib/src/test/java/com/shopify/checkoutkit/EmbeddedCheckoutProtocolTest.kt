package com.shopify.checkoutkit

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ResolveInfo
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
    private lateinit var mockListener: CheckoutWebViewListener
    private lateinit var ecp: EmbeddedCheckoutProtocol

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        // Mirror real-Android behavior: startActivity throws ActivityNotFoundException when
        // no activity resolves the intent. Robolectric defaults to silently recording the
        // intent instead — turning on checkActivities aligns the shadow with production.
        shadowOf(activity.application).checkActivities(true)
        viewSpy = Mockito.spy(CheckoutWebView(activity))
        mockListener = mock()
        whenever(viewSpy.getListener()).thenReturn(mockListener)
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
    fun `ec ready ignores null and non-string delegate values`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r2","params":{"delegate":["window.open",null,{}]}}"""
            )
        }
        assertThat(js).contains("\"delegate\":[\"window.open\"]")
        assertThat(js).contains("\"status\":\"success\"")
        assertThat(js).doesNotContain("\"error\"")
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

    // region ec.window.open_request — merchant-overridable with kit fallback

    @Test
    fun `window open launches Custom Tabs when activity resolves the uri`() {
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
        assertThat(launched.`package`).isNull()
        assertThat(launched.extras?.keySet()).contains("android.support.customtabs.extra.SESSION")
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
    fun `window open default launches non-web URLs with native app controller`() {
        registerFakeBrowserFor("mailto:help@example.com")

        val js = captureEvaluatedJs {
            ecp.postMessage(windowOpenRequest(id = "\"43\"", url = "mailto:help@example.com"))
        }
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(js).contains("\"status\":\"success\"")
        val launched = shadowOf(activity).nextStartedActivity
        assertThat(launched).isNotNull()
        assertThat(launched.action).isEqualTo(Intent.ACTION_VIEW)
        assertThat(launched.data.toString()).isEqualTo("mailto:help@example.com")
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
    fun `window open emits invalid params when params url is not a string`() {
        val js = captureEvaluatedJs {
            ecp.postMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"10","params":{"url":{}}}"""
            )
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params is not an object`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.window.open_request","id":"11","params":[]}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32602")
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

    @Test
    fun `ec ready with non-object params sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"13","params":[]}""")
        }
        assertThat(js).contains("\"error\"")
        assertThat(js).contains("-32700")
    }

    @Test
    fun `ec ready with non-array delegate sends parse error`() {
        val js = captureEvaluatedJs {
            ecp.postMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"14","params":{"delegate":{}}}""")
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

    private fun windowOpenRequest(id: String, url: String): String =
        """{"jsonrpc":"2.0","method":"ec.window.open_request","id":$id,"params":{"url":"$url"}}"""

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
     * Makes [uri] resolvable through Robolectric's shadow package manager.
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
