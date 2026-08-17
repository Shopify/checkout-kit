package com.shopify.reactnative.checkoutkit

/**
 * Shared per-presentation dispatch handle.
 *
 * SDK lifecycle events and protocol events both invoke the same handle. Terminal lifecycle events
 * release it so subsequent protocol emissions are dropped, matching the iOS
 * pendingDispatchCallback lifecycle.
 */
class DispatchHandle(
    private val downstream: DispatchCallback,
) : DispatchCallback {
    private var released: Boolean = false

    @Synchronized
    override fun invoke(json: String) {
        if (!released) {
            downstream.invoke(json)
        }
    }

    @Synchronized
    fun release() {
        released = true
    }

    @Synchronized
    fun isReleased(): Boolean = released
}
