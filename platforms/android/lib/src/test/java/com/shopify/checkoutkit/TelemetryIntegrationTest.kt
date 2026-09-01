package com.shopify.checkoutkit

import android.net.Uri
import android.os.Looper
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebViewClient.ERROR_FAILED_SSL_HANDSHAKE
import android.webkit.WebViewClient.ERROR_IO
import android.webkit.WebViewClient.ERROR_TIMEOUT
import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.telemetry.TelemetryDecodeFailureType
import com.shopify.checkoutkit.telemetry.TelemetryErrorCategory
import com.shopify.checkoutkit.telemetry.TelemetryErrorCode
import com.shopify.checkoutkit.telemetry.TelemetryErrorMetric
import com.shopify.checkoutkit.telemetry.TelemetryNavigationDurationMetric
import com.shopify.checkoutkit.telemetry.TelemetryNavigationDurationResult
import com.shopify.checkoutkit.telemetry.TelemetryNavigationRetryMetric
import com.shopify.checkoutkit.telemetry.TelemetryNavigationRetryReason
import com.shopify.checkoutkit.telemetry.TelemetryNavigationRetryResult
import com.shopify.checkoutkit.telemetry.TelemetryProtocolDecodeErrorMetric
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
        originalConfiguration = ShopifyCheckoutKit.getConfiguration()
        ShopifyCheckoutKit.configure { it.telemetry = Telemetry(enabled = true) }
        recorder = RecordingTelemetry()
        CheckoutTelemetry.overrideRecorderForTesting(recorder)
    }

    @After
    fun tearDown() {
        CheckoutTelemetry.overrideRecorderForTesting(null)
        ShopifyCheckoutKit.configure { it.telemetry = originalConfiguration.telemetry }
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
    fun `does not record metrics when telemetry is disabled`() {
        ShopifyCheckoutKit.configure { it.telemetry = Telemetry(enabled = false) }
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

    private fun mainFrameRequest(url: String): WebResourceRequest = mock<WebResourceRequest>().also {
        whenever(it.url).thenReturn(Uri.parse(url))
        whenever(it.isForMainFrame).thenReturn(true)
    }

    private fun ecErrorMessage(): String {
        val error = """
            |{
            |  "ucp":{"version":"2026-04-08","status":"error"},
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

private class RecordingTelemetry : CheckoutTelemetryRecording {
    val errors = mutableListOf<TelemetryErrorMetric>()
    val decodeErrors = mutableListOf<TelemetryProtocolDecodeErrorMetric>()
    val retries = mutableListOf<TelemetryNavigationRetryMetric>()
    val durations = mutableListOf<TelemetryNavigationDurationMetric>()

    override fun recordError(metric: TelemetryErrorMetric) {
        errors += metric
    }

    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) {
        decodeErrors += metric
    }

    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) {
        retries += metric
    }

    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) {
        durations += metric
    }
}

internal object NoOpTestCheckoutTelemetryRecorder : CheckoutTelemetryRecording {
    override fun recordError(metric: TelemetryErrorMetric) = Unit
    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) = Unit
    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) = Unit
    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) = Unit
}
