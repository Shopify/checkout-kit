package com.shopify.checkoutkit.internal.preload
import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import com.shopify.checkoutkit.checkout.CheckoutPreload
import com.shopify.checkoutkit.checkout.PreloadState
import com.shopify.checkoutkit.checkout.ShopifyCheckout
import com.shopify.checkoutkit.internal.web.CheckoutUrlDecorator
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import com.shopify.checkoutkit.internal.web.removeFromParent
import java.lang.ref.WeakReference

internal const val PRELOAD_CACHE_HIT_LOG_MESSAGE = "Returning cached preloaded WebView."
internal const val PRELOAD_STATE_HELD_LOG_MESSAGE = "Holding preload state until checkout is dismissed."

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

    var state: PreloadState = PreloadState.Idle()
        private set

    val hasEntry: Boolean
        get() = entry != null

    internal val cachedKey: PreloadKey?
        get() = entry?.key

    /**
     * A terminal state for a view that was removed while presented. A presented checkout is in use,
     * so its handle reports the state when the view is dismissed rather than mid-session.
     */
    private var heldState: HeldState? = null

    /** Refers to the view weakly, so a view that is never dismissed is not kept alive by its state. */
    private class HeldState(view: CheckoutWebView, val state: PreloadState) {
        private val view = WeakReference(view)

        fun isFor(view: CheckoutWebView): Boolean = this.view.get() === view
    }

    fun setObserver(observer: CheckoutPreload) {
        // A held state describes the previous handle's checkout, not this one.
        heldState = null
        this.observer = observer
    }

    fun transition(view: CheckoutWebView, state: PreloadState) {
        if (entry?.view !== view) return
        transition(state)
    }

    fun contains(view: CheckoutWebView): Boolean {
        val cached = entry
        val isCurrentEntry = cached?.view === view
        // The time-to-live is paused while a view is presented, so a live checkout is not expired.
        // Dismissal reports Expired if the kept view has outlived it.
        if (isCurrentEntry && !view.isPresented && cached?.isFresh(clock.elapsedRealtime()) == false) {
            ShopifyCheckout.log.d(LOG_TAG, "Discarding expired preloaded WebView.")
            evict(PreloadState.Idle(PreloadState.IdleReason.Expired))
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
        heldState = null
        val newEntry = Entry(
            key = key,
            view = view,
            lifecycleOwner = lifecycleOwner,
            createdAt = clock.elapsedRealtime(),
        )
        entry = newEntry
        if (lifecycleOwner.lifecycle.currentState == Lifecycle.State.DESTROYED) {
            evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))
            return
        }
        lifecycleOwner.lifecycle.addObserver(this)
        scheduleExpiry(newEntry)
        transition(PreloadState.Loading)
    }

    /**
     * Returns the cached view for [key] when [presenter] is the activity that preloaded it.
     *
     * A preloaded WebView keeps the activity it was created with as its context, and its cache
     * lifetime follows that activity. Another activity, or a context with no activity, gets a new
     * WebView instead, and the preload is discarded as invalidated.
     */
    fun take(key: PreloadKey, presenter: Activity?): CheckoutWebView? = entry?.let { cached ->
        val validEntry = when {
            !cached.isValid(key, clock.elapsedRealtime()) -> {
                ShopifyCheckout.log.d(LOG_TAG, "Discarding stale or mismatched preloaded WebView.")
                val reason = if (cached.key == key) PreloadState.IdleReason.Expired else PreloadState.IdleReason.Invalidated
                evict(PreloadState.Idle(reason))
                null
            }
            // A presented view stays cached for its own presentation; the caller creates a new one.
            cached.lifecycleOwner !== presenter && !cached.view.isPresented -> {
                ShopifyCheckout.log.d(LOG_TAG, "Discarding preloaded WebView created by a different activity.")
                evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))
                null
            }
            else -> cached
        } ?: run {
            // `evict` notifies synchronously, and its observer may re-enter `preload`.
            // Reuse only a fresh replacement that matches the requested key and activity.
            entry?.takeIf { it.isValid(key, clock.elapsedRealtime()) && it.lifecycleOwner === presenter }
        }

        validEntry?.let { cached ->
            cancelExpiry()
            if (cached.view.isPresented) {
                ShopifyCheckout.log.d(LOG_TAG, "Preloaded WebView is already presented; creating a new WebView.")
                null
            } else {
                ShopifyCheckout.log.d(LOG_TAG, PRELOAD_CACHE_HIT_LOG_MESSAGE)
                // The listener keeps following this view, so it learns when a view kept after
                // dismissal expires or is evicted.
                cached.view.markPreloadConsumed()
                cached.view
            }
        }
    }

    /**
     * Retains a dismissed view when it is still the cached preload and within its time-to-live.
     * Reports any state held for the view while it was presented.
     *
     * @return `true` when the view remains cached; otherwise `false` so the caller can destroy it.
     */
    fun retainAfterPresentation(view: CheckoutWebView): Boolean {
        view.markDismissed()
        heldState?.takeIf { it.isFor(view) }?.let { held ->
            heldState = null
            transition(held.state)
            return false
        }
        val cached = entry
        return when {
            cached?.view !== view -> false
            !cached.isFresh(clock.elapsedRealtime()) -> {
                ShopifyCheckout.log.d(LOG_TAG, "Discarding expired preloaded WebView after dismissal.")
                clearEntry()
                transition(PreloadState.Idle(PreloadState.IdleReason.Expired))
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
    fun evict(state: PreloadState, view: CheckoutWebView? = null) {
        if (view != null && entry?.view !== view) return
        // Idle reasons describe a removed entry. Invalid requests can fail before an entry exists.
        if (entry == null && state is PreloadState.Idle) return
        val presentedView = entry?.view?.takeIf { it.isPresented }
        invalidate()
        if (presentedView != null && state.isTerminal) {
            ShopifyCheckout.log.d(LOG_TAG, PRELOAD_STATE_HELD_LOG_MESSAGE)
            heldState = HeldState(presentedView, state)
        } else {
            transition(state)
        }
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
                    evict(PreloadState.Idle(PreloadState.IdleReason.Expired), view = entry.view)
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
        // The time-to-live is paused while the view is presented; dismissal reconciles it.
        if (cached.lifecycleOwner !== owner || cached.view.isPresented) return

        // Handler delays do not advance while a device sleeps, so reconcile TTL on foregrounding.
        if (cached.isFresh(clock.elapsedRealtime())) {
            scheduleExpiry(cached)
        } else {
            evict(PreloadState.Idle(PreloadState.IdleReason.Expired), view = cached.view)
        }
    }

    override fun onDestroy(owner: LifecycleOwner) {
        if (entry?.lifecycleOwner === owner) {
            ShopifyCheckout.log.d(LOG_TAG, "Discarding preloaded WebView for destroyed lifecycle owner.")
            evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))
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
    get() = this is PreloadState.Idle || this is PreloadState.Failed
