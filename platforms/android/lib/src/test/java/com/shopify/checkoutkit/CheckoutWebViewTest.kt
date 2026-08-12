package com.shopify.checkoutkit

import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.os.Looper
import android.view.MotionEvent
import android.view.View.VISIBLE
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.awaitility.Awaitility.await
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
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
@Suppress("LargeClass")
class CheckoutWebViewTest {

    private lateinit var activity: ComponentActivity
    private lateinit var initialConfiguration: Configuration
    private lateinit var webMessageTransport: FakeWebMessageTransport

    @Before
    fun setUp() {
        initialConfiguration = ShopifyCheckoutKit.getConfiguration()
        webMessageTransport = FakeWebMessageTransport()
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().idle()
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().idle()
        CheckoutWebView.cacheClock = PreloadCache.Clock()
        ShopifyCheckoutKit.configure {
            it.appearance = initialConfiguration.appearance
            it.sheet = initialConfiguration.sheet
            it.preloading = initialConfiguration.preloading
            it.platform = initialConfiguration.platform
            it.logLevel = initialConfiguration.logLevel
            it.allowedMessageOrigins = initialConfiguration.allowedMessageOrigins
            it.onMessageRejected = initialConfiguration.onMessageRejected
        }
    }

    @Test
    fun `configures web view on initialization`() {
        val view = checkoutWebView(activity)

        assertThat(view.visibility).isEqualTo(VISIBLE)
        assertThat(view.settings.javaScriptEnabled).isTrue
        assertThat(view.settings.domStorageEnabled).isTrue
        assertThat(view.id).isNotNull
        assertThat(shadowOf(view).webViewClient.javaClass).isEqualTo(CheckoutWebView.CheckoutWebViewClient::class.java)
        assertThat(shadowOf(view).backgroundColor).isEqualTo(Color.TRANSPARENT)
        assertThat(shadowOf(view).getJavascriptInterface(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)).isNull()
        assertThat(webMessageTransport.attachCount).isEqualTo(1)
        assertThat(webMessageTransport.lastAttachment?.webView).isSameAs(view)
        assertThat(webMessageTransport.lastAttachment?.jsObjectName)
            .isEqualTo(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)
        assertThat(webMessageTransport.lastAttachment?.allowedOriginRules).containsExactly("*")
    }

    @Test
    fun `touch down keeps gesture with WebView after it is parented`() {
        val parent = InterceptTrackingLayout(activity)
        val view = checkoutWebView(activity)
        parent.addView(view)

        view.sendTouchEvent(MotionEvent.ACTION_DOWN, y = 20f)

        assertThat(parent.disallowInterceptRequested).isTrue()
    }

    @Test
    fun `gesture that starts upward stays with WebView`() {
        val parent = InterceptTrackingLayout(activity)
        val view = checkoutWebView(activity)
        parent.addView(view)

        view.sendTouchEvent(MotionEvent.ACTION_DOWN, y = 20f)
        view.sendTouchEvent(MotionEvent.ACTION_MOVE, y = 10f)
        view.sendTouchEvent(MotionEvent.ACTION_MOVE, y = 30f)

        assertThat(parent.disallowInterceptRequested).isTrue()
    }

    @Test
    fun `downward drag stays with WebView when checkout can scroll up`() {
        val parent = InterceptTrackingLayout(activity)
        val view = ScrollableWebView(activity, canScrollUp = true)
        val touchHandler = CheckoutWebViewTouchHandler()
        parent.addView(view)

        // CheckoutWebView is final with a private constructor, so the scrollable-document case is
        // exercised against CheckoutWebViewTouchHandler directly rather than through onTouchEvent.
        touchHandler.sendTouchEvent(view, MotionEvent.ACTION_DOWN, y = 20f)
        touchHandler.sendTouchEvent(view, MotionEvent.ACTION_MOVE, y = 30f)

        assertThat(parent.disallowInterceptRequested).isTrue()
    }

    @Test
    fun `downward drag at scroll top releases gesture to parent`() {
        val parent = InterceptTrackingLayout(activity)
        val view = checkoutWebView(activity)
        parent.addView(view)

        view.sendTouchEvent(MotionEvent.ACTION_DOWN, y = 20f)
        view.sendTouchEvent(MotionEvent.ACTION_MOVE, y = 30f)

        assertThat(parent.disallowInterceptRequested).isFalse()
    }

    @Test
    fun `detaches and reattaches WebMessage transport with view lifecycle`() {
        val view = checkoutWebView(activity)
        val shadow = shadowOf(view)

        shadow.callOnDetachedFromWindow()
        shadow.callOnAttachedToWindow()

        assertThat(webMessageTransport.detachCount).isEqualTo(1)
        assertThat(webMessageTransport.attachCount).isEqualTo(2)
        assertThat(webMessageTransport.lastDetachment?.webView).isSameAs(view)
        assertThat(webMessageTransport.lastDetachment?.jsObjectName)
            .isEqualTo(EmbeddedCheckoutProtocolBridge.INTERFACE_NAME)
    }

    @Test
    fun `user agent suffix contains ShopifyCheckoutKit version and android platform`() {
        val view = checkoutWebView(activity)

        assertThat(view.settings.userAgentString).contains("ShopifyCheckoutKit/")
        assertThat(view.settings.userAgentString).contains("(Android;")
    }

    @Test
    fun `user agent suffix appends platform identifier and version when set`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative("0.80.0")
        val view = checkoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith(
                "ShopifyCheckoutKit/${ShopifyCheckoutKit.VERSION} (Android; Kotlin $kotlinVersion) ReactNative/0.80.0"
            )
    }

    @Test
    fun `user agent suffix omits version when platform version is null`() {
        ShopifyCheckoutKit.configuration.platform = Platform.ReactNative()
        val view = checkoutWebView(activity)

        val kotlinVersion = KotlinVersion.CURRENT.let { "${it.major}.${it.minor}" }
        assertThat(view.settings.userAgentString)
            .endsWith("ShopifyCheckoutKit/${ShopifyCheckoutKit.VERSION} (Android; Kotlin $kotlinVersion) ReactNative")
    }

    @Test
    fun `throws unsupported WebView exception when WebMessageListener is unsupported`() {
        webMessageTransport.supported = false

        assertThatThrownBy {
            checkoutWebView(activity)
        }
            .isInstanceOf(UnsupportedWebViewException::class.java)
            .hasMessage("This Android WebView does not support Shopify Checkout Kit.")
        assertThat(shadowOf(webMessageTransport.lastAttachAttempt!!.webView).wasDestroyCalled()).isTrue
    }

    @Test
    fun `calls update progress when new progress is reported by WebChromeClient`() {
        val view = checkoutWebView(activity)
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
        val view = checkoutWebView(activity)
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
        val view = checkoutWebView(activity)
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
        val view = checkoutWebView(activity)
        val webViewListener = mock<CheckoutWebViewListener>()
        view.setListener(webViewListener)

        val shadow = shadowOf(view)

        val callback = mock<GeolocationPermissions.Callback>()
        val origin = "origin"

        shadow.webChromeClient.onGeolocationPermissionsShowPrompt(origin, callback)

        verify(webViewListener).onGeolocationPermissionsShowPrompt(origin, callback)
    }

    // region ECP WebMessage transport

    @Test
    fun `web message is received by protocol bridge`() {
        val view = checkoutWebView(activity)
        var received = false
        view.setClient(
            CheckoutProtocol.Client()
                .on(CheckoutProtocol.messagesChange) { received = true },
        )

        webMessageTransport.dispatchMessage(ecMessagesChangeMessage())

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().idle()
            assertThat(received).isTrue()
        }
    }

    @Test
    fun `web message from child frame is ignored`() {
        assertWebMessageIgnored {
            webMessageTransport.dispatchMessage(ecMessagesChangeMessage(), isMainFrame = false)
        }
    }

    @Test
    fun `web message from any origin is accepted when no allowlist is configured`() {
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        var received = false
        view.setClient(
            CheckoutProtocol.Client().on(CheckoutProtocol.messagesChange) { received = true },
        )

        webMessageTransport.dispatchMessage(ecMessagesChangeMessage(), sourceOrigin = "https://evil.example.com")

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            assertThat(received).isTrue()
        }
    }

    @Test
    fun `web message from the cart URL origin is accepted when an allowlist is configured`() {
        ShopifyCheckoutKit.configure { it.allowedMessageOrigins = setOf("https://allowed.example.com") }
        assertWebMessageReceivedFrom("https://checkout.shopify.com")
    }

    @Test
    fun `web message from a shop app subdomain is accepted when an allowlist is configured`() {
        ShopifyCheckoutKit.configure { it.allowedMessageOrigins = setOf("https://allowed.example.com") }
        assertWebMessageReceivedFrom("https://checkout.shop.app")
    }

    @Test
    fun `web message from a configured origin is accepted`() {
        ShopifyCheckoutKit.configure { it.allowedMessageOrigins = setOf("https://allowed.example.com") }
        assertWebMessageReceivedFrom("https://allowed.example.com")
    }

    @Test
    fun `web message from an untrusted origin is dropped and reported when an allowlist is configured`() {
        val rejected = mutableListOf<RejectedMessage>()
        ShopifyCheckoutKit.configure {
            it.allowedMessageOrigins = setOf("https://allowed.example.com")
            it.onMessageRejected = { rejected.add(it) }
        }
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        var received = false
        var sentinelReceived = false
        view.setClient(
            CheckoutProtocol.Client()
                .on(CheckoutProtocol.messagesChange) { received = true }
                .on(CheckoutProtocol.start) { sentinelReceived = true },
        )

        webMessageTransport.dispatchMessage(ecMessagesChangeMessage(), sourceOrigin = "https://evil.example.com")
        webMessageTransport.dispatchMessage(ecStartMessage(), sourceOrigin = "https://checkout.shopify.com")

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            assertThat(sentinelReceived).isTrue()
        }
        assertThat(received).isFalse()
        assertThat(rejected).singleElement().satisfies({
            assertThat(it.origin).isEqualTo("https://evil.example.com")
            assertThat(it.reason).contains("not in the allowlist")
        })
    }

    @Test
    fun `callback failures do not interrupt later trusted messages`() {
        ShopifyCheckoutKit.configure {
            it.allowedMessageOrigins = setOf("https://allowed.example.com")
            it.onMessageRejected = { error("callback failed") }
        }
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        var received = false
        view.setClient(CheckoutProtocol.Client().on(CheckoutProtocol.start) { received = true })

        webMessageTransport.dispatchMessage(ecMessagesChangeMessage(), sourceOrigin = "https://evil.example.com")
        webMessageTransport.dispatchMessage(ecStartMessage(), sourceOrigin = "https://checkout.shopify.com")

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            assertThat(received).isTrue()
        }
    }

    // endregion

    @Test
    fun `removeFromParent() should remove parent if a parent exists but not destroy WebView`() {
        Robolectric.buildActivity(ComponentActivity::class.java).use { activityController ->
            val ctx = activityController.get()
            val webView = checkoutWebView(ctx)
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
            val webView = checkoutWebView(ctx)
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
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
    }

    @Test
    fun `loadCheckout rejects non HTTPS URLs`() {
        val view = checkoutWebView(activity)

        assertThatThrownBy { view.loadCheckout("http://checkout.shopify.com/cart/123") }
            .isInstanceOf(CheckoutException::class.java)
            .hasMessageContaining("requires an HTTPS URL")
    }

    @Test
    fun `checkoutViewFor rejects non HTTPS URLs before constructing a WebView`() {
        assertThatThrownBy { checkoutViewFor("http://checkout.shopify.com/cart/123") }
            .isInstanceOf(CheckoutException::class.java)
            .hasMessageContaining("requires an HTTPS URL")

        assertThat(webMessageTransport.attachCount).isZero()
    }

    @Test
    fun `main frame redirect to non HTTPS URL is blocked and reported`() {
        val view = checkoutWebView(activity)
        val listener = mock(CheckoutWebViewListener::class.java)
        val request = mock(WebResourceRequest::class.java)
        whenever(request.url).thenReturn(Uri.parse("http://checkout.shopify.com/cart/123"))
        whenever(request.isForMainFrame).thenReturn(true)
        view.setListener(listener)

        val blocked = view.CheckoutWebViewClient().shouldOverrideUrlLoading(view, request)

        assertThat(blocked).isTrue()
        verify(listener).onCheckoutViewFailedWithError(
            org.mockito.kotlin.check {
                assertThat(it).isInstanceOf(CheckoutException::class.java)
                assertThat(it.code).isEqualTo(CheckoutErrorCode.SDK_ERROR)
                assertThat(it.message).contains("requires an HTTPS URL")
            }
        )
    }

    @Suppress("DEPRECATION")
    @Test
    fun `legacy redirect callback blocks non HTTPS URLs`() {
        val view = checkoutWebView(activity)
        val listener = mock(CheckoutWebViewListener::class.java)
        view.setListener(listener)

        val blocked = view.CheckoutWebViewClient().shouldOverrideUrlLoading(
            view,
            "http://checkout.shopify.com/cart/123",
        )

        assertThat(blocked).isTrue()
        verify(listener).onCheckoutViewFailedWithError(
            org.mockito.kotlin.check {
                assertThat(it).isInstanceOf(CheckoutException::class.java)
                assertThat(it.code).isEqualTo(CheckoutErrorCode.SDK_ERROR)
                assertThat(it.message).contains("requires an HTTPS URL")
            }
        )
    }

    @Test
    fun `loadCheckout preserves existing query params alongside ec_version`() {
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123?foo=bar")
        ShadowLooper.shadowMainLooper().idle()

        val loadedUrl = shadowOf(view).lastLoadedUrl
        assertThat(loadedUrl).contains("foo=bar")
        assertThat(loadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
    }

    @Test
    fun `loadCheckout replaces ec_version when already present`() {
        val view = checkoutWebView(activity)
        val callerSuppliedVersion = "2026-01-23"
        val urlWithVersion = "https://checkout.shopify.com/cart/123?ec_version=$callerSuppliedVersion"

        view.loadCheckout(urlWithVersion)
        ShadowLooper.shadowMainLooper().idle()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
        assertThat(loadedUrl).doesNotContain("ec_version=$callerSuppliedVersion")
        assertThat(loadedUrl.split("ec_version").size - 1).isEqualTo(1)
    }

    // endregion

    // region preload cache

    @Test
    fun `preload creates cached checkout view with prefetch header`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        val view = CheckoutWebView.cachedPreloadViewForTesting()!!
        val shadow = shadowOf(view)
        assertThat(shadow.lastLoadedUrl).contains("ec_version=${CheckoutProtocol.SPEC_VERSION}")
        assertThat(shadow.lastAdditionalHttpHeaders).containsEntry("Shopify-Purpose", "prefetch")
        assertThat(view.isPreloadRequest).isTrue()
        assertThat(shadow.wasOnPauseCalled()).isTrue()
    }

    @Test
    fun `preload reports navigation failure for non HTTPS URL`() {
        val preload = CheckoutWebView.preload(
            "http://checkout.shopify.com/cart/123",
            activity,
            webMessageTransport,
        )

        assertThat(preload?.state)
            .isEqualTo(
                PreloadState.Failed(
                    PreloadState.FailureReason.NavigationFailed,
                    "Checkout URL must use HTTPS.",
                ),
            )
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `preload evicts cached view on main thread for non HTTPS URL from background thread`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val result = CompletableFuture.supplyAsync {
            CheckoutWebView.preload(
                "http://checkout.shopify.com/cart/456",
                activity,
                webMessageTransport,
            )
        }
        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            assertThat(result.isDone).isTrue()
        }

        assertThat(result.get()!!.state)
            .isEqualTo(
                PreloadState.Failed(
                    PreloadState.FailureReason.NavigationFailed,
                    "Checkout URL must use HTTPS.",
                ),
            )
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `present retains cached checkout view for matching URL`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = checkoutViewFor("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(presentedView).isSameAs(cachedView)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isFalse()
        assertThat(presentedView.isPreloadRequest).isFalse()
    }

    @Test
    fun `present discards cached checkout view for mismatched URL`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = checkoutViewFor("https://checkout.shopify.com/cart/456")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        assertThat(shadowOf(presentedView).lastLoadedUrl).contains("/cart/456")
    }

    @Test
    fun `present discards cached checkout view for mismatched query params`() {
        preload("https://checkout.shopify.com/cart/123?cart=first")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        val presentedView = checkoutViewFor("https://checkout.shopify.com/cart/123?cart=second")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
        assertThat(shadowOf(presentedView).lastLoadedUrl).contains("cart=second")
    }

    @Test
    fun `present discards cached checkout view after ttl expiry`() {
        var now = 1_000L
        CheckoutWebView.cacheClock = object : PreloadCache.Clock() {
            override fun elapsedRealtime(): Long = now
        }
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        now += 5 * 60 * 1000L
        val presentedView = checkoutViewFor("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(presentedView).isNotSameAs(cachedView)
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `invalidate destroys unpresented cached checkout view`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        CheckoutWebView.invalidate()
        ShadowLooper.shadowMainLooper().idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `invalidate does not destroy presented checkout view`() {
        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()
        val presentedView = checkoutViewFor("https://checkout.shopify.com/cart/123")
        presentedView.markPresented()

        CheckoutWebView.invalidate()
        ShadowLooper.shadowMainLooper().idle()

        assertThat(shadowOf(presentedView).wasDestroyCalled()).isFalse()
    }

    @Test
    fun `destroying preload activity destroys cached checkout view`() {
        val activityController = Robolectric.buildActivity(ComponentActivity::class.java).setup()
        val preloadActivity = activityController.get()
        CheckoutWebView.preload(
            "https://checkout.shopify.com/cart/123",
            preloadActivity,
            webMessageTransport,
        )
        ShadowLooper.shadowMainLooper().idle()
        val cachedView = CheckoutWebView.cachedPreloadViewForTesting()!!

        activityController.destroy()
        ShadowLooper.shadowMainLooper().idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
        assertThat(shadowOf(cachedView).wasDestroyCalled()).isTrue()
    }

    @Test
    fun `preload is discarded when activity is already destroyed`() {
        val activityController = Robolectric.buildActivity(ComponentActivity::class.java).setup()
        val preloadActivity = activityController.get()
        activityController.destroy()

        CheckoutWebView.preload(
            "https://checkout.shopify.com/cart/123",
            preloadActivity,
            webMessageTransport,
        )
        ShadowLooper.shadowMainLooper().idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `preload is ignored when preloading is disabled`() {
        ShopifyCheckoutKit.configure {
            it.preloading = Preloading(enabled = false)
        }

        preload("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `loadCheckout does not send prefetch header for normal loads`() {
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(shadowOf(view).lastAdditionalHttpHeaders).doesNotContainKey("Shopify-Purpose")
        assertThat(view.isPreloadRequest).isFalse()
    }

    // endregion

    // region buildEcpUrl — ec_delegate

    @Test
    fun `loadCheckout appends ec_delegate=window_open to URL`() {
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().idle()

        assertThat(shadowOf(view).lastLoadedUrl).contains("ec_delegate=window.open")
    }

    @Test
    fun `loadCheckout replaces ec_delegate when already present`() {
        val view = checkoutWebView(activity)
        val callerSuppliedDelegate = "custom"
        val urlWithDelegate = "https://checkout.shopify.com/cart/123?ec_delegate=$callerSuppliedDelegate"

        view.loadCheckout(urlWithDelegate)
        ShadowLooper.shadowMainLooper().idle()

        val loadedUrl = shadowOf(view).lastLoadedUrl!!
        assertThat(loadedUrl).contains("ec_delegate=window.open")
        assertThat(loadedUrl).doesNotContain("ec_delegate=$callerSuppliedDelegate")
        assertThat(loadedUrl.split("ec_delegate").size - 1).isEqualTo(1)
    }

    // endregion

    private fun checkoutWebView(context: Context): CheckoutWebView =
        CheckoutWebView(context, webMessageTransport)

    private fun preload(url: String) {
        CheckoutWebView.preload(url, activity, webMessageTransport)
    }

    private fun checkoutViewFor(url: String): CheckoutWebView =
        CheckoutWebView.checkoutViewFor(url, activity, webMessageTransport)

    private fun WebView.sendTouchEvent(action: Int, y: Float) {
        val event = MotionEvent.obtain(0, 0, action, 0f, y, 0)
        try {
            onTouchEvent(event)
        } finally {
            event.recycle()
        }
    }

    private fun CheckoutWebViewTouchHandler.sendTouchEvent(view: WebView, action: Int, y: Float) {
        val event = MotionEvent.obtain(0, 0, action, 0f, y, 0)
        try {
            handle(view, event)
        } finally {
            event.recycle()
        }
    }

    private class ScrollableWebView(
        context: Context,
        private val canScrollUp: Boolean,
    ) : WebView(context) {

        override fun canScrollVertically(direction: Int): Boolean =
            direction == SCROLL_UP_DIRECTION && canScrollUp
    }

    private class InterceptTrackingLayout(context: Context) : FrameLayout(context) {
        var disallowInterceptRequested = false

        override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {
            disallowInterceptRequested = disallowIntercept
            super.requestDisallowInterceptTouchEvent(disallowIntercept)
        }
    }

    /**
     * Verifies a WebMessage is ignored after a valid sentinel drains earlier protocol work.
     * Because protocol processing is serial, receiving the sentinel rules out an async false positive.
     */
    private fun assertWebMessageIgnored(dispatchMessage: () -> Unit) {
        val view = checkoutWebView(activity)
        var ignoredMessageReceived = false
        var sentinelReceived = false
        view.setClient(
            CheckoutProtocol.Client()
                .on(CheckoutProtocol.messagesChange) { ignoredMessageReceived = true }
                .on(CheckoutProtocol.start) { sentinelReceived = true },
        )

        dispatchMessage()
        webMessageTransport.dispatchMessage(ecStartMessage())

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().idle()
            assertThat(sentinelReceived).isTrue()
        }
        assertThat(ignoredMessageReceived).isFalse()
        assertThat(webMessageTransport.sentMessages).isEmpty()
    }

    /**
     * Loads a checkout (so its cart origin becomes a trusted default), dispatches a protocol message
     * from [origin], and asserts it reaches the client.
     */
    private fun assertWebMessageReceivedFrom(origin: String) {
        val view = checkoutWebView(activity)
        view.loadCheckout("https://checkout.shopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        var received = false
        view.setClient(
            CheckoutProtocol.Client().on(CheckoutProtocol.messagesChange) { received = true },
        )

        webMessageTransport.dispatchMessage(ecMessagesChangeMessage(), sourceOrigin = origin)

        await().pollInSameThread().atMost(2, TimeUnit.SECONDS).untilAsserted {
            ShadowLooper.shadowMainLooper().runToEndOfTasks()
            assertThat(received).isTrue()
        }
    }

    private fun ecStartMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.start","params":{"checkout":${checkoutJson()}}}"""

    private fun ecMessagesChangeMessage(): String =
        """{"jsonrpc":"2.0","method":"ec.messages.change","params":{"checkout":${checkoutJson()}}}"""

    private fun checkoutJson(): String {
        val ucp = """{"payment_handlers":{},"version":"1.0"}"""
        return """{"id":"chk1","currency":"USD","status":"incomplete","line_items":[],"totals":[],"links":[],"ucp":$ucp}"""
    }
}
