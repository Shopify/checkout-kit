package com.shopify.checkoutkit

import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebViewClient.ERROR_BAD_URL
import android.webkit.WebViewClient.ERROR_CONNECT
import android.webkit.WebViewClient.ERROR_HOST_LOOKUP
import android.webkit.WebViewClient.ERROR_TIMEOUT
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.CheckoutExceptionAssert.Companion.assertThat
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.spy
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper
import java.net.HttpURLConnection

@RunWith(RobolectricTestRunner::class)
@Config(shadows = [RecordingShadowWebView::class])
class CheckoutWebViewClientTest {

    private lateinit var activity: ComponentActivity
    private val mockListener = mock<CheckoutListener>()
    private val checkoutWebViewListener = spy(CheckoutWebViewListener(mockListener))
    private val webMessageTransport = FakeWebMessageTransport()

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
        // Mirror real-Android behavior: startActivity throws ActivityNotFoundException when
        // no activity resolves the intent. Robolectric defaults to silently recording the
        // intent instead — turning on checkActivities aligns the shadow with production.
        shadowOf(activity.application).checkActivities(true)
    }

    @After
    fun tearDown() {
        CheckoutWebView.clearCache()
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
    }

    @Test
    fun `overrides url loading for mailto links and launches intent when resolvable`() {
        val uri = Uri.parse("mailto:daniel.kift@shopify.com")
        registerResolverFor(uri)
        val mockRequest = mockWebRequest(uri)

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isTrue
        val launched = shadowOf(activity).nextStartedActivity
        assertThat(launched).isNotNull
        assertThat(launched.action).isEqualTo(Intent.ACTION_VIEW)
        assertThat(launched.data).isEqualTo(uri)
    }

    @Test
    fun `overrides url loading for tel links and launches intent when resolvable`() {
        val uri = Uri.parse("tel:0123456789")
        registerResolverFor(uri)
        val mockRequest = mockWebRequest(uri)

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isTrue
        assertThat(shadowOf(activity).nextStartedActivity).isNotNull
    }

    @Test
    fun `overrides url loading for deep links and launches intent when resolvable`() {
        val uri = Uri.parse("geo:40.712776,-74.005974?q=Statue+of+Liberty")
        registerResolverFor(uri)
        val mockRequest = mockWebRequest(uri)

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isTrue
        assertThat(shadowOf(activity).nextStartedActivity).isNotNull
    }

    @Test
    fun `overrides url loading for unresolvable deep link but launches no intent`() {
        val mockRequest = mockWebRequest(Uri.parse("myapp://path"))

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isTrue
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `does not override url loading for about blank`() {
        val mockRequest = mockWebRequest(Uri.parse("about:blank"))

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isFalse()
    }

    @Test
    fun `does not override url loading for web links`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"))

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isFalse
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `reports a client exception for a web resource load error in the main frame`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceError(status = ERROR_BAD_URL)

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onReceivedError(view, mockRequest, mockResponse)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(ClientException::class.java)
            .hasErrorCode(CheckoutUnavailableException.CLIENT_ERROR)
    }

    @Test
    fun `retries each retryable initial main frame error once`() {
        listOf(ERROR_TIMEOUT, ERROR_CONNECT, ERROR_HOST_LOOKUP).forEach(::assertRetriesInitialMainFrameErrorOnce)
    }

    @Test
    fun `does not retry a non-transient initial main frame error`() {
        val view = viewWithProcessor(activity)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val request = mockWebRequest(Uri.parse(requireNotNull(shadowOf(view).lastLoadedUrl)), true)
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onReceivedError(view, request, mockWebResourceError(status = ERROR_BAD_URL))

        assertThat(RecordingShadowWebView.loadRequestsFor(view)).hasSize(1)
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `retry preserves preload request headers and keeps cache until retry fails`() {
        CheckoutWebView.preload(
            url = "https://checkout-sdk.myshopify.com/cart/123",
            activity = activity,
            webMessageTransport = webMessageTransport,
        )
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val view = requireNotNull(CheckoutWebView.cachedPreloadViewForTesting())
        val originalUrl = requireNotNull(shadowOf(view).lastLoadedUrl)
        val request = mockWebRequest(Uri.parse(originalUrl), true)
        val error = mockWebResourceError(status = ERROR_TIMEOUT, description = "Timed out")
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onReceivedError(view, request, error)

        val retryRequest = RecordingShadowWebView.loadRequestsFor(view).also {
            assertThat(it).hasSize(2)
        }.last()
        assertThat(retryRequest.url).isEqualTo(originalUrl)
        assertThat(retryRequest.headers).containsEntry("Shopify-Purpose", "prefetch")
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(view)

        webViewClient.onReceivedError(view, request, error)

        assertThat(RecordingShadowWebView.loadRequestsFor(view)).hasSize(2)
        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isNull()
    }

    @Test
    fun `subresource errors do not consume the initial checkout retry`() {
        val view = viewWithProcessor(activity)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val originalUrl = requireNotNull(shadowOf(view).lastLoadedUrl)
        val webViewClient = view.CheckoutWebViewClient()
        val error = mockWebResourceError(status = ERROR_TIMEOUT, description = "Timed out")

        webViewClient.onReceivedError(view, mockWebRequest(Uri.parse(originalUrl)), error)

        assertThat(RecordingShadowWebView.loadRequestsFor(view)).hasSize(1)
        verify(checkoutWebViewListener, never()).onCheckoutViewFailedWithError(any())

        webViewClient.onReceivedError(view, mockWebRequest(Uri.parse(originalUrl), true), error)

        assertThat(RecordingShadowWebView.loadRequestsFor(view)).hasSize(2)
        verify(checkoutWebViewListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - 410`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_GONE
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutExpiredException::class.java)
            .hasErrorCode(CheckoutExpiredException.CART_EXPIRED)
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - 404`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_NOT_FOUND,
            description = "Not Found",
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(HttpException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
            .hasDescription("Not Found")
            .hasStatusCode(404)
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - 500`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_INTERNAL_ERROR
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutUnavailableException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - 504`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_GATEWAY_TIMEOUT
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutUnavailableException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - 502`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_BAD_GATEWAY
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutUnavailableException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - bad url`() {
        val loadedUri = Uri.parse("https://checkout-sdk.myshopify.com")
        val mockRequest = mockWebRequest(loadedUri, true)
        val mockResponse = mockWebResourceResponse(
            status = ERROR_BAD_URL,
            description = "Bad url"
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutUnavailableException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
            .hasDescription("Bad url")
    }

    @Test
    fun `should call event processor calls onCheckoutViewFailedWithError on http error for main frame - other`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_BAD_REQUEST,
            description = "Bad request"
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutUnavailableException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
            .hasDescription("Bad request")
    }

    @Test
    fun `should call event processor with default description including the status code if the reason phrase is blank`() {
        val mockRequest = mockWebRequest(Uri.parse("https://checkout-sdk.myshopify.com"), true)
        val mockResponse = mockWebResourceResponse(
            status = HttpURLConnection.HTTP_BAD_GATEWAY,
            description = ""
        )

        triggerOnReceivedHttpError(mockRequest, mockResponse)

        val captor = argumentCaptor<CheckoutException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(HttpException::class.java)
            .hasErrorCode(CheckoutUnavailableException.HTTP_ERROR)
            .hasDescription("HTTP 502 Error")
    }

    // Deliberate trade-off (matches Swift PR #82): the `?open_externally=true` query-param intercept
    // is dropped. Policy/contact links that previously relied on this param will be handled inline
    // by the WebView until checkout-side `ec.window.open_request` dispatch ships server-side.
    @Test
    fun `does not override url loading for https links carrying open_externally`() {
        val loadedUri = Uri.parse("https://go.shop.com?open_externally=true&random_param=1")
        val mockRequest = mockWebRequest(loadedUri)

        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val overridden = webViewClient.shouldOverrideUrlLoading(view, mockRequest)

        assertThat(overridden).isFalse
        assertThat(shadowOf(activity).nextStartedActivity).isNull()
    }

    @Test
    fun `onPageFinished calls delegate to remove progress indicator`() {
        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onPageFinished(view, "https://anything")

        verify(checkoutWebViewListener).onCheckoutViewLoadComplete()
    }

    @Test
    fun `onRenderProcessGone should return false if sdk version is too low to check detail#didCrash()`() {
        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val detail = mock<RenderProcessGoneDetail>()
        whenever(detail.didCrash()).thenReturn(false)

        val result = webViewClient.onRenderProcessGone(view, detail)

        assertThat(result).isFalse
        verify(checkoutWebViewListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Config(sdk = [26])
    @Test
    fun `onRenderProcessGone should do nothing if the renderer crashed`() {
        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val detail = mock<RenderProcessGoneDetail>()
        whenever(detail.didCrash()).thenReturn(true)

        val result = webViewClient.onRenderProcessGone(view, detail)

        assertThat(result).isFalse
        verify(checkoutWebViewListener, never()).onCheckoutViewFailedWithError(any())
    }

    @Config(sdk = [26])
    @Test
    fun `onRenderProcessGone should call onCheckoutFailed if the render process crashed due to low memory`() {
        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()
        val detail = mock<RenderProcessGoneDetail>()
        whenever(detail.didCrash()).thenReturn(false)

        val result = webViewClient.onRenderProcessGone(view, detail)

        assertThat(result).isTrue
        val captor = argumentCaptor<CheckoutKitException>()
        verify(checkoutWebViewListener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(CheckoutKitException::class.java)
            .hasDescription("Render process gone.")
            .hasErrorCode(CheckoutKitException.RENDER_PROCESS_GONE)
    }

    @Config(sdk = [26])
    @Test
    fun `fallback renderer failure does not evict active preloaded checkout`() {
        val checkoutUrl = "https://checkout.shopify.com/cart/123"
        CheckoutWebView.preload(checkoutUrl, activity, webMessageTransport)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val preloadedView = CheckoutWebView.checkoutViewFor(checkoutUrl, activity, webMessageTransport)
        preloadedView.markPresented()
        val fallbackView = CheckoutWebView.checkoutViewFor(checkoutUrl, activity, webMessageTransport)
        val detail = mock<RenderProcessGoneDetail>()
        whenever(detail.didCrash()).thenReturn(false)

        fallbackView.CheckoutWebViewClient().onRenderProcessGone(fallbackView, detail)

        assertThat(CheckoutWebView.cachedPreloadViewForTesting()).isSameAs(preloadedView)
    }

    private fun triggerOnReceivedHttpError(mockRequest: WebResourceRequest, checkoutExpiredResponse: WebResourceResponse) {
        val view = viewWithProcessor(activity)
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onReceivedHttpError(view, mockRequest, checkoutExpiredResponse)
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
    }

    private fun assertRetriesInitialMainFrameErrorOnce(errorCode: Int) {
        val listener = spy(CheckoutWebViewListener(mock()))
        val view = viewWithProcessor(activity, listener)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/123")
        ShadowLooper.shadowMainLooper().runToEndOfTasks()
        val originalUrl = requireNotNull(shadowOf(view).lastLoadedUrl)
        val request = mockWebRequest(Uri.parse(originalUrl), true)
        val error = mockWebResourceError(status = errorCode, description = "Transient failure")
        val webViewClient = view.CheckoutWebViewClient()

        webViewClient.onReceivedError(view, request, error)

        val retryRequest = RecordingShadowWebView.loadRequestsFor(view).also {
            assertThat(it).hasSize(2)
        }.last()
        assertThat(retryRequest.url).isEqualTo(originalUrl)
        verify(listener, never()).onCheckoutViewFailedWithError(any())

        webViewClient.onReceivedError(view, request, error)

        assertThat(RecordingShadowWebView.loadRequestsFor(view)).hasSize(2)
        val captor = argumentCaptor<CheckoutException>()
        verify(listener).onCheckoutViewFailedWithError(captor.capture())
        assertThat(captor.firstValue)
            .isInstanceOf(ClientException::class.java)
            .hasErrorCode(CheckoutUnavailableException.CLIENT_ERROR)
    }

    private fun registerResolverFor(uri: Uri) {
        val componentName = ComponentName("com.fake.handler", "FakeHandlerActivity")
        val intentFilter = IntentFilter(Intent.ACTION_VIEW).apply {
            addCategory(Intent.CATEGORY_DEFAULT)
            addDataScheme(uri.scheme)
        }
        shadowOf(activity.packageManager).addActivityIfNotPresent(componentName)
        shadowOf(activity.packageManager).addIntentFilterForActivity(componentName, intentFilter)
    }

    private fun mockWebRequest(uri: Uri, forMainFrame: Boolean = false): WebResourceRequest {
        val mockRequest = mock<WebResourceRequest>()
        whenever(mockRequest.url).thenReturn(uri)
        whenever(mockRequest.isForMainFrame).thenReturn(forMainFrame)
        return mockRequest
    }

    private fun viewWithProcessor(
        activity: ComponentActivity,
        listener: CheckoutWebViewListener = checkoutWebViewListener,
    ): CheckoutWebView {
        val view = CheckoutWebView(activity, webMessageTransport)
        view.setListener(listener)
        return view
    }

    private fun mockWebResourceError(
        status: Int = ERROR_BAD_URL,
        description: String = "Invalid URL"
    ): WebResourceError {
        val mock = mock<WebResourceError>()
        whenever(mock.errorCode).thenReturn(status)
        whenever(mock.description).thenReturn(description)
        return mock
    }

    private fun mockWebResourceResponse(
        status: Int = 410,
        description: String = "Checkout expired",
        headers: MutableMap<String, String> = mutableMapOf()
    ): WebResourceResponse {
        val mock = mock<WebResourceResponse>()
        whenever(mock.statusCode).thenReturn(status)
        whenever(mock.reasonPhrase).thenReturn(description)
        whenever(mock.responseHeaders).thenReturn(headers)
        return mock
    }
}
