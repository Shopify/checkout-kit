package com.shopify.checkoutkit

import android.os.Looper
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.RelativeLayout
import androidx.activity.ComponentActivity
import androidx.appcompat.widget.Toolbar
import androidx.core.view.children
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.android.controller.ActivityController
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class ShopifyCheckoutTest {

    private lateinit var activityController: ActivityController<ComponentActivity>
    private lateinit var activity: ComponentActivity
    private lateinit var webMessageTransport: FakeWebMessageTransport

    @Before
    fun setUp() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        activityController = Robolectric.buildActivity(ComponentActivity::class.java).setup()
        activity = activityController.get()
        webMessageTransport = FakeWebMessageTransport()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
    }

    @Test
    fun `creates embeddable checkout chrome and content`() {
        val view = shopifyCheckout()

        assertThat(view.findViewById<Toolbar>(R.id.checkoutKitHeader)).isNotNull
        assertThat(view.findViewById<ProgressBar>(R.id.progressBar)).isNotNull
        assertThat(view.currentWebView()).isNotNull
        assertThat(view.layoutParams).isNull()

        view.destroy()
    }

    @Test
    fun `destroy discards matching preloaded checkout`() {
        CheckoutWebView.preload(CHECKOUT_URL, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val preloadedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val view = shopifyCheckout()

        assertThat(view.currentWebView()).isSameAs(preloadedWebView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(preloadedWebView)

        view.destroy()
        assertThat(shadowOf(preloadedWebView).wasDestroyCalled()).isTrue()
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `concurrent presentation does not reuse active preloaded checkout`() {
        CheckoutWebView.preload(CHECKOUT_URL, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val preloadedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val firstView = shopifyCheckout()
        val secondView = shopifyCheckout()

        assertThat(firstView.currentWebView()).isSameAs(preloadedWebView)
        assertThat(secondView.currentWebView()).isNotSameAs(preloadedWebView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(preloadedWebView)

        secondView.destroy()
        firstView.destroy()
    }

    @Test
    fun `Kotlin factory connects callbacks to checkout chrome`() {
        var dismissCount = 0
        val view = ShopifyCheckout.create(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
        ) {
            onDismiss { dismissCount += 1 }
        }
        val toolbar = view.findViewById<Toolbar>(R.id.checkoutKitHeader)
        toolbar.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)
        toolbar.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)

        assertThat(dismissCount).isEqualTo(1)
        assertThat(view.currentWebView().parent).isNotNull

        view.destroy()
    }

    @Test
    fun `failure callback leaves parent presentation ownership with host`() {
        var receivedError: CheckoutException? = null
        val view = shopifyCheckout(onFailure = { receivedError = it })
        activity.setContentView(view)
        val error = CheckoutException(code = CheckoutErrorCode.SDK_ERROR, message = "boom")

        view.currentWebView().listener.onCheckoutViewFailedWithError(error)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(receivedError).isSameAs(error)
        assertThat(view.parent).isNotNull

        view.destroy()
    }

    @Test
    fun `unsupported WebView reports failure after construction and creates inert view`() {
        webMessageTransport.supported = false
        var receivedError: CheckoutException? = null
        var constructionComplete = false
        var failureReportedAfterConstruction = false

        val view = ShopifyCheckout.create(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
        ) {
            onFail {
                receivedError = it
                failureReportedAfterConstruction = constructionComplete
            }
        }

        assertThat(receivedError).isNull()
        constructionComplete = true
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(receivedError!!.code).isEqualTo(CheckoutErrorCode.WEB_VIEW_NOT_SUPPORTED)
        assertThat(failureReportedAfterConstruction).isTrue()
        assertThat(view.findViewById<RelativeLayout>(R.id.checkoutKitContainer).children.none { it is CheckoutWebView })
            .isTrue()

        view.destroy()
    }

    @Test
    fun `non HTTPS checkout reports failure after construction and creates inert view`() {
        var receivedError: CheckoutException? = null

        val view = ShopifyCheckout.create(
            context = activity,
            checkoutUrl = "http://checkout.shopify.com/cart/123",
            webMessageTransport = webMessageTransport,
        ) {
            onFail { receivedError = it }
        }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(receivedError)
            .isInstanceOf(CheckoutException::class.java)
            .extracting("message")
            .asString()
            .contains("requires an HTTPS URL")
        assertThat(view.findViewById<RelativeLayout>(R.id.checkoutKitContainer).children.none { it is CheckoutWebView })
            .isTrue()

        view.destroy()
    }

    @Test
    fun `destroy suppresses pending initialization failure`() {
        webMessageTransport.supported = false
        var failed = false
        val view = ShopifyCheckout.create(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
        ) {
            onFail { failed = true }
        }

        view.destroy()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(failed).isFalse()
    }

    @Test
    fun `destroy releases WebView once without reporting an outcome`() {
        var dismissed = false
        var failed = false
        val view = shopifyCheckout(
            onDismiss = { dismissed = true },
            onFailure = { failed = true },
        )
        val webView = view.currentWebView()
        activity.setContentView(view)

        view.destroy()
        view.destroy()

        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
        assertThat(webView.parent).isNull()
        assertThat(dismissed).isFalse()
        assertThat(failed).isFalse()
    }

    @Test
    fun `attach and detach resume and pause WebView`() {
        val view = shopifyCheckout()
        val webView = view.currentWebView()

        activity.setContentView(view)
        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()

        (view.parent as ViewGroup).removeView(view)
        assertThat(shadowOf(webView).wasOnPauseCalled()).isTrue()

        view.destroy()
    }

    @Test
    fun `host lifecycle destruction destroys WebView after detach`() {
        val view = shopifyCheckout()
        val webView = view.currentWebView()
        activity.setContentView(view)
        (view.parent as ViewGroup).removeView(view)

        activityController.destroy()

        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `system back requests dismissal when WebView has no history`() {
        var dismissed = false
        val view = shopifyCheckout(onDismiss = { dismissed = true })
        activity.setContentView(view)

        activity.onBackPressedDispatcher.onBackPressed()

        assertThat(dismissed).isTrue()

        view.destroy()
    }

    @Test
    fun `system back navigates WebView history before requesting dismissal`() {
        var dismissed = false
        val view = shopifyCheckout(onDismiss = { dismissed = true })
        val webView = view.currentWebView()
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc/step2")
        activity.setContentView(view)

        activity.onBackPressedDispatcher.onBackPressed()

        assertThat(dismissed).isFalse()
        assertThat(shadowOf(webView).goBackInvocations).isGreaterThan(0)

        view.destroy()
    }

    private fun shopifyCheckout(
        onDismiss: () -> Unit = {},
        onFailure: (CheckoutException) -> Unit = {},
    ): ShopifyCheckout {
        val listener = noopDefaultCheckoutListener()
        return ShopifyCheckout(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
            hostConfiguration = CheckoutHostConfiguration(
                listener = listener,
                protocolClient = null,
                onDismissRequest = onDismiss,
                onFailure = onFailure,
                reportInitializationFailure = false,
            ),
        )
    }

    private fun ShopifyCheckout.currentWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children
            .first { it is CheckoutWebView } as CheckoutWebView

    private companion object {
        private const val CHECKOUT_URL = "https://shopify.com/checkouts/c/abc"
    }
}
