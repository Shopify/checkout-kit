package com.shopify.checkoutkit.internal.telemetry
import android.webkit.WebViewClient.ERROR_CONNECT
import android.webkit.WebViewClient.ERROR_HOST_LOOKUP
import android.webkit.WebViewClient.ERROR_IO
import android.webkit.WebViewClient.ERROR_TIMEOUT
import com.shopify.checkoutkit.checkout.BuildConfig
import com.shopify.checkoutkit.checkout.Platform
import com.shopify.checkoutkit.checkout.ShopifyCheckout

internal interface CheckoutTelemetryRecording {
    fun recordError(metric: TelemetryErrorMetric)
    fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric)
    fun recordConfirmationReached(metric: TelemetryConfirmationReachedMetric)
    fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric)
    fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric)
    fun recordReadyDuration(metric: TelemetryReadyDurationMetric)
}

private interface CheckoutTelemetryClient : CheckoutTelemetryRecording {
    fun shutdown()
}

private class DefaultCheckoutTelemetryRecorder : CheckoutTelemetryClient {
    private val telemetry = CheckoutKitTelemetry(
        sdkVersion = BuildConfig.SDK_VERSION,
        platform = if (ShopifyCheckout.configuration.platform is Platform.ReactNative) {
            TelemetryPlatform.ReactNativeAndroid
        } else {
            TelemetryPlatform.Android
        },
    ).also { it.start() }

    override fun recordError(metric: TelemetryErrorMetric) = telemetry.recordError(metric)

    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) =
        telemetry.recordProtocolDecodeError(metric)

    override fun recordConfirmationReached(metric: TelemetryConfirmationReachedMetric) =
        telemetry.recordConfirmationReached(metric)

    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) =
        telemetry.recordNavigationRetry(metric)

    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) =
        telemetry.recordNavigationDuration(metric)

    override fun recordReadyDuration(metric: TelemetryReadyDurationMetric) =
        telemetry.recordReadyDuration(metric)

    override fun shutdown() = telemetry.shutdown(discardPending = true)
}

private object NoOpCheckoutTelemetryRecorder : CheckoutTelemetryRecording {
    override fun recordError(metric: TelemetryErrorMetric) = Unit

    override fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) = Unit

    override fun recordConfirmationReached(metric: TelemetryConfirmationReachedMetric) = Unit

    override fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) = Unit

    override fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) = Unit

    override fun recordReadyDuration(metric: TelemetryReadyDurationMetric) = Unit
}

internal object CheckoutTelemetry {
    private val lock = Any()

    @Volatile
    private var configuredRecorder: CheckoutTelemetryClient? = null

    @Volatile
    private var recorderOverride: CheckoutTelemetryRecording? = null

    val recorder: CheckoutTelemetryRecording
        get() {
            if (!ShopifyCheckout.configuration.telemetry.enabled) {
                return NoOpCheckoutTelemetryRecorder
            }
            recorderOverride?.let { return it }
            configuredRecorder?.let { return it }
            return synchronized(lock) {
                // Re-check under the lock so a concurrent disable() cannot race a
                // recorder creation that would keep exporting after opt-out.
                if (!ShopifyCheckout.configuration.telemetry.enabled) {
                    return NoOpCheckoutTelemetryRecorder
                }
                recorderOverride
                    ?: configuredRecorder
                    ?: runCatching { DefaultCheckoutTelemetryRecorder() }
                        .getOrNull()
                        ?.also { configuredRecorder = it }
                    ?: NoOpCheckoutTelemetryRecorder
            }
        }

    fun disable() {
        val recorder = synchronized(lock) {
            configuredRecorder.also { configuredRecorder = null }
        }
        recorder?.shutdown()
    }

    fun overrideRecorderForTesting(recorder: CheckoutTelemetryRecording?) {
        recorderOverride = recorder
    }

    fun errorCode(errorCode: Int?): TelemetryErrorCode = when (errorCode) {
        ERROR_TIMEOUT -> TelemetryErrorCode.Timeout
        ERROR_CONNECT -> TelemetryErrorCode.CannotConnect
        ERROR_HOST_LOOKUP -> TelemetryErrorCode.Dns
        ERROR_IO -> TelemetryErrorCode.ConnectionLost
        else -> TelemetryErrorCode.Unknown
    }

    fun retryReason(errorCode: Int?): TelemetryNavigationRetryReason = when (errorCode(errorCode)) {
        TelemetryErrorCode.Timeout -> TelemetryNavigationRetryReason.Timeout
        TelemetryErrorCode.ConnectionLost -> TelemetryNavigationRetryReason.ConnectionLost
        TelemetryErrorCode.CannotConnect -> TelemetryNavigationRetryReason.CannotConnect
        TelemetryErrorCode.Dns -> TelemetryNavigationRetryReason.Dns
        else -> TelemetryNavigationRetryReason.Unknown
    }
}
