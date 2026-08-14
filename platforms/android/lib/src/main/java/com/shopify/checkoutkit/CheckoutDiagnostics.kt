package com.shopify.checkoutkit

import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.atomic.AtomicBoolean

/** An SDK diagnostic that applications may observe for integration telemetry. */
public sealed interface CheckoutDiagnosticEvent {
    /** An incoming checkout message was denied before protocol dispatch. */
    public data class MessageRejected(
        public val rejection: CheckoutMessageRejection,
    ) : CheckoutDiagnosticEvent
}

/**
 * Details about an incoming checkout message denied by the ingress policy.
 *
 * The raw message body is intentionally omitted because rejected input is untrusted and may
 * contain sensitive or arbitrarily large data.
 */
public data class CheckoutMessageRejection(
    /** Origin the message was received from, for example `https://example.com`. */
    public val origin: String,

    /** Stable reason the message was denied. */
    public val reason: Reason,
) {
    public enum class Reason {
        /** The message was sent from a child frame rather than the checkout's main frame. */
        CHILD_FRAME,

        /** The message origin used explicit port zero while origin validation was enabled. */
        UNSUPPORTED_PORT,

        /** The message origin did not match the effective allowlist. */
        ORIGIN_NOT_ALLOWED,
    }
}

/**
 * SDK-wide diagnostic events emitted by Checkout Kit.
 *
 * Subscriptions are hot and do not replay earlier events. Subscribe before calling `preload` when
 * preload diagnostics are required. Listener failures are isolated so diagnostics cannot interrupt
 * checkout processing or prevent other listeners from receiving an event.
 */
public class CheckoutDiagnostics internal constructor() {
    /** Receives diagnostic events on the Android main thread. */
    public fun interface Listener {
        public fun onDiagnosticEvent(event: CheckoutDiagnosticEvent)
    }

    /** A cancellable diagnostic subscription. */
    public interface Subscription : AutoCloseable {
        /** Stops this listener from receiving future events. */
        public fun cancel()

        /** Equivalent to [cancel], enabling Java try-with-resources usage. */
        override fun close(): Unit = cancel()
    }

    private val listeners = CopyOnWriteArraySet<Listener>()

    /**
     * Subscribes [listener] to future diagnostics.
     *
     * The returned subscription retains the listener until it is cancelled.
     */
    public fun subscribe(listener: Listener): Subscription {
        listeners.add(listener)
        return ListenerSubscription(listeners, listener)
    }

    internal fun emit(event: CheckoutDiagnosticEvent) {
        log(event)

        // Snapshot before dispatch so a listener added after emission cannot observe an earlier
        // event, and listeners may cancel themselves without mutating the traversed collection.
        val currentListeners = listeners.toList()
        onMainThread {
            currentListeners.forEach { listener ->
                try {
                    listener.onDiagnosticEvent(event)
                } catch (error: Exception) {
                    ShopifyCheckoutKit.log.e(DIAGNOSTICS_LOG_TAG, "Diagnostic listener threw", error)
                }
            }
        }
    }

    private fun log(event: CheckoutDiagnosticEvent) {
        when (event) {
            is CheckoutDiagnosticEvent.MessageRejected -> {
                val rejection = event.rejection
                ShopifyCheckoutKit.log.d(
                    DIAGNOSTICS_LOG_TAG,
                    "Rejected checkout message from ${rejection.origin}: ${rejection.reason.logDescription}",
                )
            }
        }
    }

    private class ListenerSubscription(
        private val listeners: CopyOnWriteArraySet<Listener>,
        private val listener: Listener,
    ) : Subscription {
        private val cancelled = AtomicBoolean(false)

        override fun cancel() {
            if (cancelled.compareAndSet(false, true)) {
                listeners.remove(listener)
            }
        }
    }

    private companion object {
        private const val DIAGNOSTICS_LOG_TAG = "CheckoutDiagnostics"
    }
}

private val CheckoutMessageRejection.Reason.logDescription: String
    get() = when (this) {
        CheckoutMessageRejection.Reason.CHILD_FRAME -> "message was sent from a child frame"
        CheckoutMessageRejection.Reason.UNSUPPORTED_PORT -> "origin uses unsupported port 0"
        CheckoutMessageRejection.Reason.ORIGIN_NOT_ALLOWED -> "origin is not in the allowlist"
    }
