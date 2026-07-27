package com.shopify.checkoutkit

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner

internal data class PreloadKey(val url: String) {
    companion object {
        fun forUrl(url: String): PreloadKey {
            return PreloadKey(CheckoutUrlDecorator.decorate(url))
        }
    }
}

internal class PreloadCache : DefaultLifecycleObserver {

    internal open class Clock {
        open fun currentTimeMillis(): Long = System.currentTimeMillis()
    }

    private data class Entry(
        val key: PreloadKey,
        val view: CheckoutWebView,
        val lifecycleOwner: LifecycleOwner,
        val createdAt: Long,
        val ttl: Long = PRELOAD_TTL_MS,
    ) {
        fun isValid(key: PreloadKey, now: Long): Boolean {
            return this.key == key && now - createdAt < ttl
        }

        fun isFresh(now: Long): Boolean = now - createdAt < ttl
    }

    var clock: Clock = Clock()
    private var entry: Entry? = null
    private var observer: CheckoutPreload? = null

    var state: PreloadState = PreloadState.Idle
        private set

    val hasEntry: Boolean
        get() = entry != null

    fun setObserver(observer: CheckoutPreload) {
        this.observer = observer
    }

    fun transition(view: CheckoutWebView, state: PreloadState) {
        if (entry?.view !== view) return
        transition(state)
    }

    private fun transition(state: PreloadState) {
        if (this.state == state) return

        this.state = state
        val notifiedObserver = observer
        notifiedObserver?.receive(state)
        if (state.isTerminal && observer === notifiedObserver) {
            observer = null
        }
    }

    fun store(key: PreloadKey, view: CheckoutWebView, lifecycleOwner: LifecycleOwner) {
        invalidate()
        entry = Entry(
            key = key,
            view = view,
            lifecycleOwner = lifecycleOwner,
            createdAt = clock.currentTimeMillis(),
        )
        if (lifecycleOwner.lifecycle.currentState == Lifecycle.State.DESTROYED) {
            invalidate()
            return
        }
        lifecycleOwner.lifecycle.addObserver(this)
        transition(PreloadState.Loading)
    }

    fun take(key: PreloadKey): CheckoutWebView? = when (val cached = entry) {
        null -> null
        else -> if (!cached.isValid(key, clock.currentTimeMillis())) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding stale or mismatched preloaded WebView.")
            evict(if (cached.key == key) PreloadState.Expired else PreloadState.Idle)
            null
        } else if (cached.view.isPresented) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Preloaded WebView is already presented; creating a new WebView.")
            null
        } else {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Returning cached preloaded WebView.")
            observer = null
            cached.view.markPreloadConsumed()
            cached.view
        }
    }

    fun release(view: CheckoutWebView): Boolean {
        view.markDismissed()
        val cached = entry
        return when {
            cached?.view !== view -> false
            !cached.isFresh(clock.currentTimeMillis()) -> {
                ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding expired preloaded WebView after dismissal.")
                entry = null
                cached.lifecycleOwner.lifecycle.removeObserver(this)
                false
            }
            else -> true
        }
    }

    fun discard(view: CheckoutWebView) {
        view.markDismissed()
        val cached = entry
        if (cached?.view === view) {
            entry = null
            cached.lifecycleOwner.lifecycle.removeObserver(this)
        }
    }

    fun invalidate() {
        val cached = entry ?: return
        entry = null
        cached.lifecycleOwner.lifecycle.removeObserver(this)
        if (!cached.view.isPresented) {
            cached.view.removeFromParent()
            cached.view.destroy()
        }
    }

    fun invalidate(view: CheckoutWebView) {
        if (entry?.view === view) {
            invalidate()
        }
    }

    fun evict(state: PreloadState) {
        invalidate()
        transition(state)
    }

    fun evict(view: CheckoutWebView, state: PreloadState) {
        if (entry?.view !== view) return
        evict(state)
    }

    fun cachedViewForTesting(): CheckoutWebView? = entry?.view

    override fun onDestroy(owner: LifecycleOwner) {
        if (entry?.lifecycleOwner === owner) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding preloaded WebView for destroyed lifecycle owner.")
            invalidate()
        }
    }

    private companion object {
        private const val LOG_TAG = "PreloadCache"
        private const val PRELOAD_TTL_MS = 5 * 60 * 1000L
    }
}

private val PreloadState.isTerminal: Boolean
    get() = this == PreloadState.Idle || this == PreloadState.Expired || this is PreloadState.Failed
