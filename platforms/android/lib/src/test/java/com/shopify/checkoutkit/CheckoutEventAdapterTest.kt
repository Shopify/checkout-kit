package com.shopify.checkoutkit

import android.os.Looper
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.util.concurrent.Executors

@RunWith(RobolectricTestRunner::class)
class CheckoutEventAdapterTest {
    private val started = mutableListOf<CheckoutStartEvent>()
    private val updated = mutableListOf<CheckoutUpdateEvent>()
    private val completed = mutableListOf<CheckoutCompleteEvent>()
    private val listener = CheckoutWebViewListener(object : DefaultCheckoutListener() {
        override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit

        override fun onCheckoutDismissed() = Unit

        override fun onCheckoutStarted(event: CheckoutStartEvent) {
            started.add(event)
        }

        override fun onCheckoutUpdated(event: CheckoutUpdateEvent) {
            updated.add(event)
        }

        override fun onCheckoutCompleted(event: CheckoutCompleteEvent) {
            completed.add(event)
        }
    })

    @Test
    fun `start projects checkout and all supported changes produce full snapshots`() {
        val adapter = CheckoutEventAdapter(listener)
        adapter.process(message("ec.start"))
        listOf("line_items", "messages", "totals", "fulfillment").forEachIndexed { index, source ->
            adapter.process(message("ec.$source.change", total = index + 1))
        }

        assertThat(started.single().checkout.id).isEqualTo("checkout-1")
        assertThat(updated).hasSize(4)
        assertThat(updated.map { it.checkout.totals.single().amount }).containsExactly(1L, 2L, 3L, 4L)
    }

    @Test
    fun `equal updates across sources and ucp-only changes are suppressed`() {
        val adapter = CheckoutEventAdapter(listener)
        adapter.process(message("ec.start"))
        adapter.process(message("ec.messages.change"))
        adapter.process(message("ec.totals.change", version = "2099-01-01"))
        adapter.process(message("ec.fulfillment.change", total = 1))
        adapter.process(message("ec.line_items.change", total = 1))

        assertThat(updated).hasSize(1)
    }

    @Test
    fun `start and complete always emit and update the comparison state`() {
        val adapter = CheckoutEventAdapter(listener)
        repeat(2) { adapter.process(message("ec.start")) }
        repeat(2) { adapter.process(message("ec.complete", total = 1)) }
        adapter.process(message("ec.totals.change", total = 1))

        assertThat(started).hasSize(2)
        assertThat(completed).hasSize(2)
        assertThat(updated).isEmpty()
    }

    @Test
    fun `unknown extensions participate in deduplication without derived line item state`() {
        val adapter = CheckoutEventAdapter(listener)
        adapter.process(message("ec.messages.change", extension = "first"))
        adapter.process(message("ec.messages.change", extension = "second"))

        assertThat(updated).hasSize(2)
        assertThat(updated.last().checkout.lineItems).isEmpty()
        assertThat(updated.last().checkout.additionalProperties).containsKey("com.example.extension")
    }

    @Test
    fun `unsupported buyer and payment changes do not emit`() {
        val adapter = CheckoutEventAdapter(listener)
        adapter.process(message("ec.buyer.change"))
        adapter.process(message("ec.payment.change"))

        assertThat(updated).isEmpty()
    }

    @Test
    fun `invalid snapshots report decode errors without emitting`() {
        val failures = mutableListOf<String>()
        val adapter = CheckoutEventAdapter(listener, failures::add)
        adapter.process("""{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{}}}""")

        assertThat(failures).containsExactly("ec.start")
        assertThat(started).isEmpty()
    }

    @Test
    fun `invalidating a presentation drops callbacks queued on the main thread`() {
        val adapter = CheckoutEventAdapter(listener)
        val executor = Executors.newSingleThreadExecutor()
        try {
            executor.submit { adapter.process(message("ec.start")) }.get()
            adapter.invalidate()
            shadowOf(Looper.getMainLooper()).idle()

            assertThat(started).isEmpty()
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `each presentation has fresh comparison state`() {
        val first = CheckoutEventAdapter(listener)
        first.process(message("ec.messages.change"))
        first.invalidate()
        CheckoutEventAdapter(listener).process(message("ec.messages.change"))

        assertThat(updated).hasSize(2)
    }

    private fun message(
        method: String,
        total: Int = 0,
        version: String = CheckoutProtocol.SPEC_VERSION,
        extension: String = "value",
    ): String = """{
        "jsonrpc":"2.0","method":"$method","params":{"checkout":{
          "id":"checkout-1","currency":"USD","status":"incomplete","line_items":[],"links":[],
          "messages":[{"type":"error","code":"out_of_stock","content":"Unavailable"}],
          "totals":[{"type":"total","amount":$total}],"com.example.extension":"$extension",
          "ucp":{"payment_handlers":{},"version":"$version"}
        }}
    }"""
}
