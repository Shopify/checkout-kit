package com.shopify.checkoutkit

import android.app.Activity

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

    private data class Entry(
        val key: PreloadKey,
        val view: CheckoutWebView,
        val createdAt: Long,
        val ttl: Long = PRELOAD_TTL_MS,
    ) {
        fun isValid(key: PreloadKey, now: Long): Boolean {
            return this.key == key && now - createdAt < ttl
        }
    }

    var clock: Clock = Clock()
    private var entry: Entry? = null

    val hasEntry: Boolean
        get() = entry != null

    fun store(key: PreloadKey, view: CheckoutWebView) {
        invalidate()
        entry = Entry(
            key = key,
            view = view,
            createdAt = clock.currentTimeMillis(),
        )
    }

    fun take(key: PreloadKey, activity: Activity?): CheckoutWebView? = when (val cached = entry) {
        null -> null
        else -> if (!cached.isValid(key, clock.currentTimeMillis())) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding stale or mismatched preloaded WebView.")
            invalidate()
            null
        } else if (activity == null || cached.view.context.findActivity() !== activity) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding preloaded WebView created for a different Activity.")
            invalidate()
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

    fun cachedViewForTesting(): CheckoutWebView? = entry?.view

    private companion object {
        private const val LOG_TAG = "PreloadCache"
        private const val PRELOAD_TTL_MS = 5 * 60 * 1000L
    }
}
