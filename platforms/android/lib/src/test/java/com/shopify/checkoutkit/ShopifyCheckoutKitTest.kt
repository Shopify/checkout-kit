package com.shopify.checkoutkit

import android.widget.RelativeLayout
import androidx.activity.ComponentActivity
import androidx.core.view.children
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowDialog
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

            val checkout = ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                noopDefaultCheckoutListener()
            )

            assertThat(checkout).isNull()
        }
    }

    @Test
    fun `activity destroy dismisses checkout without waiting for sheet animation`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()

            ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                noopDefaultCheckoutListener()
            )
            val sheet = ShadowDialog.getLatestDialog() as CheckoutBottomSheet
            val checkoutWebView = sheet.findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
                .children.first { it is CheckoutWebView } as CheckoutWebView
            sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
                .layout(0, 0, TEST_SHEET_SIZE, TEST_SHEET_SIZE)

            activityController.destroy()

            assertThat(sheet.isShowing).isFalse()
            assertThat(shadowOf(checkoutWebView).wasDestroyCalled()).isTrue()
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

    private companion object {
        private const val TEST_SHEET_SIZE = 1000
    }
}
