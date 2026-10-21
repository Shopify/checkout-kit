package com.shopify.checkoutkit.checkout

import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.internal.preload.PRELOAD_CACHE_HIT_LOG_MESSAGE
import com.shopify.checkoutkit.internal.preload.PreloadCache
import com.shopify.checkoutkit.internal.preload.PreloadExpiryScheduler
import com.shopify.checkoutkit.internal.preload.PreloadKey
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
class PreloadCacheTest {
    @Test
    fun `cache-hit diagnostic stays aligned with sample observers`() {
        assertThat(PRELOAD_CACHE_HIT_LOG_MESSAGE).isEqualTo("Returning cached preloaded WebView.")
    }

    @Test
    fun `invalidating an empty cache preserves initial state without notifying`() {
        val cache = PreloadCache(FakePreloadExpiryScheduler())
        val states = mutableListOf<PreloadState>()
        val preload = CheckoutPreload(cache).also { it.listener = PreloadStateListener(states::add) }

        cache.evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))

        assertThat(cache.state).isEqualTo(PreloadState.Idle())
        assertThat(preload.state).isEqualTo(PreloadState.Idle())
        assertThat(states).containsExactly(PreloadState.Idle())
    }

    @Test
    fun `expiry at ttl boundary preserves expired reason through empty invalidation`() {
        var now = 1_000L
        val scheduler = FakePreloadExpiryScheduler()
        val cache = PreloadCache(scheduler).also {
            it.clock = object : PreloadCache.Clock() {
                override fun elapsedRealtime(): Long = now
            }
        }
        cache.store(PreloadKey("https://example.com/checkout"), mock(), activity())
        val states = mutableListOf<PreloadState>()
        val preload = CheckoutPreload(cache).also { it.listener = PreloadStateListener(states::add) }
        now += TimeUnit.MINUTES.toMillis(5) - 1
        scheduler.fire()
        assertThat(cache.hasEntry).isTrue()
        assertThat(scheduler.scheduledDelayMillis).isEqualTo(1)

        now += 1
        scheduler.fire()
        cache.evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))

        val expired = PreloadState.Idle(PreloadState.IdleReason.Expired)
        assertThat(cache.hasEntry).isFalse()
        assertThat(cache.state).isEqualTo(expired)
        assertThat(preload.state).isEqualTo(expired)
        assertThat(states).containsExactly(PreloadState.Loading, expired)
    }

    @Test
    fun `invalidating an empty cache preserves failure without notifying`() {
        val cache = PreloadCache(FakePreloadExpiryScheduler())
        cache.store(PreloadKey("https://example.com/checkout"), mock(), activity())
        val states = mutableListOf<PreloadState>()
        val preload = CheckoutPreload(cache).also { it.listener = PreloadStateListener(states::add) }
        val failure = PreloadState.Failed(PreloadState.FailureReason.NavigationFailed, "Navigation failed.")
        cache.evict(failure)

        cache.evict(PreloadState.Idle(PreloadState.IdleReason.Invalidated))

        assertThat(cache.state).isEqualTo(failure)
        assertThat(preload.state).isEqualTo(failure)
        assertThat(states).containsExactly(PreloadState.Loading, failure)
    }

    @Test
    fun `future idle reason is preserved and releases the observer`() {
        val cache = PreloadCache(FakePreloadExpiryScheduler())
        val key = PreloadKey("https://example.com/checkout")
        cache.store(key, mock(), activity())
        val states = mutableListOf<PreloadState>()
        val preload = CheckoutPreload(cache).also { it.listener = PreloadStateListener(states::add) }
        val reason = PreloadState.IdleReason("futureReason")
        val futureIdle = PreloadState.Idle(reason)

        cache.evict(futureIdle)
        cache.store(key, mock(), activity())

        assertThat(preload.state).isEqualTo(futureIdle)
        assertThat(states).containsExactly(PreloadState.Loading, futureIdle)
        val handledReason = when (reason) {
            PreloadState.IdleReason.Invalidated, PreloadState.IdleReason.Expired -> "known"
            else -> reason.rawValue
        }
        assertThat(handledReason).isEqualTo("futureReason")
    }

    @Test
    fun `destroying lifecycle owner invalidates preload`() {
        val cache = PreloadCache(FakePreloadExpiryScheduler())
        val owner = activity()
        cache.store(PreloadKey("https://example.com/checkout"), mock(), owner)
        val preload = CheckoutPreload(cache)

        cache.onDestroy(owner)

        assertThat(cache.hasEntry).isFalse()
        assertThat(preload.state).isEqualTo(PreloadState.Idle(PreloadState.IdleReason.Invalidated))
    }

    @Test
    fun `expiry timer rearms while entry is fresh`() {
        val now = 1_000L
        val scheduler = FakePreloadExpiryScheduler()
        val cache = PreloadCache(scheduler).also {
            it.clock = object : PreloadCache.Clock() {
                override fun elapsedRealtime(): Long = now
            }
        }
        val view = mock<CheckoutWebView>()
        val key = PreloadKey("https://checkout.shopify.com/cart/123")

        cache.store(key, view, activity())
        scheduler.fire()

        assertThat(cache.hasEntry).isTrue()
        assertThat(scheduler.scheduledDelayMillis).isEqualTo(TimeUnit.MINUTES.toMillis(5))
    }

    @Test
    fun `starting lifecycle owner expires stale preload`() {
        var now = 1_000L
        val scheduler = FakePreloadExpiryScheduler()
        val cache = PreloadCache(scheduler).also {
            it.clock = object : PreloadCache.Clock() {
                override fun elapsedRealtime(): Long = now
            }
        }
        val owner = activity()
        val view = mock<CheckoutWebView>()
        val key = PreloadKey("https://checkout.shopify.com/cart/123")

        cache.store(key, view, owner)
        now += TimeUnit.MINUTES.toMillis(5)

        cache.onStart(owner)

        assertThat(cache.hasEntry).isFalse()
        assertThat(scheduler.isScheduled).isFalse()
        assertThat(cache.state).isEqualTo(PreloadState.Idle(PreloadState.IdleReason.Expired))
    }

    @Test
    fun `taking an already presented preload cancels expiry`() {
        val scheduler = FakePreloadExpiryScheduler()
        val cache = PreloadCache(scheduler)
        val view = mock<CheckoutWebView>()
        whenever(view.isPresented).thenReturn(true)
        val key = PreloadKey("https://checkout.shopify.com/cart/123")

        cache.store(key, view, activity())
        assertThat(scheduler.isScheduled).isTrue()

        assertThat(cache.take(key)).isNull()

        assertThat(scheduler.isScheduled).isFalse()
    }

    @Test
    fun `discard clears consumed preload`() {
        val scheduler = FakePreloadExpiryScheduler()
        val cache = PreloadCache(scheduler)
        val view = mock<CheckoutWebView>()
        val key = PreloadKey("https://checkout.shopify.com/cart/123")

        cache.store(key, view, activity())
        assertThat(cache.take(key)).isSameAs(view)
        assertThat(cache.hasEntry).isTrue()

        cache.discard(view)

        assertThat(cache.hasEntry).isFalse()
        assertThat(scheduler.isScheduled).isFalse()
    }

    private fun activity(): ComponentActivity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()

    private class FakePreloadExpiryScheduler : PreloadExpiryScheduler {
        var scheduledDelayMillis: Long? = null
            private set
        private var action: (() -> Unit)? = null

        val isScheduled: Boolean
            get() = action != null

        override fun schedule(delayMillis: Long, action: () -> Unit) {
            cancel()
            scheduledDelayMillis = delayMillis
            this.action = action
        }

        override fun cancel() {
            scheduledDelayMillis = null
            action = null
        }

        fun fire() {
            val scheduledAction = requireNotNull(action)
            cancel()
            scheduledAction()
        }
    }
}
