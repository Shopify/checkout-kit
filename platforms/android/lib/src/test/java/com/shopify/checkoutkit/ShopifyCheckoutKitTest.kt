package com.shopify.checkoutkit

import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitTest {

    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure {
            it.colorScheme = initialConfiguration.colorScheme
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `present returns null when activity is finishing`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            activity.finish()

            val dialog = ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                noopDefaultCheckoutListener()
            )

            assertThat(dialog).isNull()
        }
    }

    @Test
    fun `preload creates cached checkout view`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()

            ShopifyCheckoutKit.preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()

            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()
            assertThat(cachedView).isNotNull
            assertThat(shadowOf(cachedView).lastAdditionalHttpHeaders)
                .containsEntry("Shopify-Purpose", "prefetch")
        }
    }

    @Test
    fun `preload does nothing when activity is finishing`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            activity.finish()

            ShopifyCheckoutKit.preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        }
    }

    @Test
    fun `preload does nothing when disabled`() {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()

            ShopifyCheckoutKit.preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        }
    }

    @Test
    fun `configure clears cached checkout view`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            ShopifyCheckoutKit.preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

            ShopifyCheckoutKit.configure {
                it.logLevel = LogLevel.DEBUG
            }
            ShadowLooper.shadowMainLooper().runToEndOfTasks()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
            assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        }
    }

    @Test
    fun `invalidate clears cached checkout view`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            ShopifyCheckoutKit.preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

            ShopifyCheckoutKit.invalidate()
            ShadowLooper.shadowMainLooper().runToEndOfTasks()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
            assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        }
    }
}
