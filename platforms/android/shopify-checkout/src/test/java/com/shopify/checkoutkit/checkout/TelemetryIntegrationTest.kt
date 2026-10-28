package com.shopify.checkoutkit.checkout
import android.net.Uri
import android.os.Looper
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebViewClient.ERROR_FAILED_SSL_HANDSHAKE
import android.webkit.WebViewClient.ERROR_IO
import android.webkit.WebViewClient.ERROR_TIMEOUT
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.internal.protocol.CheckoutProtocol
import com.shopify.checkoutkit.internal.protocol.EmbeddedCheckoutProtocolBridge
import com.shopify.checkoutkit.internal.telemetry.CheckoutTelemetry
import com.shopify.checkoutkit.internal.telemetry.CheckoutTelemetryRecording
import com.shopify.checkoutkit.internal.telemetry.TelemetryConfirmationReachedMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryDecodeFailureType
import com.shopify.checkoutkit.internal.telemetry.TelemetryErrorCategory
import com.shopify.checkoutkit.internal.telemetry.TelemetryErrorCode
import com.shopify.checkoutkit.internal.telemetry.TelemetryErrorMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryNavigationDurationMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryNavigationDurationResult
import com.shopify.checkoutkit.internal.telemetry.TelemetryNavigationRetryMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryNavigationRetryReason
import com.shopify.checkoutkit.internal.telemetry.TelemetryNavigationRetryResult
import com.shopify.checkoutkit.internal.telemetry.TelemetryProtocolDecodeErrorMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryReadyDurationMetric
import com.shopify.checkoutkit.internal.telemetry.TelemetryReadyDurationResult
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import com.shopify.checkoutkit.internal.web.CheckoutWebViewListener
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

@RunWith(RobolectricTestRunner::class)
@Config(shadows = [RecordingShadowWebView::class])
class TelemetryIntegrationTest {
    private lateinit var activity: ComponentActivity
    private lateinit var originalConfiguration: Configuration
    private lateinit var recorder: RecordingTelemetry

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
        originalConfiguration = ShopifyCheckout.getConfiguration()
        ShopifyCheckout.configure { it.telemetry = Telemetry(enabled = true) }
        recorder = RecordingTelemetry()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
    }

    @After
    fun tearDown() {
        CheckoutTelemetry.overrideRecorderForTesting(null)
        ShopifyCheckout.configure { it.telemetry = originalConfiguration.telemetry }
        CheckoutWebView.clearCache()
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
    }

    @Test
    fun `records retry failure and navigation failure without raw error data`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val request = mainFrameRequest(requireNotNull(shadowOf(view).lastLoadedUrl))
        val error = mock<WebResourceError>().also {
            whenever(it.errorCode).thenReturn(ERROR_TIMEOUT)
            whenever(it.description).thenReturn("sensitive failure details")
        }
        val client = view.CheckoutWebViewClient()

        client.onReceivedError(view, request, error)
        val retryFailure = mock<WebResourceError>().also {
            whenever(it.errorCode).thenReturn(ERROR_FAILED_SSL_HANDSHAKE)
            whenever(it.description).thenReturn("different sensitive details")
        }
        client.onReceivedError(view, request, retryFailure)

        assertThat(recorder.retries.map { it.result }).containsExactly(
            TelemetryNavigationRetryResult.Started,
            TelemetryNavigationRetryResult.Failed,
        )
        assertThat(recorder.retries.map { it.reason }).containsOnly(
            CheckoutTelemetry.retryReason(ERROR_TIMEOUT),
        )
        assertThat(recorder.errors).hasSize(1)
        assertThat(recorder.errors.single().isRetry).isTrue()
        assertThat(recorder.durations.single().result)
            .isEqualTo(TelemetryNavigationDurationResult.Failure)
    }

    @Test
    fun `records ordinary main frame HTTP errors as navigation failures`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/synthetic")
        shadowOf(Looper.getMainLooper()).idle()
        val request = mainFrameRequest(requireNotNull(shadowOf(view).lastLoadedUrl))
        val response = mock<WebResourceResponse> {
            whenever(it.statusCode).thenReturn(403)
            whenever(it.reasonPhrase).thenReturn("Forbidden")
            whenever(it.responseHeaders).thenReturn(mapOf("cf-mitigated" to "block"))
        }

        view.CheckoutWebViewClient().onReceivedHttpError(view, request, response)

        assertThat(recorder.errors).hasSize(1)
        assertThat(recorder.errors.single().category).isEqualTo(TelemetryErrorCategory.Http)
        assertThat(recorder.errors.single().code).isEqualTo(TelemetryErrorCode.Client)
        assertThat(recorder.durations.single().result).isEqualTo(TelemetryNavigationDurationResult.Failure)
    }

    @Test
    fun `rendered managed challenge does not record HTTP or navigation failure`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/synthetic")
        view.markPresented()
        shadowOf(Looper.getMainLooper()).idle()
        val loadedUrl = requireNotNull(shadowOf(view).lastLoadedUrl)
        val request = mainFrameRequest(loadedUrl)
        val response = mock<WebResourceResponse> {
            whenever(it.statusCode).thenReturn(403)
            whenever(it.reasonPhrase).thenReturn("Forbidden")
            whenever(it.responseHeaders).thenReturn(mapOf("cf-mitigated" to "challenge"))
        }
        val client = view.CheckoutWebViewClient()

        client.onReceivedHttpError(view, request, response)

        assertThat(recorder.errors).isEmpty()
        assertThat(recorder.durations).isEmpty()

        client.onPageFinished(view, loadedUrl)

        assertThat(recorder.durations.single().result).isEqualTo(TelemetryNavigationDurationResult.Success)
    }

    @Test
    fun `records terminal protocol error and navigation failure after lifecycle guards`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = transport,
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage(ecErrorMessage())
        bridge.receiveMessage(ecErrorMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(recorder.errors).hasSize(1)
        assertThat(recorder.errors.single().category).isEqualTo(TelemetryErrorCategory.Protocol)
        assertThat(recorder.errors.single().code).isEqualTo(TelemetryErrorCode.TerminalError)
        assertThat(recorder.errors.single().isRetry).isFalse()
        assertThat(recorder.durations).hasSize(1)
        assertThat(recorder.durations.single().result)
            .isEqualTo(TelemetryNavigationDurationResult.Failure)
    }

    @Test
    fun `does not record surfaced terminal metrics for backgrounded preload errors`() {
        val transport = FakeWebMessageTransport()
        CheckoutWebView.preload("https://checkout-sdk.myshopify.com/cart/secret", activity, transport)
        // idle() runs only due tasks; running delayed tasks would fire the
        // preload TTL expiry and evict the cached view under test.
        shadowOf(Looper.getMainLooper()).idle()
        val preloadedView = requireNotNull(CheckoutWebView.cachedPreloadViewForTesting())
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = preloadedView,
            webMessageTransport = transport,
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage(ecErrorMessage())
        shadowOf(Looper.getMainLooper()).idle()

        assertThat(recorder.errors).isEmpty()
        assertThat(recorder.durations).isEmpty()
    }

    @Test
    fun `preserves retry context on terminal protocol errors`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val request = mainFrameRequest(requireNotNull(shadowOf(view).lastLoadedUrl))
        val timeout = mock<WebResourceError>().also {
            whenever(it.errorCode).thenReturn(ERROR_TIMEOUT)
            whenever(it.description).thenReturn("sensitive timeout")
        }

        view.CheckoutWebViewClient().onReceivedError(view, request, timeout)
        EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = transport,
            protocolMessageExecutor = { command -> command.run() },
        ).receiveMessage(ecErrorMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(recorder.retries.single().reason).isEqualTo(TelemetryNavigationRetryReason.Timeout)
        assertThat(recorder.retries.single().result).isEqualTo(TelemetryNavigationRetryResult.Started)
        assertThat(recorder.errors.single().isRetry).isTrue()
    }

    @Test
    fun `records malformed protocol messages with a bounded method`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = FakeWebMessageTransport(),
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage("not-json containing sensitive data")

        assertThat(recorder.decodeErrors.single().method.wireValue).isEqualTo("unknown")
    }

    @Test
    fun `records one decode error per malformed message even when merchant and default clients both decode`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        val merchantClient = CheckoutProtocol.Client().on(CheckoutProtocol.complete) { }
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = transport,
            client = merchantClient,
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage("""{"jsonrpc":"2.0","method":"ec.complete","params":{"unexpected":true}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(recorder.decodeErrors).hasSize(1)
        assertThat(recorder.decodeErrors.single().failureType).isEqualTo(TelemetryDecodeFailureType.Params)
        assertThat(recorder.decodeErrors.single().method.wireValue).isEqualTo("ec.complete")
    }

    @Test
    fun `records params decode error for malformed terminal error without subscribers`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = transport,
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage("""{"jsonrpc":"2.0","method":"ec.error","params":{"unexpected":true}}""")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()

        assertThat(recorder.decodeErrors).hasSize(1)
        assertThat(recorder.decodeErrors.single().failureType).isEqualTo(TelemetryDecodeFailureType.Params)
        assertThat(recorder.decodeErrors.single().method.wireValue).isEqualTo("ec.error")
    }

    @Test
    fun `records a presentation that ends on the confirmation page without completion`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        val bridge = presentedBridge(view, transport)

        view.loadUrl(CONFIRMATION_URL)
        bridge.invalidateEventAdapter()

        assertThat(recorder.confirmations).containsExactly(
            TelemetryConfirmationReachedMetric(completionReceived = false),
        )
    }

    @Test
    fun `records a presentation that ends on the confirmation page after completion once`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        val bridge = presentedBridge(view, transport)

        bridge.receiveMessage(completeMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        view.loadUrl(CONFIRMATION_URL)
        bridge.invalidateEventAdapter()
        bridge.invalidateEventAdapter()

        assertThat(recorder.confirmations).containsExactly(
            TelemetryConfirmationReachedMetric(completionReceived = true),
        )
    }

    @Test
    fun `records a completed presentation that ends before the confirmation page`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        val bridge = presentedBridge(view, transport)

        bridge.receiveMessage(completeMessage())
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        view.loadUrl("https://checkout-sdk.myshopify.com/checkouts/cn/synthetic/processing")
        bridge.invalidateEventAdapter()

        assertThat(recorder.confirmations).containsExactly(
            TelemetryConfirmationReachedMetric(completionReceived = true),
        )
    }

    @Test
    fun `does not record confirmation metrics when the presentation ends before the confirmation page`() {
        val transport = FakeWebMessageTransport()
        val view = CheckoutWebView(activity, transport)
        val bridge = presentedBridge(view, transport)

        view.loadUrl("https://checkout-sdk.myshopify.com/checkouts/cn/synthetic")
        bridge.invalidateEventAdapter()

        assertThat(recorder.confirmations).isEmpty()
    }

    @Test
    fun `does not record metrics when telemetry is disabled`() {
        ShopifyCheckout.configure { it.telemetry = Telemetry(enabled = false) }
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        val bridge = EmbeddedCheckoutProtocolBridge(
            view = view,
            webMessageTransport = FakeWebMessageTransport(),
            protocolMessageExecutor = { command -> command.run() },
        )

        bridge.receiveMessage("not-json")

        assertThat(recorder.decodeErrors).isEmpty()
    }

    @Test
    fun `captures preload attribution when navigation starts`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret", isPreload = true)
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        view.markPreloadConsumed()

        view.CheckoutWebViewClient().onPageFinished(view, requireNotNull(shadowOf(view).lastLoadedUrl))

        assertThat(recorder.durations.single().preloaded).isTrue()
    }

    @Test
    fun `maps a missing error code to unknown`() {
        assertThat(CheckoutTelemetry.errorCode(null))
            .isEqualTo(TelemetryErrorCode.Unknown)
        assertThat(CheckoutTelemetry.retryReason(null))
            .isEqualTo(TelemetryNavigationRetryReason.Unknown)
    }

    @Test
    fun `maps IO errors to connection lost`() {
        assertThat(CheckoutTelemetry.errorCode(ERROR_IO))
            .isEqualTo(TelemetryErrorCode.ConnectionLost)
    }

    @Test
    fun `does not retry IO errors even though they map to connection lost`() {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).runToEndOfTasks()
        val request = mainFrameRequest(requireNotNull(shadowOf(view).lastLoadedUrl))
        val error = mock<WebResourceError>().also {
            whenever(it.errorCode).thenReturn(ERROR_IO)
            whenever(it.description).thenReturn("sensitive io details")
        }

        view.CheckoutWebViewClient().onReceivedError(view, request, error)

        assertThat(recorder.retries).isEmpty()
        assertThat(recorder.errors.single().code).isEqualTo(TelemetryErrorCode.ConnectionLost)
        assertThat(recorder.errors.single().retryable).isFalse()
    }

    @Test
    fun `records ready once when checkout sends ec ready`() {
        val view = loadedView()
        view.markPresented()
        val bridge = bridgeFor(view)

        bridge.receiveMessage(EC_READY_MESSAGE)
        bridge.receiveMessage(EC_READY_MESSAGE)
        shadowOf(Looper.getMainLooper()).idle()
        view.destroy()

        val ready = recorder.readyDurations.single()
        assertThat(ready.result).isEqualTo(TelemetryReadyDurationResult.Ready)
        assertThat(ready.preloaded).isFalse()
    }

    @Test
    fun `records not ready when a presented view is destroyed before ready`() {
        val view = loadedView()
        view.markPresented()

        view.destroy()

        assertThat(recorder.readyDurations.single().result).isEqualTo(TelemetryReadyDurationResult.NotReady)
    }

    @Test
    fun `records not ready for a preload only once it has been presented`() {
        val url = "https://checkout-sdk.myshopify.com/cart/secret"
        val transport = FakeWebMessageTransport()
        CheckoutWebView.preload(url, activity, transport)
        shadowOf(Looper.getMainLooper()).idle()
        CheckoutWebView.invalidate()
        shadowOf(Looper.getMainLooper()).idle()
        assertThat(recorder.readyDurations).isEmpty()

        CheckoutWebView.preload(url, activity, transport)
        shadowOf(Looper.getMainLooper()).idle()
        val view = CheckoutWebView.checkoutViewFor(url, activity, transport)
        view.markPresented()
        view.destroy()

        val notReady = recorder.readyDurations.single()
        assertThat(notReady.result).isEqualTo(TelemetryReadyDurationResult.NotReady)
        assertThat(notReady.preloaded).isTrue()
    }

    private fun loadedView(): CheckoutWebView {
        val view = CheckoutWebView(activity, FakeWebMessageTransport())
        view.loadCheckout("https://checkout-sdk.myshopify.com/cart/secret")
        shadowOf(Looper.getMainLooper()).idle()
        return view
    }

    private fun bridgeFor(view: CheckoutWebView) = EmbeddedCheckoutProtocolBridge(
        view = view,
        webMessageTransport = FakeWebMessageTransport(),
        protocolMessageExecutor = { command -> command.run() },
    )

    private fun mainFrameRequest(url: String): WebResourceRequest = mock<WebResourceRequest>().also {
        whenever(it.url).thenReturn(Uri.parse(url))
        whenever(it.isForMainFrame).thenReturn(true)
    }

    private fun ecErrorMessage(): String {
        val error = """
            |{
            |  "ucp":{"version":"${CheckoutProtocol.SPEC_VERSION}","status":"error"},
            |  "messages":[
            |    {
            |      "type":"error",
            |      "code":"session_failed",
            |      "content":"Session failed",
            |      "severity":"unrecoverable"
            |    }
            |  ]
            |}
        """.trimMargin()
        return """{"jsonrpc":"2.0","method":"ec.error","params":{"error":$error}}"""
    }
}

private const val CONFIRMATION_URL = "https://checkout-sdk.myshopify.com/checkouts/cn/synthetic/thank-you"

private fun presentedBridge(view: CheckoutWebView, transport: FakeWebMessageTransport) =
    EmbeddedCheckoutProtocolBridge(
        view = view,
        webMessageTransport = transport,
        protocolMessageExecutor = { command -> command.run() },
    ).also { bridge ->
        bridge.setPresentationListener(
            CheckoutWebViewListener(object : DefaultCheckoutListener() {
                override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit

                override fun onCheckoutDismissed() = Unit
            }),
        )
    }

private fun completeMessage(): String = """{
    "jsonrpc":"2.0","method":"ec.complete","params":{"checkout":{
      "id":"checkout-1","currency":"USD","status":"completed","line_items":[],"links":[],
      "totals":[{"type":"total","amount":1}],
      "ucp":{"payment_handlers":{},"version":"${CheckoutProtocol.SPEC_VERSION}"}
    }}
}"""

private class RecordingTelemetry : CheckoutTelemetryRecording {
    val errors = mutableListOf<TelemetryErrorMetric>()
    val decodeErrors = mutableListOf<TelemetryProtocolDecodeErrorMetric>()
    val confirmations = mutableListOf<TelemetryConfirmationReachedMetric>()
    val retries = mutableListOf<TelemetryNavigationRetryMetric>()
    val durations = mutableListOf<TelemetryNavigationDurationMetric>()
    val readyDurations = mutableListOf<TelemetryReadyDurationMetric>()

    override fun recordError(metric: TelemetryErrorMetric) {
        errors += metric
    }

    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) {
        decodeErrors += metric
    }

    override fun recordConfirmationReached(metric: TelemetryConfirmationReachedMetric) {
        confirmations += metric
    }

    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) {
        retries += metric
    }

    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) {
        durations += metric
    }

    override fun recordReadyDuration(metric: TelemetryReadyDurationMetric) {
        readyDurations += metric
    }
}

internal object NoOpTestCheckoutTelemetryRecorder : CheckoutTelemetryRecording {
    override fun recordError(metric: TelemetryErrorMetric) = Unit
    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) = Unit
    override fun recordConfirmationReached(metric: TelemetryConfirmationReachedMetric) = Unit
    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) = Unit
    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) = Unit
    override fun recordReadyDuration(metric: TelemetryReadyDurationMetric) = Unit
}

private const val EC_READY_MESSAGE = """{"jsonrpc":"2.0","method":"ec.ready","id":"r1","params":{"delegate":[]}}"""
