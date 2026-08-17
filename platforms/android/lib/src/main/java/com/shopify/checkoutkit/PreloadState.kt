package com.shopify.checkoutkit

/**
 * Observable lifecycle state of a preloaded checkout.
 *
 * A failed state includes a stable failure reason and a best-effort diagnostic message. Use
 * the reason to determine how to handle the failure; the message is not a stable,
 * machine-readable value.
 */
public sealed class PreloadState {
    public data object Idle : PreloadState()
    public data object Loading : PreloadState()
    public data object Ready : PreloadState()
    public data object Expired : PreloadState()

    public data class Failed(
        public val reason: FailureReason,
        public val message: String,
    ) : PreloadState()

    /**
     * Explains why a preload failed.
     *
     * This is an alpha sealed hierarchy. New failure reasons can require consumers
     * with exhaustive `when` expressions to handle an additional case when recompiling.
     */
    public sealed class FailureReason {
        /**
         * The preload was throttled and Checkout Kit is suppressing further preload requests
         * until the server-provided `Retry-After` delay elapses.
         */
        public data object Throttled : FailureReason()

        /**
         * The preload received an HTTP response that prevented it from loading.
         *
         * Under the [Preloading.ThrottlePolicy.PASSTHROUGH] policy, [retryAfterSeconds] is the
         * server-provided delay when a throttling response includes a valid `Retry-After` header.
         */
        public data class HttpError @JvmOverloads public constructor(
            public val statusCode: Int,
            public val retryAfterSeconds: Long? = null,
        ) : FailureReason()

        /** Preload navigation failed. */
        public data object NavigationFailed : FailureReason()

        /** Cached web content became unavailable before the preload could be reused. */
        public data object WebContentUnavailable : FailureReason()

        /** Checkout sent a terminal protocol error while preloading. */
        public data object ProtocolError : FailureReason()
    }
}

/**
 * Listener invoked on the main thread whenever the preload state changes.
 */
public fun interface PreloadStateListener {
    public fun onStateChanged(state: PreloadState)
}

/**
 * Returned by [ShopifyCheckoutKit.preload] exposing that preload's latest observed state.
 *
 * The cache retains the current instance while its preload is active. A subsequent
 * preload replaces the observer; the earlier handle retains its last observed [state]
 * but stops receiving updates. When presentation reuses a cached preload, that handle also
 * stops receiving updates and retains its last observed state, which may be [PreloadState.Loading].
 */
public class CheckoutPreload internal constructor(cache: PreloadCache) {
    private var currentState: PreloadState = cache.state

    init {
        cache.setObserver(this)
    }

    /**
     * Called immediately on the main thread with the current state, then whenever
     * the preload state changes.
     */
    public var listener: PreloadStateListener? = null
        set(value) {
            onMainThread {
                field = value
                value?.onStateChanged(currentState)
            }
        }

    public val state: PreloadState
        get() = currentState

    internal fun receive(state: PreloadState) {
        currentState = state
        listener?.onStateChanged(state)
    }
}
