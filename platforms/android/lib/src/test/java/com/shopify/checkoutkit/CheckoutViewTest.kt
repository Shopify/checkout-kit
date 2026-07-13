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
class CheckoutViewTest {

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
        val view = checkoutView()

        assertThat(view.findViewById<Toolbar>(R.id.checkoutKitHeader)).isNotNull
        assertThat(view.findViewById<ProgressBar>(R.id.progressBar)).isNotNull
        assertThat(view.currentWebView()).isNotNull
        assertThat(view.layoutParams).isNull()

        view.destroy()
    }

    @Test
    fun `consumes matching preloaded checkout`() {
        CheckoutWebView.preload(CHECKOUT_URL, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val preloadedWebView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val view = checkoutView()

        assertThat(view.currentWebView()).isSameAs(preloadedWebView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()

        view.destroy()
        assertThat(shadowOf(preloadedWebView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `Kotlin factory connects callbacks to checkout chrome`() {
        var cancelCount = 0
        val view = CheckoutView.create(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
        ) {
            onCancel { cancelCount += 1 }
        }
        val toolbar = view.findViewById<Toolbar>(R.id.checkoutKitHeader)
        toolbar.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)
        toolbar.menu.performIdentifierAction(R.id.shopify_checkout_kit_close_button, 0)

        assertThat(cancelCount).isEqualTo(1)
        assertThat(view.currentWebView().parent).isNotNull

        view.destroy()
    }

    @Test
    fun `failure callback leaves parent presentation ownership with host`() {
        var receivedError: CheckoutException? = null
        val view = checkoutView(onFailure = { receivedError = it })
        activity.setContentView(view)
        val error = CheckoutKitException("boom")

        view.currentWebView().getListener().onCheckoutViewFailedWithError(error)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(receivedError).isSameAs(error)
        assertThat(view.parent).isNotNull

        view.destroy()
    }

    @Test
    fun `unsupported WebView reports failure and creates inert view`() {
        webMessageTransport.supported = false
        var receivedError: CheckoutException? = null

        val view = CheckoutView.create(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
        ) {
            onFail { receivedError = it }
        }

        assertThat(receivedError)
            .isInstanceOf(CheckoutKitException::class.java)
            .extracting("errorCode")
            .isEqualTo(CheckoutKitException.WEB_VIEW_NOT_SUPPORTED)
        assertThat(view.findViewById<RelativeLayout>(R.id.checkoutKitContainer).children.none { it is CheckoutWebView })
            .isTrue()

        view.destroy()
    }

    @Test
    fun `destroy releases WebView once without reporting an outcome`() {
        var canceled = false
        var failed = false
        val view = checkoutView(
            onCancel = { canceled = true },
            onFailure = { failed = true },
        )
        val webView = view.currentWebView()
        activity.setContentView(view)

        view.destroy()
        view.destroy()

        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
        assertThat(webView.parent).isNull()
        assertThat(canceled).isFalse()
        assertThat(failed).isFalse()
    }

    @Test
    fun `attach and detach resume and pause WebView`() {
        val view = checkoutView()
        val webView = view.currentWebView()

        activity.setContentView(view)
        assertThat(shadowOf(webView).wasOnResumeCalled()).isTrue()

        (view.parent as ViewGroup).removeView(view)
        assertThat(shadowOf(webView).wasOnPauseCalled()).isTrue()

        view.destroy()
    }

    @Test
    fun `host lifecycle destruction destroys WebView after detach`() {
        val view = checkoutView()
        val webView = view.currentWebView()
        activity.setContentView(view)
        (view.parent as ViewGroup).removeView(view)

        activityController.destroy()

        assertThat(shadowOf(webView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `system back requests cancel when WebView has no history`() {
        var canceled = false
        val view = checkoutView(onCancel = { canceled = true })
        activity.setContentView(view)

        activity.onBackPressedDispatcher.onBackPressed()

        assertThat(canceled).isTrue()

        view.destroy()
    }

    @Test
    fun `system back navigates WebView history before requesting cancel`() {
        var canceled = false
        val view = checkoutView(onCancel = { canceled = true })
        val webView = view.currentWebView()
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc")
        shadowOf(webView).pushEntryToHistory("https://shopify.com/checkouts/c/abc/step2")
        activity.setContentView(view)

        activity.onBackPressedDispatcher.onBackPressed()

        assertThat(canceled).isFalse()
        assertThat(shadowOf(webView).goBackInvocations).isGreaterThan(0)

        view.destroy()
    }

    private fun checkoutView(
        onCancel: () -> Unit = {},
        onFailure: (CheckoutException) -> Unit = {},
    ): CheckoutView {
        val listener = noopDefaultCheckoutListener()
        return CheckoutView(
            context = activity,
            checkoutUrl = CHECKOUT_URL,
            webMessageTransport = webMessageTransport,
            presentation = CheckoutViewPresentation(
                listener = listener,
                protocolClient = null,
                onCancelRequest = onCancel,
                onFailure = onFailure,
                reportInitializationFailure = false,
            ),
        )
    }

    private fun CheckoutView.currentWebView(): CheckoutWebView =
        findViewById<RelativeLayout>(R.id.checkoutKitContainer)
            .children
            .first { it is CheckoutWebView } as CheckoutWebView

    private companion object {
        private const val CHECKOUT_URL = "https://shopify.com/checkouts/c/abc"
    }
}
