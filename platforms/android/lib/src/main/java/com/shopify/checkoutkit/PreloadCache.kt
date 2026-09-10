package com.shopify.checkoutkit

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner

internal const val PRELOAD_CACHE_HIT_LOG_MESSAGE = "Returning cached preloaded WebView."

internal data class PreloadKey(val url: String) {
    companion object {
        fun forUrl(url: String): PreloadKey {
            return PreloadKey(CheckoutUrlDecorator.decorate(url))
        }
    }
}

internal class PreloadCache(
    private val expiryScheduler: PreloadExpiryScheduler = HandlerPreloadExpiryScheduler(),
) : DefaultLifecycleObserver {

    /** Monotonic, sleep-inclusive clock used to measure preload time-to-live. */
    internal open class Clock {
        open fun elapsedRealtime(): Long = SystemClock.elapsedRealtime()
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

    fun contains(view: CheckoutWebView): Boolean {
        val cached = entry
        val isCurrentEntry = cached?.view === view
        if (isCurrentEntry && cached?.isFresh(clock.elapsedRealtime()) == false) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding expired preloaded WebView.")
            evict(PreloadState.Expired)
        }
        return entry?.view === view
    }

    private fun transition(state: PreloadState) {
        if (this.state == state) {
            // Do not emit duplicate terminal states. A CheckoutPreload registered while the
            // cache is terminal seeds this state and replays it when its listener is attached.
            if (state.isTerminal) observer = null
            return
        }

        this.state = state
        val notifiedObserver = observer
        notifiedObserver?.receive(state)
        if (state.isTerminal && observer === notifiedObserver) {
            observer = null
        }
    }

    fun store(key: PreloadKey, view: CheckoutWebView, lifecycleOwner: LifecycleOwner) {
        invalidate()
        val newEntry = Entry(
            key = key,
            view = view,
            lifecycleOwner = lifecycleOwner,
            createdAt = clock.elapsedRealtime(),
        )
        entry = newEntry
        if (lifecycleOwner.lifecycle.currentState == Lifecycle.State.DESTROYED) {
            evict(PreloadState.Idle)
            return
        }
        lifecycleOwner.lifecycle.addObserver(this)
        scheduleExpiry(newEntry)
        transition(PreloadState.Loading)
    }

    fun take(key: PreloadKey): CheckoutWebView? = entry?.let { cached ->
        val validEntry = if (cached.isValid(key, clock.elapsedRealtime())) {
            cached
        } else {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding stale or mismatched preloaded WebView.")
            evict(if (cached.key == key) PreloadState.Expired else PreloadState.Idle)
            // `evict` notifies synchronously, and its observer may re-enter `preload`.
            // Reuse only a fresh replacement that matches the requested key.
            entry?.takeIf { it.isValid(key, clock.elapsedRealtime()) }
        }

        validEntry?.let { cached ->
            cancelExpiry()
            if (cached.view.isPresented) {
                ShopifyCheckoutKit.log.d(LOG_TAG, "Preloaded WebView is already presented; creating a new WebView.")
                null
            } else {
                ShopifyCheckoutKit.log.d(LOG_TAG, PRELOAD_CACHE_HIT_LOG_MESSAGE)
                observer = null
                cached.view.markPreloadConsumed()
                cached.view
            }
        }
    }

    fun discard(view: CheckoutWebView) {
        view.markDismissed()
        val cached = entry
        if (cached?.view === view) {
            clearEntry()
        }
    }

    fun invalidate() {
        val cached = clearEntry() ?: return
        if (!cached.view.isPresented) {
            cached.view.removeFromParent()
            cached.view.destroy()
        }
    }

    /**
     * Evicts the current cached entry and transitions to state.
     *
     * When view is provided, eviction only occurs if it is still the cached entry. Use this for
     * callbacks from a specific WebView so a stale callback cannot evict a replacement preload.
     */
    fun evict(state: PreloadState, view: CheckoutWebView? = null) {
        if (view != null && entry?.view !== view) return
        invalidate()
        transition(state)
    }

    /** Clears the cached entry and all resources associated with its cache lifetime. */
    private fun clearEntry(): Entry? {
        cancelExpiry()
        val cached = entry ?: return null
        entry = null
        cached.lifecycleOwner.lifecycle.removeObserver(this)
        return cached
    }

    private fun scheduleExpiry(entry: Entry) {
        cancelExpiry()
        val delay = (entry.ttl - (clock.elapsedRealtime() - entry.createdAt)).coerceAtLeast(0)
        expiryScheduler.schedule(delay) {
            if (this.entry?.view === entry.view) {
                if (entry.isFresh(clock.elapsedRealtime())) {
                    scheduleExpiry(entry)
                } else {
                    evict(PreloadState.Expired, view = entry.view)
                }
            }
        }
    }

    private fun cancelExpiry() {
        expiryScheduler.cancel()
    }

    internal val cachedView: CheckoutWebView?
        get() = entry?.view

    override fun onStart(owner: LifecycleOwner) {
        val cached = entry ?: return
        if (cached.lifecycleOwner !== owner) return

        // Handler delays do not advance while a device sleeps, so reconcile TTL on foregrounding.
        if (cached.isFresh(clock.elapsedRealtime())) {
            scheduleExpiry(cached)
        } else {
            evict(PreloadState.Expired, view = cached.view)
        }
    }

    override fun onDestroy(owner: LifecycleOwner) {
        if (entry?.lifecycleOwner === owner) {
            ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding preloaded WebView for destroyed lifecycle owner.")
            evict(PreloadState.Idle)
        }
    }

    private companion object {
        private const val LOG_TAG = "PreloadCache"
        private const val PRELOAD_TTL_MS = 5 * 60 * 1000L
    }
}

/** Schedules expiry for the current cached preload. */
internal interface PreloadExpiryScheduler {
    /** Schedules [action] after [delayMillis], replacing any existing scheduled expiry. */
    fun schedule(delayMillis: Long, action: () -> Unit)

    /** Cancels the scheduled expiry, if any. */
    fun cancel()
}

private class HandlerPreloadExpiryScheduler : PreloadExpiryScheduler {
    private val handler by lazy { Handler(Looper.getMainLooper()) }
    private var runnable: Runnable? = null

    override fun schedule(delayMillis: Long, action: () -> Unit) {
        cancel()
        val scheduledRunnable = Runnable {
            runnable = null
            action()
        }
        runnable = scheduledRunnable
        handler.postDelayed(scheduledRunnable, delayMillis)
    }

    override fun cancel() {
        runnable?.let { handler.removeCallbacks(it) }
        runnable = null
    }
}

private val PreloadState.isTerminal: Boolean
    get() = this == PreloadState.Idle || this == PreloadState.Expired || this is PreloadState.Failed
