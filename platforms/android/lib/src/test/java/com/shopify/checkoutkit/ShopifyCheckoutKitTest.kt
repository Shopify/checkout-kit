package com.shopify.checkoutkit

import android.widget.RelativeLayout
import androidx.activity.ComponentActivity
import androidx.core.view.children
import androidx.lifecycle.LifecycleRegistry
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowDialog
import org.robolectric.shadows.ShadowLooper
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutKitTest {

    private lateinit var initialConfiguration: Configuration
    private lateinit var webMessageTransport: FakeWebMessageTransport

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        webMessageTransport = FakeWebMessageTransport()
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().idle()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().idle()
        ShopifyCheckoutKit.configure {
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `present emits unsupported WebView error and returns null`() {
        webMessageTransport.supported = false
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            val listener = mock<DefaultCheckoutListener>()

            val checkout = ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                listener,
                webMessageTransport = webMessageTransport,
            )

            val captor = argumentCaptor<CheckoutException>()
            assertThat(checkout).isNull()
            verify(listener).onCheckoutFailed(captor.capture())
            CheckoutExceptionAssert.assertThat(captor.firstValue)
                .hasMessage("This Android WebView does not support Shopify Checkout Kit.")
                .hasCode(CheckoutErrorCode.WEB_VIEW_NOT_SUPPORTED)
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
                noopDefaultCheckoutListener(),
                webMessageTransport = webMessageTransport,
            )

            assertThat(checkout).isNull()
        }
    }

    @Test
    fun `present ignores a second call while a checkout is showing`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()

            val first = presentCheckout(activity)
            val second = presentCheckout(activity)

            assertThat(first).isNotNull
            assertThat(ShadowDialog.getShownDialogs()).hasSize(1)
            assertThat(second).isSameAs(first)
        }
    }

    @Test
    fun `present shows a new checkout after the previous one is dismissed`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()
            val first = presentCheckout(activity)
            layoutLatestSheet()

            first?.dismiss()
            ShadowLooper.idleMainLooper(1, TimeUnit.SECONDS)
            val second = presentCheckout(activity)

            assertThat(second).isNotNull
            assertThat(second).isNotSameAs(first)
            assertThat(ShadowDialog.getShownDialogs()).hasSize(2)
        }
    }

    @Test
    fun `present releases its lifecycle observer once checkout is dismissed`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()
            val registry = activity.lifecycle as LifecycleRegistry
            val observerCountBeforePresent = registry.observerCount

            val checkout = presentCheckout(activity)
            layoutLatestSheet()
            assertThat(registry.observerCount).isEqualTo(observerCountBeforePresent + 1)

            checkout?.dismiss()
            ShadowLooper.idleMainLooper(1, TimeUnit.SECONDS)

            assertThat(registry.observerCount).isEqualTo(observerCountBeforePresent)
        }
    }

    @Test
    fun `releasing the lifecycle observer keeps the preloaded checkout view reusable`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()
            val registry = activity.lifecycle as LifecycleRegistry
            preload(PRELOAD_URL, activity)
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!
            val observerCountBeforePresent = registry.observerCount

            val first = presentCheckout(activity, PRELOAD_URL)
            layoutLatestSheet()
            first?.dismiss()
            ShadowLooper.idleMainLooper(1, TimeUnit.SECONDS)
            presentCheckout(activity, PRELOAD_URL)

            assertThat(shadowOf(cachedView).wasDestroyCalled()).isFalse()
            assertThat(latestSheetCheckoutWebView()).isSameAs(cachedView)
            assertThat(registry.observerCount).isEqualTo(observerCountBeforePresent + 1)
        }
    }

    @Test
    fun `activity destroy dismisses checkout without waiting for sheet animation`() {
        Robolectric.buildActivity(ComponentActivity::class.java).setup().use { activityController ->
            val activity = activityController.get()

            ShopifyCheckoutKit.present(
                "https://shopify.dev",
                activity,
                noopDefaultCheckoutListener(),
                webMessageTransport = webMessageTransport,
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

            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()

            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()
            assertThat(cachedView).isNotNull
            assertThat(shadowOf(cachedView).lastAdditionalHttpHeaders)
                .containsEntry("Shopify-Purpose", "prefetch")
        }
    }

    @Test
    fun `preload does nothing when WebView is unsupported`() {
        webMessageTransport.supported = false
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()

            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        }
    }

    @Test
    fun `preload does nothing when activity is finishing`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            activity.finish()

            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()

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

            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        }
    }

    @Test
    fun `configure clears cached checkout view`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()
            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

            ShopifyCheckoutKit.configure {
                it.logLevel = LogLevel.DEBUG
            }
            ShadowLooper.shadowMainLooper().idle()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
            assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        }
    }

    @Test
    fun `invalidate clears cached checkout view`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val activity = activityController.get()
            preload("https://shopify.dev/cart/123", activity)
            ShadowLooper.shadowMainLooper().idle()
            val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

            ShopifyCheckoutKit.invalidate()
            ShadowLooper.shadowMainLooper().idle()

            assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
            assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        }
    }

    private fun preload(url: String, activity: ComponentActivity) {
        ShopifyCheckoutKit.preload(url, activity, webMessageTransport)
    }

    private fun presentCheckout(
        activity: ComponentActivity,
        url: String = "https://shopify.dev",
    ): CheckoutHandle? {
        return ShopifyCheckoutKit.present(
            url,
            activity,
            noopDefaultCheckoutListener(),
            webMessageTransport = webMessageTransport,
        )
    }

    private fun layoutLatestSheet() {
        val sheet = ShadowDialog.getLatestDialog() as CheckoutBottomSheet
        sheet.findViewById<CheckoutBottomSheetLayout>(R.id.checkoutKitSheet)!!
            .layout(0, 0, TEST_SHEET_SIZE, TEST_SHEET_SIZE)
    }

    private fun latestSheetCheckoutWebView(): CheckoutWebView {
        val sheet = ShadowDialog.getLatestDialog() as CheckoutBottomSheet
        return sheet.findViewById<RelativeLayout>(R.id.checkoutKitContainer)!!
            .children.first { it is CheckoutWebView } as CheckoutWebView
    }

    private companion object {
        private const val TEST_SHEET_SIZE = 1000
        private const val PRELOAD_URL = "https://shopify.dev/cart/123"
    }
}
