package com.shopify.checkoutkit

import android.os.Looper
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.util.concurrent.Executor
import java.util.concurrent.Executors

@RunWith(RobolectricTestRunner::class)
class CheckoutEventsIntegrationTest {
    private lateinit var view: CheckoutWebView
    private val transport = FakeWebMessageTransport()
    private val events = mutableListOf<String>()
    private val listener = CheckoutWebViewListener(object : DefaultCheckoutListener() {
        override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit

        override fun onCheckoutDismissed() = Unit

        override fun onCheckoutStarted(event: CheckoutStartEvent) {
            assertThat(Looper.myLooper()).isSameAs(Looper.getMainLooper())
            events.add("start")
        }

        override fun onCheckoutUpdated(event: CheckoutUpdateEvent) {
            assertThat(Looper.myLooper()).isSameAs(Looper.getMainLooper())
            events.add("update")
        }

        override fun onCheckoutCompleted(event: CheckoutCompleteEvent) {
            assertThat(Looper.myLooper()).isSameAs(Looper.getMainLooper())
            events.add("complete")
        }
    })

    @Before
    fun setUp() {
        CheckoutTelemetry.overrideRecorderForTesting(NoOpTestCheckoutTelemetryRecorder)
        val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        view = CheckoutWebView(activity, transport)
    }

    @After
    fun tearDown() {
        view.destroy()
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).idle()
        CheckoutTelemetry.overrideRecorderForTesting(null)
    }

    @Test
    fun `bridge delivers ordered main-thread events without a consumer protocol client`() {
        val executor = Executors.newSingleThreadExecutor()
        val bridge = EmbeddedCheckoutProtocolBridge(view, transport, protocolMessageExecutor = executor)
        bridge.setPresentationListener(listener)
        try {
            bridge.receiveMessage(message("ec.start"))
            bridge.receiveMessage(message("ec.totals.change", total = 1))
            bridge.receiveMessage(message("ec.complete", total = 1))
            executor.submit {}.get()
            shadowOf(Looper.getMainLooper()).idle()

            assertThat(events).containsExactly("start", "update", "complete")
            assertThat(transport.sentMessages).isEmpty()
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `queued old presentation messages do not reach a rebound listener`() {
        val commands = mutableListOf<Runnable>()
        val bridge = EmbeddedCheckoutProtocolBridge(view, transport, protocolMessageExecutor = Executor(commands::add))
        bridge.setPresentationListener(listener)
        bridge.receiveMessage(message("ec.start"))
        bridge.setPresentationListener(CheckoutWebViewListener(NoopCheckoutListener()))
        bridge.setPresentationListener(listener)
        commands.removeAt(0).run()
        bridge.receiveMessage(message("ec.messages.change"))
        commands.removeAt(0).run()

        assertThat(events).containsExactly("update")
    }

    @Test
    fun `messages received while preloading are not replayed on presentation`() {
        val commands = mutableListOf<Runnable>()
        val bridge = EmbeddedCheckoutProtocolBridge(view, transport, protocolMessageExecutor = Executor(commands::add))
        bridge.receiveMessage(message("ec.start"))
        bridge.setPresentationListener(listener)
        commands.removeAt(0).run()

        assertThat(events).isEmpty()
    }

    @Test
    fun `terminal failure suppresses subsequently queued lifecycle events`() {
        val executor = Executors.newSingleThreadExecutor()
        val bridge = EmbeddedCheckoutProtocolBridge(view, transport, protocolMessageExecutor = executor)
        bridge.setPresentationListener(listener)
        try {
            bridge.receiveMessage("""{"jsonrpc":"2.0","method":"ec.error","params":{}}""")
            bridge.receiveMessage(message("ec.start"))
            bridge.receiveMessage(message("ec.messages.change"))
            bridge.receiveMessage(message("ec.complete"))
            executor.submit {}.get()
            shadowOf(Looper.getMainLooper()).idle()

            assertThat(view.hasHandledTerminalFailure).isTrue()
            assertThat(events).isEmpty()
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `queued links are rejected instead of reaching a subsequent presentation`() {
        val commands = mutableListOf<Runnable>()
        val bridge = EmbeddedCheckoutProtocolBridge(view, transport, protocolMessageExecutor = Executor(commands::add))
        val linkListener = CheckoutWebViewListener(object : DefaultCheckoutListener() {
            override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit
            override fun onCheckoutDismissed() = Unit
            override fun onCheckoutLinkClicked(link: CheckoutLink): CheckoutLinkAction {
                events.add("link")
                return CheckoutLinkAction.Handled
            }
        })
        bridge.setPresentationListener(linkListener)
        bridge.receiveMessage(
            """{"jsonrpc":"2.0","id":"link","method":"ec.window.open_request","params":{"url":"https://example.com"}}""",
        )
        bridge.setPresentationListener(CheckoutWebViewListener(NoopCheckoutListener()))
        bridge.setPresentationListener(linkListener)
        commands.removeAt(0).run()

        assertThat(events).isEmpty()
        assertThat(transport.sentMessages.single().message).contains("window_open_rejected_error")
    }

    private fun message(method: String, total: Int = 0): String = """{
        "jsonrpc":"2.0","method":"$method","params":{"checkout":{
          "id":"checkout-1","currency":"USD","status":"incomplete","line_items":[],"links":[],
          "totals":[{"type":"total","amount":$total}],
          "ucp":{"payment_handlers":{},"version":"${CheckoutProtocol.SPEC_VERSION}"}
        }}
    }"""
}
