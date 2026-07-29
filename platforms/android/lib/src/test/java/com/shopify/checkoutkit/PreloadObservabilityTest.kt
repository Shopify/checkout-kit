package com.shopify.checkoutkit

import android.net.Uri
import android.os.Looper
import android.webkit.RenderProcessGoneDetail
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
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import java.lang.ref.WeakReference

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
    fun `preload returns null when WebView is unsupported`() {
        webMessageTransport.supported = false

        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload).isNull()
        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isFalse()
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
    fun `disabling preloading transitions existing handle to idle`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        ShopifyCheckoutKit.configure { it.preloading = Preloading(enabled = false) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isFalse()
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
    fun `listener attached after preload immediately receives current state`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(view).webViewClient.onPageFinished(view, url)
        val states = mutableListOf<PreloadState>()

        preload.listener = PreloadStateListener { states.add(it) }

        assertThat(states).containsExactly(PreloadState.Ready)
    }

    @Test
    fun `listener replay is delivered on main thread`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        var callbackLooper: Looper? = null

        Thread {
            preload.listener = PreloadStateListener { callbackLooper = Looper.myLooper() }
        }.apply {
            start()
            join()
        }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(callbackLooper).isSameAs(Looper.getMainLooper())
    }

    @Test
    fun `cache retains callback-only preload handle`() {
        val states = mutableListOf<PreloadState>()
        val handleReference = callbackOnlyPreload(states)

        forceGarbageCollection()

        assertThat(handleReference.get()).isNotNull()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(view).webViewClient.onPageFinished(view, url)
        assertThat(states).containsExactly(PreloadState.Loading, PreloadState.Ready)
    }

    @Test
    fun `new observer replaces previous`() {
        val firstStates = mutableListOf<PreloadState>()
        val secondStates = mutableListOf<PreloadState>()

        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { firstStates.add(it) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { secondStates.add(it) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        ShopifyCheckoutKit.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(firstStates).containsExactly(PreloadState.Loading)
        assertThat(secondStates).containsExactly(PreloadState.Loading, PreloadState.Idle)
    }

    @Test
    fun `consuming preload releases observer`() {
        val states = mutableListOf<PreloadState>()
        ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { states.add(it) }
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        shadowOf(view).webViewClient.onPageFinished(view, url)

        CheckoutWebView.checkoutViewFor(url, activity, webMessageTransport)
        ShopifyCheckoutKit.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(states).containsExactly(PreloadState.Loading, PreloadState.Ready)
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

    @Config(sdk = [26])
    @Test
    fun `renderer termination after preload ttl transitions to expired`() {
        var now = 1_000L
        CheckoutWebView.cacheClock = object : PreloadCache.Clock() {
            override fun currentTimeMillis(): Long = now
        }
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        now += 5 * 60 * 1000L
        val detail = mock<RenderProcessGoneDetail> {
            whenever(it.didCrash()).thenReturn(false)
        }

        shadowOf(view).webViewClient.onRenderProcessGone(view, detail)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isFalse()
        assertThat(preload.state).isEqualTo(PreloadState.Expired)
    }

    @Config(sdk = [26])
    @Test
    fun `renderer termination empties backgrounded preload cache and transitions to failed`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        val detail = mock<RenderProcessGoneDetail> {
            whenever(it.didCrash()).thenReturn(false)
        }

        shadowOf(view).webViewClient.onRenderProcessGone(view, detail)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isFalse()
        assertThat(preload.state).isEqualTo(
            PreloadState.Failed(PreloadState.FailureReason.WebContentProcessTerminated),
        )
    }

    @Config(sdk = [26])
    @Test
    fun `renderer termination of retained post-presentation checkout transitions preload to idle`() {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport)!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = CheckoutWebView.checkoutViewFor(url, activity, webMessageTransport)
        view.markPresented()
        assertThat(CheckoutWebView.releaseAfterPresentation(view)).isTrue()
        assertThat(view.isPreloadRequest).isFalse()
        val detail = mock<RenderProcessGoneDetail> {
            whenever(it.didCrash()).thenReturn(false)
        }

        shadowOf(view).webViewClient.onRenderProcessGone(view, detail)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.hasCacheEntryForTesting()).isFalse()
        assertThat(preload.state).isEqualTo(PreloadState.Idle)
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
    fun `http failure callback can start a replacement preload`() {
        val replacementStates = mutableListOf<PreloadState>()
        var replacement: CheckoutPreload? = null
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { state ->
            if (state is PreloadState.Failed) {
                replacement = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) {
                    replacementStates.add(it)
                }
            }
        }!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val failedView = CheckoutWebView.cachedPreloadViewForTesting()!!
        val request = mock<WebResourceRequest> {
            whenever(it.isForMainFrame).thenReturn(true)
            whenever(it.url).thenReturn(Uri.parse(url))
        }
        val response = mock<WebResourceResponse> {
            whenever(it.statusCode).thenReturn(500)
            whenever(it.reasonPhrase).thenReturn("Internal Server Error")
        }

        shadowOf(failedView).webViewClient.onReceivedHttpError(failedView, request, response)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Loading)
        assertThat(replacement).isNotNull()
        val replacementView = CheckoutWebView.cachedPreloadViewForTesting()
        assertThat(replacementView).isNotNull().isNotSameAs(failedView)
        shadowOf(replacementView!!).webViewClient.onPageFinished(replacementView, url)
        assertThat(replacementStates).containsExactly(PreloadState.Loading, PreloadState.Ready)
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

    @Test
    fun `navigation failure callback can start a replacement preload`() {
        val replacementStates = mutableListOf<PreloadState>()
        var replacement: CheckoutPreload? = null
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { state ->
            if (state is PreloadState.Failed) {
                replacement = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) {
                    replacementStates.add(it)
                }
            }
        }!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val failedView = CheckoutWebView.cachedPreloadViewForTesting()!!
        val request = mock<WebResourceRequest> {
            whenever(it.isForMainFrame).thenReturn(true)
            whenever(it.url).thenReturn(Uri.parse(url))
        }
        val error = mock<WebResourceError> {
            whenever(it.errorCode).thenReturn(-1)
            whenever(it.description).thenReturn("net error")
        }

        shadowOf(failedView).webViewClient.onReceivedError(failedView, request, error)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(preload.state).isEqualTo(PreloadState.Loading)
        assertThat(replacement).isNotNull()
        val replacementView = CheckoutWebView.cachedPreloadViewForTesting()
        assertThat(replacementView).isNotNull().isNotSameAs(failedView)
        shadowOf(replacementView!!).webViewClient.onPageFinished(replacementView, url)
        assertThat(replacementStates).containsExactly(PreloadState.Loading, PreloadState.Ready)
    }

    private fun callbackOnlyPreload(states: MutableList<PreloadState>): WeakReference<CheckoutPreload> {
        val preload = ShopifyCheckoutKit.preload(url, activity, webMessageTransport) { states.add(it) }!!
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        return WeakReference(preload)
    }

    private fun forceGarbageCollection() {
        repeat(10) {
            System.gc()
            System.runFinalization()
            Thread.yield()
        }
    }
}
