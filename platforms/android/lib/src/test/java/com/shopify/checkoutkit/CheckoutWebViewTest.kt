package com.shopify.checkoutkit

import android.graphics.Color
import android.net.Uri
import android.os.Looper
import android.view.View.VISIBLE
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class CheckoutWebViewTest {

    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
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
    fun `configures web view on initialization`() {
        val view = CheckoutWebView(activity)

        assertThat(view.visibility).isEqualTo(VISIBLE)
        assertThat(view.settings.javaScriptEnabled).isTrue
        assertThat(view.settings.domStorageEnabled).isTrue
        assertThat(view.id).isNotNull
        assertThat(shadowOf(view).webViewClient.javaClass).isEqualTo(CheckoutWebView.CheckoutWebViewClient::class.java)
        assertThat(shadowOf(view).backgroundColor).isEqualTo(Color.TRANSPARENT)
        assertThat(shadowOf(view).getJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME).javaClass)
            .isEqualTo(EmbeddedCheckoutProtocolBridge::class.java)
    }

    @Test
    fun `user agent suffix contains ShopifyCheckoutKit version and android platform`() {
        val view = CheckoutWebView(activity)

        assertThat(view.settings.userAgentString).contains("ShopifyCheckoutKit/")
        assertThat(view.settings.userAgentString).contains("(Android;")
    }

    @Test
    fun `user agent suffix appends platform identifier and version when set`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative("0.80.0")
        val view = CheckoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith(
                "ShopifyCheckoutKit/${ShopifyCheckoutKit.VERSION} (Android; Kotlin $kotlinVersion) ReactNative/0.80.0"
            )
    }

    @Test
    fun `user agent suffix omits version when platform version is null`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative()
        val view = CheckoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith("ShopifyCheckoutKit/${ShopifyCheckoutKit.VERSION} (Android; Kotlin $kotlinVersion) ReactNative")
    }

    @Test
    fun `attaches javascript interface onAttachedToWindow`() {
        val view = CheckoutWebView(activity)

        val shadow = shadowOf(view)
        shadow.callOnAttachedToWindow()

        assertThat(shadow.getJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME).javaClass)
            .isEqualTo(EmbeddedCheckoutProtocolBridge::class.java)
    }

    @Test
    fun `removes javascript interface onDetachedFromWindow`() {
        val view = CheckoutWebView(activity)

        val shadow = shadowOf(view)
        shadow.callOnDetachedFromWindow()

        assertThat(shadow.getJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)).isNull()
    }

    @Test
    fun `calls update progress when new progress is reported by WebChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)

        shadow.webChromeClient?.onProgressChanged(view, 20)
        verify(webViewListener).updateProgressBar(20)

        shadow.webChromeClient?.onProgressChanged(view, 50)
        verify(webViewListener).updateProgressBar(50)
    }

    @Test
    fun `calls processors onPermissionRequest when resource permission requested`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val permissionRequest = mock<PermissionRequest>()
        val requestedResources = arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE)
        whenever(permissionRequest.resources).thenReturn(requestedResources)

        val shadow = shadowOf(view)
        shadow.webChromeClient?.onPermissionRequest(permissionRequest)

        verify(webViewListener).onPermissionRequest(permissionRequest)
    }

    @Test
    fun `calls processors onShowFileChooser when called on webChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)
        val filePathCallback = mock<ValueCallback<Array<Uri>>>()
        val fileChooserParams = mock<FileChooserParams>()

        shadow.webChromeClient.onShowFileChooser(view, filePathCallback, fileChooserParams)

        verify(webViewListener).onShowFileChooser(view, filePathCallback, fileChooserParams)
    }

    @Test
    fun `calls processors onGeolocationPermissionsShowPrompt when called on webChromeClient`() {
        val view = CheckoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)

        val callback = mock<GeolocationPermissions.Callback>()
        val origin = "origin"

        shadow.webChromeClient.onGeolocationPermissionsShowPrompt(origin, callback)

        verify(webViewListener).onGeolocationPermissionsShowPrompt(origin, callback)
    }

    @Test
    fun `removeFromParent() should remove parent if a parent exists but not destroy WebView`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val ctx = activityController.get()
            val webView = CheckoutWebView(ctx)
            val container = FrameLayout(ctx)
            container.addView(webView)
            assertThat(webView.parent).isNotNull()

            webView.removeFromParent()
            shadowOf(Looper.getMainLooper()).runToEndOfTasks()

            val shadow = shadowOf(webView)
            assertThat(shadow.wasDestroyCalled()).isFalse()
            assertThat(webView.parent).isNull()
        }
    }

    @Test
    fun `removeFromParent() should do nothing if no parent exists`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val ctx = activityController.get()
            val webView = CheckoutWebView(ctx)
            webView.removeFromParent()
            shadowOf(Looper.getMainLooper()).runToEndOfTasks()

            val shadow = shadowOf(webView)
            assertThat(shadow.wasDestroyCalled()).isFalse()
            assertThat(webView.parent).isNull()
        }
    }

    // region buildEcpUrl (tested through loadCheckout)

    @Test
    fun `loadCheckout appends ec_version to URL when absent`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
    }

    @Test
    fun `loadCheckout preserves existing query params alongside ec_version`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123?foo=bar")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl
        assertThat(loadedUrl).contains("foo=bar")
        assertThat(loadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
    }

    @Test
    fun `loadCheckout replaces ec_version when already present`() {
        val view = CheckoutWebView(activity)
        val callerSuppliedVersion = "2026-01-23"
        val urlWithVersion = "https://checkout.shopify.com/cart/123?ec_version=$callerSuppliedVersion"

        view.loadCheckout(urlWithVersion)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
        assertThat(loadedUrl).doesNotContain("ec_version=$callerSuppliedVersion")
        assertThat(loadedUrl.split("ec_version").size - 1).isEqualTo(1)
    }

    // endregion

    // region preload cache

    @Test
    fun `preload creates cached checkout view with prefetch header`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        val shadow = shadowOf(view)
        assertThat(shadow.lastLoadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
        assertThat(shadow.lastAdditionalHttpHeaders).containsEntry("Shopify-Purpose", "prefetch")
        assertThat(view.isPreloadRequest).isTrue()
        assertThat(shadow.wasOnPauseCalled()).isTrue()
    }

    @Test
    fun `present consumes cached checkout view for matching URL`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = CheckoutWebView.checkoutViewFor("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(presentedView).isSameAs(cachedView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isFalse()
        assertThat(presentedView.isPreloadRequest).isFalse()
    }

    @Test
    fun `present discards cached checkout view for mismatched URL`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = CheckoutWebView.checkoutViewFor("https://checkout.shopify.com/cart/456", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        assertThat(shadowOf(presentedView).lastLoadedUrl).contains("/cart/456")
    }

    @Test
    fun `present discards cached checkout view for mismatched query params`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123?cart=first", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = CheckoutWebView.checkoutViewFor(
            "https://checkout.shopify.com/cart/123?cart=second",
            activity,
        )
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        assertThat(shadowOf(presentedView).lastLoadedUrl).contains("cart=second")
    }

    @Test
    fun `present discards cached checkout view after ttl expiry`() {
        var now = 1_000L
        CheckoutWebView.cacheClock = object : PreloadCache.Clock() {
            override fun currentTimeMillis(): Long = now
        }
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        now += 5 * 60 * 1000L
        val presentedView = CheckoutWebView.checkoutViewFor("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `invalidate destroys unpresented cached checkout view`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        CheckoutWebView.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `invalidate does not destroy presented checkout view`() {
        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val presentedView = CheckoutWebView.checkoutViewFor("https://checkout.shopify.com/cart/123", activity)
        presentedView.markPresented()

        CheckoutWebView.invalidate()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(presentedView).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `preload is ignored when preloading is disabled`() {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }

        CheckoutWebView.preload("https://checkout.shopify.com/cart/123", activity)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `loadCheckout does not send prefetch header for normal loads`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(view).lastAdditionalHttpHeaders).doesNotContainKey("Shopify-Purpose")
        assertThat(view.isPreloadRequest).isFalse()
    }

    // endregion

    // region buildEcpUrl — ec_delegate

    @Test
    fun `loadCheckout appends ec_delegate=window_open to URL`() {
        val view = CheckoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_delegate=window.open")
    }

    @Test
    fun `loadCheckout replaces ec_delegate when already present`() {
        val view = CheckoutWebView(activity)
        val callerSuppliedDelegate = "custom"
        val urlWithDelegate = "https://checkout.shopify.com/cart/123?ec_delegate=$callerSuppliedDelegate"

        view.loadCheckout(urlWithDelegate)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_delegate=window.open")
        assertThat(loadedUrl).doesNotContain("ec_delegate=$callerSuppliedDelegate")
        assertThat(loadedUrl.split("ec_delegate").size - 1).isEqualTo(1)
    }

    // endregion
}
