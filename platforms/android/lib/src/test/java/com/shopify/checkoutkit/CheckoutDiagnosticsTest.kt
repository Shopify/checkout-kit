package com.shopify.checkoutkit

import android.os.Looper
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class CheckoutDiagnosticsTest {
    private val rejection = CheckoutMessageRejection(
        origin = "https://evil.example.com",
        reason = CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED,
    )
    private val event = CheckoutDiagnosticEvent.MessageRejected(rejection)

    @Test
    fun `each subscriber receives emitted diagnostics`() {
        val diagnostics = CheckoutDiagnostics()
        val first = mutableListOf<CheckoutDiagnosticEvent>()
        val second = mutableListOf<CheckoutDiagnosticEvent>()
        val firstSubscription = diagnostics.subscribe { first.add(it) }
        val secondSubscription = diagnostics.subscribe { second.add(it) }

        diagnostics.emit(event)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(first).containsExactly(event)
        assertThat(second).containsExactly(event)
        firstSubscription.cancel()
        secondSubscription.cancel()
    }

    @Test
    fun `cancelled subscription receives no later diagnostics`() {
        val diagnostics = CheckoutDiagnostics()
        val received = mutableListOf<CheckoutDiagnosticEvent>()
        val subscription = diagnostics.subscribe(received::add)

        subscription.cancel()
        subscription.cancel()
        diagnostics.emit(event)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(received).isEmpty()
    }

    @Test
    fun `new subscription does not replay earlier diagnostics`() {
        val diagnostics = CheckoutDiagnostics()
        val received = mutableListOf<CheckoutDiagnosticEvent>()

        diagnostics.emit(event)
        val subscription = diagnostics.subscribe(received::add)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(received).isEmpty()
        subscription.cancel()
    }

    @Test
    fun `throwing listener does not prevent later listeners`() {
        val diagnostics = CheckoutDiagnostics()
        val received = mutableListOf<CheckoutDiagnosticEvent>()
        val throwingSubscription = diagnostics.subscribe { error("listener failed") }
        val receivingSubscription = diagnostics.subscribe(received::add)

        diagnostics.emit(event)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(received).containsExactly(event)
        throwingSubscription.cancel()
        receivingSubscription.cancel()
    }

    @Test
    fun `listeners are delivered on the main thread`() {
        val diagnostics = CheckoutDiagnostics()
        var deliveredLooper: Looper? = null
        val subscription = diagnostics.subscribe { deliveredLooper = Looper.myLooper() }

        diagnostics.emit(event)
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(deliveredLooper).isEqualTo(Looper.getMainLooper())
        subscription.cancel()
    }
}
