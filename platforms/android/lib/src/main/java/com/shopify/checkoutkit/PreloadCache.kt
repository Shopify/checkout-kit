package com.shopify.checkoutkit

import java.lang.ref.WeakReference

internal data class PreloadKey(val url: String) {
    companion object {
        fun forUrl(url: String): PreloadKey {
            return PreloadKey(CheckoutUrlDecorator.decorate(url))
        }
    }
}

internal class PreloadCache {

    internal open class Clock {
        open fun currentTimeMillis(): Long = System.currentTimeMillis()
    }

    private class Entry(
        val key: PreloadKey,
        val view: CheckoutWebView,
        val createdAt: Long,
        val ttl: Long = PRELOAD_TTL_MS,
    ) {
        var observer: WeakReference<CheckoutPreload>? = null
        var state: PreloadState = PreloadState.Idle
            private set

        fun isValid(key: PreloadKey, now: Long): Boolean {
            return this.key == key && now - createdAt < ttl
        }

        fun transition(state: PreloadState) {
            if (this.state == state) return
            this.state = state
            observer?.get()?.receive(state)
        }
    }

    var clock: Clock = Clock()
    private var entry: Entry? = null
    private val handles = mutableMapOf<PreloadKey, WeakReference<CheckoutPreload>>()

    val hasEntry: Boolean
        get() = entry != null

    fun register(handle: CheckoutPreload, key: PreloadKey) {
        handles[key] = WeakReference(handle)
        entry?.takeIf { it.key == key && it.isValid(key, clock.currentTimeMillis()) }?.let {
            it.observer = WeakReference(handle)
            handle.receive(it.state)
        }
    }

    fun transition(view: CheckoutWebView, state: PreloadState) {
        entry?.takeIf { it.view === view }?.transition(state)
    }

    fun store(key: PreloadKey, view: CheckoutWebView) {
        invalidate()
        entry = Entry(
            key = key,
            view = view,
            createdAt = clock.currentTimeMillis(),
        ).apply {
            observer = handles[key]
            transition(PreloadState.Loading)
        }
    }

    fun take(key: PreloadKey): CheckoutWebView? = when (val cached = entry) {
        null -> null
        else -> if (!cached.isValid(key, clock.currentTimeMillis())) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding stale or mismatched preloaded WebView.")
            evict(if (cached.key == key) PreloadState.Expired else PreloadState.Idle)
            null
        } else {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Returning cached preloaded WebView.")
            entry = null
            cached.view.markPreloadConsumed()
            cached.view
        }
    }

    fun invalidate() {
        val cached = entry ?: return
        entry = null
        if (!cached.view.isPresented) {
            cached.view.removeFromParent()
            cached.view.destroy()
        }
    }

    fun evict(state: PreloadState) {
        val cached = entry ?: return
        invalidate()
        cached.transition(state)
    }

    fun cachedViewForTesting(): CheckoutWebView? = entry?.view

    private companion object {
        private const val LOG_TAG = "PreloadCache"
        private const val PRELOAD_TTL_MS = 5 * 60 * 1000L
    }
}
