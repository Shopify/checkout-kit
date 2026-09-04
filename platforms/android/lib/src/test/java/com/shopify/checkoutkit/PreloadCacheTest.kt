package com.shopify.checkoutkit

import androidx.activity.ComponentActivity
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
