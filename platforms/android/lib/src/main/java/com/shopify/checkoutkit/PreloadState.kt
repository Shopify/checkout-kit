package com.shopify.checkoutkit

/**
 * Observable lifecycle state of a preloaded checkout.
 */
public sealed class PreloadState {
    public object Idle : PreloadState()
    public object Loading : PreloadState()
    public object Ready : PreloadState()
    public object Expired : PreloadState()
    public data class Failed(public val reason: FailureReason) : PreloadState()

    public sealed class FailureReason {
        public data class HttpError(public val statusCode: Int) : FailureReason()
        public object NavigationFailed : FailureReason()
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
