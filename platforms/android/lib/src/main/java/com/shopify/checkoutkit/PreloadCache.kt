package com.shopify.checkoutkit

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
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

internal class PreloadCache(
    private val expiryScheduler: PreloadExpiryScheduler = HandlerPreloadExpiryScheduler(),
) : DefaultLifecycleObserver {
    companion object {
        const val THROTTLED_MESSAGE = "Preload throttled until the server-provided Retry-After delay elapses."
        private const val LOG_TAG = "PreloadCache"
        private const val PRELOAD_TTL_MS = 5 * 60 * 1000L
        private const val MILLISECONDS_PER_SECOND = 1_000L
    }

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
    private var throttleDeadline: Long? = null

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

    val isThrottleActive: Boolean
        get() {
            val deadline = throttleDeadline
            val active = deadline != null && clock.elapsedRealtime() < deadline
            if (!active) throttleDeadline = null
            return active
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
                ShopifyCheckoutKit.log.d(LOG_TAG, "Returning cached preloaded WebView.")
                observer = null
                cached.view.markPreloadConsumed()
                cached.view
            }
        }
    }

    /**
     * Retains a dismissed view when it is still the cached preload and within its time-to-live.
     *
     * @return `true` when the view remains cached; otherwise `false` so the caller can destroy it.
     */
    fun retainAfterPresentation(view: CheckoutWebView): Boolean {
        view.markDismissed()
        val cached = entry
        return when {
            cached?.view !== view -> false
            !cached.isFresh(clock.elapsedRealtime()) -> {
                ShopifyCheckoutKit.log.d(LOG_TAG, "Discarding expired preloaded WebView after dismissal.")
                clearEntry()
                false
            }
            else -> {
                scheduleExpiry(cached)
                true
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
    fun evict(
        state: PreloadState,
        view: CheckoutWebView? = null,
        suppressPreloadsForSeconds: Long? = null,
    ) {
        if (view != null && entry?.view !== view) return
        suppressPreloadsForSeconds?.let { delaySeconds ->
            val now = clock.elapsedRealtime()
            val delayMillis = delaySeconds
                .coerceAtMost(Long.MAX_VALUE / MILLISECONDS_PER_SECOND)
                .times(MILLISECONDS_PER_SECOND)
            throttleDeadline = if (delayMillis > Long.MAX_VALUE - now) {
                Long.MAX_VALUE
            } else {
                now + delayMillis
            }
        }
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
