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

@RunWith(RobolectricTestRunner::class)
class CheckoutCompletionCacheTest {
    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration
    private val views = mutableListOf<CheckoutWebView>()
    private val checkoutUrl = "https://example.com/cart/checkout-example"
    private val nextCheckoutUrl = "https://example.com/cart/next-checkout-example"

    @Before
    fun setUp() {
        CheckoutTelemetry.overrideRecorderForTesting(NoOpTestCheckoutTelemetryRecorder)
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).idle()
        ShopifyCheckoutKit.configure { it.preloading = Preloading(enabled = true) }
        activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        views.distinct().forEach { view ->
            if (!shadowOf(view).wasDestroyCalled()) {
                view.markDismissed()
                view.destroy()
            }
        }
        shadowOf(Looper.getMainLooper()).idle()
        ShopifyCheckoutKit.configure { it.preloading = initialConfiguration.preloading }
        CheckoutTelemetry.overrideRecorderForTesting(null)
    }

    @Test
    fun `completion preserves a different checkout preloaded by the lifecycle callback`() {
        val completed = presentCheckout()
        var nextPreload: CheckoutWebView? = null
        val bridge = bridge(completed) { nextPreload = preload(nextCheckoutUrl) }

        bridge.receiveMessage(completionMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(nextPreload).isNotNull()
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(nextPreload)
        assertThat(shadowOf(requireNotNull(nextPreload)).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `completion evicts a same-checkout replacement preloaded by the lifecycle callback`() {
        val completed = presentCheckout()
        var replacement: CheckoutWebView? = null
        val bridge = bridge(completed) { replacement = preload(checkoutUrl) }

        bridge.receiveMessage(completionMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(replacement).isNotNull()
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(requireNotNull(replacement)).wasDestroyCalled()).isTrue()
        assertThat(shadowOf(completed).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `completion clears a cached presented checkout without destroying its presentation`() {
        val cached = preload(checkoutUrl)
        val completed = presentCheckout()
        assertThat(completed).isSameAs(cached)

        bridge(completed).receiveMessage(completionMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(completed).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `completion evicts same-checkout replacement when callback tears down the presentation first`() {
        val completed = presentCheckout()
        var replacement: CheckoutWebView? = null
        val bridge = bridge(completed) {
            CheckoutWebView.discardAfterPresentation(completed)
            completed.destroy()
            replacement = preload(checkoutUrl)
        }

        bridge.receiveMessage(completionMessage)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(replacement).isNotNull()
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(requireNotNull(replacement)).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `completion destroys its own background preload`() {
        val completed = preload(checkoutUrl)

        CheckoutWebView.evictForCompletion(completed)

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(completed).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `old background completion cannot evict a newer different checkout`() {
        val completed = preload(checkoutUrl)
        val newer = preload(nextCheckoutUrl)

        CheckoutWebView.evictForCompletion(completed)

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(newer)
        assertThat(shadowOf(newer).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `old background completion cannot evict a newer same-checkout preload`() {
        val completed = preload(checkoutUrl)
        val newer = preload(checkoutUrl)

        CheckoutWebView.evictForCompletion(completed)

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(newer)
        assertThat(shadowOf(newer).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `completion matches the original checkout after web navigation`() {
        val completed = presentCheckout()
        completed.loadUrl("https://example.com/order/order-example")
        val replacement = preload(checkoutUrl)

        CheckoutWebView.evictForCompletion(completed)

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(replacement).wasDestroyCalled()).isTrue()
    }

    private fun presentCheckout(): CheckoutWebView =
        CheckoutWebView.checkoutViewFor(checkoutUrl, activity, FakeWebMessageTransport()).also {
            it.markPresented()
            views.add(it)
            shadowOf(Looper.getMainLooper()).idle()
        }

    private fun preload(url: String): CheckoutWebView {
        CheckoutWebView.preload(url, activity, FakeWebMessageTransport())
        shadowOf(Looper.getMainLooper()).idle()
        return requireNotNull(CheckoutWebView.cachedPreloadViewForTesting()).also(views::add)
    }

    private fun bridge(view: CheckoutWebView, onComplete: () -> Unit = {}): EmbeddedCheckoutProtocolBridge {
        val listener = CheckoutWebViewListener(object : DefaultCheckoutListener() {
            override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit

            override fun onCheckoutDismissed() = Unit

            override fun onCheckoutCompleted(event: CheckoutCompleteEvent) {
                onComplete()
            }
        })
        view.setListener(listener)
        return EmbeddedCheckoutProtocolBridge(
            view,
            FakeWebMessageTransport(),
            protocolMessageExecutor = Executor { it.run() },
        ).also { it.setPresentationListener(listener) }
    }

    private val completionMessage = """
        {
          "jsonrpc": "2.0",
          "method": "ec.complete",
          "params": {"checkout": {
            "id": "checkout-example", "currency": "USD", "status": "completed",
            "line_items": [], "links": [], "totals": [],
            "ucp": {"payment_handlers": {}, "version": "${CheckoutProtocol.SPEC_VERSION}"}
          }}
        }
    """.trimIndent()
}
