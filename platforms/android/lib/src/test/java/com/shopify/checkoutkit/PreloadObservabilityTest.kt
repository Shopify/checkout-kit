package com.shopify.checkoutkit

import android.net.Uri
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class PreloadObservabilityTest {

    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration
    private lateinit var webMessageTransport: FakeWebMessageTransport
    private val url = "https://checkout.shopify.com/cart/123"

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        webMessageTransport = FakeWebMessageTransport()
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.configure { it.preloading = Preloading(enabled = true) }
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        CheckoutWebView.cacheClock = PreloadCache.Clock()
        ShopifyCheckoutKit.configure {
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
        }
    }

    @Test
    fun `preload returns handle in loading state`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Loading)
    }

    @Test
    fun `preload returns null when preloading disabled`() {
        ShopifyCheckoutKit.configure { it.preloading = Preloading(enabled = false) }

        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)

        assertThat(preload).isNull()
    }

    @Test
    fun `preload returns null when context finishing`() {
        activity.finish()

        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)

        assertThat(preload).isNull()
    }

    @Test
    fun `manual invalidate transitions to idle`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        ShopifyCheckoutKit.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Idle)
    }

    @Test
    fun `onStateChange receives transitions`() {
        val states = mutableListOf<PreloadState>()

        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { states.add(it) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(states).containsExactly(PreloadState.Loading, PreloadState.Idle)
    }

    @Test
    fun `distinct keys observe independently`() {
        val secondUrl = "https://checkout.shopify.com/cart/456"

        val firstStates = mutableListOf<PreloadState>()
        val first = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { firstStates.add(it) }!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val firstView = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(firstView).webViewClient.onPageFinished(firstView, url)

        val secondStates = mutableListOf<PreloadState>()
        val second = ShopifyCheckoutKit.preload(secondUrl, activity, webMessageTransport) { secondStates.add(it) }!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(firstStates).containsExactly(PreloadState.Loading, PreloadState.Ready)
        assertThat(first.state).isEqualTo(PreloadState.Ready)
        assertThat(secondStates).containsExactly(PreloadState.Loading)
        assertThat(second.state).isEqualTo(PreloadState.Loading)
    }

    @Test
    fun `page finished transitions cached preload to ready`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(view).webViewClient.onPageFinished(view, url)

        assertThat(preload.state).isEqualTo(PreloadState.Ready)
    }

    @Test
    fun `repeat page finished does not re-notify ready`() {
        val states = mutableListOf<PreloadState>()

        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { states.add(it) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(view).webViewClient.onPageFinished(view, url)
        shadowOf(view).webViewClient.onPageFinished(view, url)

        assertThat(states).containsExactly(PreloadState.Loading, PreloadState.Ready)
    }

    @Test
    fun `ttl expiry on take transitions to expired`() {
        var now = 1_000L
        CheckoutWebView.cacheClock = object : PreloadCache.Clock() {
            override fun currentTimeMillis(): Long = now
        }
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        now += 5 * 60 * 1000L
        CheckoutWebView.checkoutViewFor(url, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Expired)
    }

    @Test
    fun `take with different key transitions displaced preload to idle`() {
        val otherUrl = "https://checkout.shopify.com/cart/999"
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        CheckoutWebView.checkoutViewFor(otherUrl, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Idle)
    }

    @Test
    fun `stale take clears cache before notifying so reentrant preload survives`() {
        var now = 1_000L
        CheckoutWebView.cacheClock = object : PreloadCache.Clock() {
            override fun currentTimeMillis(): Long = now
        }
        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { state ->
            if (state == PreloadState.Expired) {
                ShopifyCheckoutKit.preload(url, activity, webMessageTransport)
            }
        }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        now += 5 * 60 * 1000L
        CheckoutWebView.checkoutViewFor(url, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isTrue()
    }

    @Test
    fun `http error transitions cached preload to failed`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!

        val request = mock<WebResourceRequest> {
            whenever(it.isForMainFrame).thenReturn(true)
            whenever(it.url).thenReturn(Uri.parse(url))
        }
        val response = mock<WebResourceResponse> {
            whenever(it.statusCode).thenReturn(500)
            whenever(it.reasonPhrase).thenReturn("Internal Server Error")
        }
        shadowOf(view).webViewClient.onReceivedHttpError(view, request, response)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state)
            .isEqualTo(PreloadState.Failed(PreloadState.FailureReason.HttpError(500)))
    }

    @Test
    fun `navigation error transitions cached preload to failed`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!

        val request = mock<WebResourceRequest> {
            whenever(it.isForMainFrame).thenReturn(true)
            whenever(it.url).thenReturn(Uri.parse(url))
        }
        val error = mock<WebResourceError> {
            whenever(it.errorCode).thenReturn(-1)
            whenever(it.description).thenReturn("net error")
        }
        shadowOf(view).webViewClient.onReceivedError(view, request, error)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state)
            .isEqualTo(PreloadState.Failed(PreloadState.FailureReason.NavigationFailed))
    }
}
