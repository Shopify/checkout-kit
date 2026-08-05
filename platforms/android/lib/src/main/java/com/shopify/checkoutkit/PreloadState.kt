package com.shopify.checkoutkit

/**
 * Observable lifecycle state of a preloaded checkout.
 */
public sealed class PreloadState {
    public data object Idle : PreloadState()
    public data object Loading : PreloadState()
    public data object Ready : PreloadState()
    public data object Expired : PreloadState()
    public data class Failed(public val reason: FailureReason) : PreloadState()

    /**
     * Explains why a preload failed.
     *
     * This is an alpha sealed hierarchy. New failure reasons can require consumers
     * with exhaustive `when` expressions to handle an additional case when recompiling.
     */
    public sealed class FailureReason {
        /** The preload received an HTTP response that prevented it from loading. */
        public data class HttpError(public val statusCode: Int) : FailureReason()

        /** Preload navigation failed. */
        public data object NavigationFailed : FailureReason()

        /** The preloaded WebView's content process terminated. */
        public data object WebContentProcessTerminated : FailureReason()

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
 * Returned by [ShopifyCheckoutKit.preload] exposing the current preload state.
 * Because the preload cache is single-slot, every instance reflects the same
 * shared state.
 *
 * The cache retains the current instance while its preload is active. A subsequent
 * preload replaces the observer, so retain the returned instance if you need to
 * inspect its shared [state] after it stops receiving changes.
 */
public class CheckoutPreload internal constructor(private val cache: PreloadCache) {
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
                value?.onStateChanged(cache.state)
            }
        }

    public val state: PreloadState
        get() = cache.state

    internal fun receive(state: PreloadState) {
        listener?.onStateChanged(state)
    }
}
