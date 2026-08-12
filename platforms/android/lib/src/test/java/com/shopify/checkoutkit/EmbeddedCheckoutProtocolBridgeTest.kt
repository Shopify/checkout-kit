package com.shopify.checkoutkit

import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Looper
import android.webkit.RenderProcessGoneDetail
import androidx.activity.ComponentActivity
import com.shopify.ucp.embedded.checkout.WindowOpenRequest
import com.shopify.ucp.embedded.checkout.windowOpenRejected
import com.shopify.ucp.embedded.checkout.windowOpenSuccess
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.util.concurrent.Executor
import java.util.concurrent.Executors

@RunWith(RobolectricTestRunner::class)
@Suppress("LargeClass")
class EmbeddedCheckoutProtocolBridgeTest {

    private lateinit var activity: ComponentActivity
    private lateinit var viewSpy: CheckoutWebView
    private lateinit var mockListener: CheckoutWebViewListener
    private lateinit var ecp: EmbeddedCheckoutProtocolBridge
    private val directExecutor = Executor { it.run() }
    private val webMessageTransport = FakeWebMessageTransport()

    @Before
    fun setUp() {
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).idle()
        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        // Mirror real-Android behavior: startActivity throws ActivityNotFoundException when
        // no activity resolves the intent. Robolectric defaults to silently recording the
        // intent instead — turning on checkActivities aligns the shadow with production.
        shadowOf(activity.application).checkActivities(true)
        viewSpy = Mockito.spy(CheckoutWebView(activity, webMessageTransport))
        mockListener = mock()
        whenever(viewSpy.listener).thenReturn(mockListener)
        ecp = EmbeddedCheckoutProtocolBridge(
            viewSpy,
            webMessageTransport,
            protocolMessageExecutor = directExecutor,
        )
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).idle()
    }

    @Test
    fun `receive message queues protocol processing on protocol message executor`() {
        var queuedCommand: Runnable? = null
        val deferredExecutor = Executor { command ->
            queuedCommand = command
        }
        val asyncBridge = EmbeddedCheckoutProtocolBridge(
            viewSpy,
            webMessageTransport,
            protocolMessageExecutor = deferredExecutor,
        )

        asyncBridge.receiveMessage(ecReadyMessage())

        assertThat(queuedCommand).isNotNull()
        assertThat(webMessageTransport.sentMessages).isEmpty()

        queuedCommand!!.run()
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(webMessageTransport.sentMessages).hasSize(1)
    }

    // region ec.ready

    @Test
    fun `ec ready returns a ucp success result without a delegate echo`() {
        val response = captureSentMessage {
            ecp.receiveMessage(ecReadyMessage())
        }
        assertThat(response).contains("\"result\"")
        assertThat(response).contains("\"ucp\"")
        assertThat(response).contains("\"status\":\"success\"")
        assertThat(response).contains("\"version\":\"${CheckoutProtocol.SPEC_VERSION}\"")
        assertThat(response).doesNotContain("\"delegate\"")
        assertThat(response).doesNotContain("\"error\"")
    }

    @Test
    fun `ec ready ACK echoes string request id`() {
        val response = captureSentMessage {
            ecp.receiveMessage(ecReadyMessage(id = "\"req-42\""))
        }
        assertThat(response).contains("\"id\":\"req-42\"")
    }

    @Test
    fun `ec ready ACK echoes numeric id`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":7,"params":{"delegate":[]}}""")
        }
        assertThat(response).contains("\"id\":7")
    }

    @Test
    fun `ec ready ACK echoes null request id`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":null,"params":{"delegate":[]}}""")
        }
        assertThat(response).contains("\"id\":null")
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
    fun `ec ready response targets EmbeddedCheckoutProtocol`() {
        captureSentMessage {
            ecp.receiveMessage(ecReadyMessage())
        }
        assertThat(webMessageTransport.sentMessages.single().targetObjectName)
            .isEqualTo("EmbeddedCheckoutProtocol")
    }

    @Test
    fun `ec ready with non-string delegate values sends invalid params`() {
        val response = captureSentMessage {
            ecp.receiveMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r2","params":{"delegate":["window.open",null,{}]}}"""
            )
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
        assertThat(response).contains(""""id":"r2"""")
    }

    @Test
    fun `ec ready omits delegate field when no supported delegations requested`() {
        val response = captureSentMessage {
            ecp.receiveMessage(
                """{"jsonrpc":"2.0","method":"ec.ready","id":"r3","params":{"delegate":["fulfillment.address_change"]}}"""
            )
        }
        assertThat(response).doesNotContain("\"delegate\"")
        assertThat(response).contains("\"status\":\"success\"")
    }

    @Test
    fun `ec ready omits delegate field when delegate array is empty`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"r4","params":{"delegate":[]}}""")
        }
        assertThat(response).doesNotContain("\"delegate\"")
        assertThat(response).contains("\"status\":\"success\"")
    }

    @Test
    fun `ec ready without a delegate key sends invalid params`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"r5","params":{}}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
        assertThat(response).contains(""""id":"r5"""")
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
    fun `window open launches Custom Tabs when activity resolves the uri`() {
        registerFakeBrowserFor("https://example.com")

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"7\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"status\":\"success\"")
        val launched = shadowOf(activity).nextStartedActivity
        assertThat(launched).isNotNull()
        assertThat(launched.action).isEqualTo(Intent.ACTION_VIEW)
        assertThat(launched.data.toString()).isEqualTo("https://example.com")
        assertThat(launched.`package`).isEqualTo(FAKE_BROWSER_PACKAGE)
        assertThat(launched.extras?.keySet()).contains("android.support.customtabs.extra.SESSION")
        assertThat(launched.flags and Intent.FLAG_ACTIVITY_NEW_TASK).isEqualTo(0)
    }

    @Test
    fun `window open emits UCP rejection when no activity resolves the uri`() {
        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"42\"", url = "https://nothing-resolves.invalid"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(response).contains("\"severity\":\"unrecoverable\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open falls back to kit default when consumer client has no handler`() {
        registerFakeBrowserFor("https://example.com")
        // Empty typed client — no .on(CheckoutProtocol.windowOpen) registered.
        ecp.setClient(CheckoutProtocol.Client())

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"status\":\"success\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNotNull()
    }

    @Test
    fun `window open default launches non-web URLs with an external app intent`() {
        registerFakeBrowserFor("mailto:help@example.com")

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"43\"", url = "mailto:help@example.com"))
        }

        assertThat(response).contains("\"status\":\"success\"")
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
                windowOpenRejected(reason = "merchant says no")
            }
        ecp.setClient(merchantClient)

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(response).contains("merchant says no")
        // Kit default never ran — no intent launched.
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open passes the parsed url through to the merchant handler`() {
        var captured: WindowOpenRequest? = null
        val merchantClient = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { request ->
                captured = request
                windowOpenSuccess()
            }
        ecp.setClient(merchantClient)

        ecp.receiveMessage(windowOpenRequest(id = "\"8\"", url = "https://example.com/promo?id=42"))
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(captured).isNotNull()
        assertThat(captured!!.url).isEqualTo("https://example.com/promo?id=42")
    }

    @Test
    fun `window open emits invalid params when params url is missing`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.window.open_request","id":"9","params":{}}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params url is null`() {
        val response = captureSentMessage {
            ecp.receiveMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"10","params":{"url":null}}"""
            )
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
    }

    @Test
    fun `window open emits invalid params when params url is not a string`() {
        val response = captureSentMessage {
            ecp.receiveMessage(
                """{"jsonrpc":"2.0","method":"ec.window.open_request","id":"11","params":{"url":{}}}"""
            )
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
    }

    @Test
    fun `window open emits UCP rejection when url does not resolve to an activity`() {
        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"13\"", url = "https://example.com/a b"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(response).contains("\"severity\":\"unrecoverable\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open rejects a malformed url before launching even when an activity resolves it`() {
        registerFakeBrowserFor("https://example.com/a b")

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"14\"", url = "https://example.com/a b"))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(response).contains("\"severity\":\"unrecoverable\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open rejects a blank url before launching`() {
        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "\"15\"", url = "   "))
        }
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(response).contains("\"code\":\"window_open_rejected_error\"")
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `window open emits invalid params when params is not an object`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.window.open_request","id":"12","params":[]}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
    }

    @Test
    fun `window open response echoes null request id`() {
        val merchantClient = CheckoutProtocol.Client()
            .on(CheckoutProtocol.windowOpen) { windowOpenSuccess() }
        ecp.setClient(merchantClient)

        val response = captureSentMessage {
            ecp.receiveMessage(windowOpenRequest(id = "null", url = "https://example.com"))
        }

        assertThat(response).contains("\"id\":null")
        assertThat(response).contains("\"status\":\"success\"")
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
        ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}""")
        shadowOf(Looper.getMainLooper()).idle()
        verify(mockListener).onCheckoutViewLoadComplete()
    }

    @Test
    fun `ec start bubbles up to client`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { received = true }
        ecp.setClient(client)

        ecp.receiveMessage(ecStartMessage())
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(received).isTrue()
    }

    @Test
    fun `ec start sends no response to checkout`() {
        ecp.setClient(CheckoutProtocol.Client())

        ecp.receiveMessage(ecStartMessage())
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(webMessageTransport.sentMessages).isEmpty()
    }

    // endregion

    // region ec.error — terminal protocol and lifecycle failure

    @Test
    fun `terminal ec error forwards the full payload before failing presentation`() {
        var receivedMessages = emptyList<com.shopify.ucp.embedded.checkout.Message>()
        ecp.setClient(CheckoutProtocol.Client().on(CheckoutProtocol.error) { receivedMessages = it.messages })

        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        val received = receivedMessages.single()
        assertThat(received.code).isEqualTo("unrecoverable_failure")
        assertThat(received.content).isEqualTo("Session failed")
        assertThat(received.severity!!.value).isEqualTo("unrecoverable")
        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        CheckoutExceptionAssert.assertThat(captor.firstValue)
            .hasCode(CheckoutErrorCode.UNKNOWN)
            .hasMessage("Session failed")
    }

    @Test
    fun `terminal ec error without an unrecoverable error message fails with unknown`() {
        ecp.receiveMessage(ecErrorMessage(severity = "recoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        CheckoutExceptionAssert.assertThat(captor.firstValue)
            .hasCode(CheckoutErrorCode.UNKNOWN)
            .hasMessage("Embedded checkout reported a terminal error.")
    }

    @Test
    fun `terminal ec error selects the first wire-order unrecoverable error message`() {
        val messages = """[
            |{"type":"error","code":"invalid_cart","content":"Cart invalid","severity":"recoverable"},
            |{"type":"error","code":"cart_completed","content":"Cart complete","severity":"unrecoverable"},
            |{"type":"error","code":"invalid_cart","content":"Cart invalid again","severity":"unrecoverable"}
        |]
        """.trimMargin()

        ecp.receiveMessage(ecErrorMessageWithMessages(messages))
        shadowOf(Looper.getMainLooper()).idle()

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        CheckoutExceptionAssert.assertThat(captor.firstValue)
            .hasCode(CheckoutErrorCode.CART_COMPLETED)
            .hasMessage("Cart complete")
    }

    @Test
    fun `duplicate terminal ec errors fail presentation once`() {
        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        verify(mockListener).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `renderer termination after terminal error delivers one lifecycle failure`() {
        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        viewSpy.CheckoutWebViewClient().onRenderProcessGone(viewSpy, mock<RenderProcessGoneDetail>())

        verify(mockListener, Mockito.times(1)).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `terminal error after renderer termination delivers one lifecycle failure`() {
        viewSpy.CheckoutWebViewClient().onRenderProcessGone(viewSpy, mock<RenderProcessGoneDetail>())
        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))

        verify(mockListener, Mockito.times(1)).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `terminal ec error transitions cached preload to protocol failure`() {
        val preload = CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)!!
        shadowOf(Looper.getMainLooper()).idle()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!
        val preloadBridge = EmbeddedCheckoutProtocolBridge(
            cachedWebView,
            webMessageTransport,
            protocolMessageExecutor = directExecutor,
        )

        preloadBridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedWebView).wasDestroyCalled()).isTrue()
        assertThat(preload.state).isEqualTo(
            PreloadState.Failed(
                PreloadState.FailureReason.ProtocolError,
                "Checkout sent a terminal protocol error.",
            ),
        )
    }

    @Test
    fun `duplicate terminal errors on backgrounded preload do not deliver lifecycle failure`() {
        CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)
        shadowOf(Looper.getMainLooper()).idle()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!
        cachedWebView.setListener(mockListener)
        val preloadBridge = EmbeddedCheckoutProtocolBridge(
            cachedWebView,
            webMessageTransport,
            protocolMessageExecutor = directExecutor,
        )

        preloadBridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        preloadBridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        verify(mockListener, Mockito.never()).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `terminal cached preload error defers cache eviction from protocol executor to main thread`() {
        val preload = CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)!!
        shadowOf(Looper.getMainLooper()).idle()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!
        val executor = Executors.newSingleThreadExecutor()
        val bridge = EmbeddedCheckoutProtocolBridge(
            cachedWebView,
            webMessageTransport,
            protocolMessageExecutor = executor,
        )

        try {
            bridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
            executor.submit {}.get()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(cachedWebView)

            shadowOf(Looper.getMainLooper()).idle()
            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
            assertThat(preload.state).isEqualTo(
                PreloadState.Failed(
                    PreloadState.FailureReason.ProtocolError,
                    "Checkout sent a terminal protocol error.",
                ),
            )
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `terminal ec error of retained post-presentation checkout does not update consumed preload handle`() {
        val preload = CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)!!
        shadowOf(Looper.getMainLooper()).idle()
        val view = CheckoutWebView.checkoutViewFor("https://shopify.dev/cart/123", activity, webMessageTransport)
        view.markPresented()
        assertThat(CheckoutWebView.retainAfterPresentation(view)).isTrue()
        val bridge = EmbeddedCheckoutProtocolBridge(view, webMessageTransport, protocolMessageExecutor = directExecutor)

        bridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(preload.state).isEqualTo(PreloadState.Loading)
    }

    @Test
    fun `terminal error from foreign view does not evict active cached preload`() {
        CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)
        shadowOf(Looper.getMainLooper()).idle()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ecp.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(cachedWebView)
    }

    @Test
    fun `terminal error of noncached preload delivers lifecycle failure`() {
        val preloadedView = CheckoutWebView(activity, webMessageTransport).apply {
            loadCheckout("https://shopify.dev/cart/123", isPreload = true)
            setListener(mockListener)
        }
        val preloadBridge = EmbeddedCheckoutProtocolBridge(
            preloadedView,
            webMessageTransport,
            protocolMessageExecutor = directExecutor,
        )

        preloadBridge.receiveMessage(ecErrorMessage(severity = "unrecoverable"))
        shadowOf(Looper.getMainLooper()).idle()

        verify(mockListener).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `malformed ec error fails presentation with sdk error`() {
        val rawMessage = """{"jsonrpc":"2.0","method":"ec.error","params":{"error":{$ERROR_RESPONSE_UCP}}}"""

        ecp.receiveMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).idle()

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        CheckoutExceptionAssert.assertThat(captor.firstValue)
            .hasCode(CheckoutErrorCode.SDK_ERROR)
            .hasMessage("Embedded checkout sent an invalid terminal error.")
    }

    @Test
    fun `malformed ec error envelope fails presentation with sdk error`() {
        val rawMessage = """{"jsonrpc":2,"method":"ec.error","params":{"error":{$ERROR_RESPONSE_UCP}}}"""

        ecp.receiveMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).idle()

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())
        CheckoutExceptionAssert.assertThat(captor.firstValue)
            .hasCode(CheckoutErrorCode.SDK_ERROR)
            .hasMessage("Embedded checkout sent an invalid terminal error.")
    }

    // endregion

    // region delegated notifications

    @Test
    fun `ec complete is delegated to client`() {
        var received = false
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.complete) { received = true }
        ecp.setClient(client)

        ecp.receiveMessage(ecCompleteMessage())
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(received).isTrue()
    }

    @Test
    fun `ec complete invalidates cached preload`() {
        CheckoutWebView.preload("https://shopify.dev/cart/123", activity, webMessageTransport)
        shadowOf(Looper.getMainLooper()).idle()
        val cachedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        ecp.receiveMessage(ecCompleteMessage())
        shadowOf(Looper.getMainLooper()).idle()

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
                windowOpenRejected(reason = "merchant says no")
            }
        ecp.setClient(client)

        val response = captureSentMessage { ecp.receiveMessage(rawMessage) }

        assertThat(webMessageTransport.sentMessages.single().targetObjectName)
            .isEqualTo("EmbeddedCheckoutProtocol")
        assertThat(response).contains("merchant says no")
    }

    @Test
    fun `null client response for supported notification sends nothing to checkout`() {
        val rawMessage = ecMessagesChangeMessage()
        val client = CheckoutProtocol.Client()
            .on(CheckoutProtocol.messagesChange) { /* no-op */ }
        ecp.setClient(client)

        ecp.receiveMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(webMessageTransport.sentMessages).isEmpty()
    }

    @Test
    fun `unknown notification sends nothing to checkout`() {
        assertIgnoredByBridge("""{"jsonrpc":"2.0","method":"unknownMethod"}""")
    }

    @Test
    fun `unknown request with no client returns method not found`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"unknownMethod","id":"11"}""")
        }

        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32601")
        assertThat(response).contains("Method not found")
        assertThat(response).contains(""""id":"11"""")
    }

    @Test
    fun `unknown request with null id returns method not found`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"unknownMethod","id":null}""")
        }

        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32601")
        assertThat(response).contains("Method not found")
        assertThat(response).contains("\"id\":null")
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
        val response = captureSentMessage {
            ecp.receiveMessage("not valid json {{{")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32700")
    }

    @Test
    fun `message missing method field sends parse error`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","id":"12"}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32700")
    }

    @Test
    fun `ec ready with non-object params sends invalid params`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"13","params":[]}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
        assertThat(response).contains(""""id":"13"""")
    }

    @Test
    fun `ec ready with non-array delegate sends invalid params`() {
        val response = captureSentMessage {
            ecp.receiveMessage("""{"jsonrpc":"2.0","method":"ec.ready","id":"14","params":{"delegate":{}}}""")
        }
        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32602")
        assertThat(response).contains(""""id":"14"""")
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

        ecp.receiveMessage(rawMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(webMessageTransport.sentMessages).isEmpty()
    }

    private fun assertMethodNotFoundByBridge(rawMessage: String, expectedId: String) {
        ecp.setClient(CheckoutProtocol.Client())

        val response = captureSentMessage {
            ecp.receiveMessage(rawMessage)
        }

        assertThat(response).contains("\"error\"")
        assertThat(response).contains("-32601")
        assertThat(response).contains("Method not found")
        assertThat(response).contains(expectedId)
    }

    private fun ecErrorMessage(severity: String): String {
        val messages =
            """[{"type":"error","code":"unrecoverable_failure","content":"Session failed","severity":"$severity"}]"""
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
        private const val FAKE_BROWSER_PACKAGE = "com.fake.browser"
        private const val CUSTOM_TABS_SERVICE_ACTION = "android.support.customtabs.action.CustomTabsService"
    }

    /** Runs [block], drains the main-thread queue, and captures the raw response message. */
    private fun captureSentMessage(block: () -> Unit): String {
        val initialMessageCount = webMessageTransport.sentMessages.size
        block()
        shadowOf(Looper.getMainLooper()).idle()
        assertThat(webMessageTransport.sentMessages).hasSize(initialMessageCount + 1)
        return webMessageTransport.sentMessages.last().message
    }

    /**
     * Makes [uri] resolvable through Robolectric's shadow package manager.
     * Mirrors the behavior of a real device with a browser installed.
     */
    private fun registerFakeBrowserFor(uri: String) {
        val componentName = ComponentName(FAKE_BROWSER_PACKAGE, "FakeBrowserActivity")
        val intentFilter = IntentFilter(Intent.ACTION_VIEW).apply {
            addCategory(Intent.CATEGORY_DEFAULT)
            addCategory(Intent.CATEGORY_BROWSABLE)
            setOf("http", "https", Uri.parse(uri).scheme).filterNotNull().forEach(::addDataScheme)
        }
        val customTabsService = ComponentName(FAKE_BROWSER_PACKAGE, "FakeCustomTabsService")
        val packageManager = shadowOf(activity.packageManager)
        packageManager.addActivityIfNotPresent(componentName)
        packageManager.addIntentFilterForActivity(componentName, intentFilter)
        packageManager.addServiceIfNotPresent(customTabsService)
        packageManager.addIntentFilterForService(
            customTabsService,
            IntentFilter(CUSTOM_TABS_SERVICE_ACTION),
        )
    }

    // endregion
}
