package com.shopify.checkoutkit.telemetry

import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol

internal enum class TelemetryErrorCategory(internal val wireValue: String) {
    Http("http"),
    Navigation("navigation"),
    Protocol("protocol"),
    RenderProcess("render_process"),
    Unknown("unknown"),
}

internal enum class TelemetryErrorStage(internal val wireValue: String) {
    Initialization("initialization"),
    Load("load"),
    Message("message"),
    Presentation("presentation"),
}

internal enum class TelemetryErrorCode(internal val wireValue: String) {
    Client("4xx"),
    Server("5xx"),
    Cancelled("cancelled"),
    ConnectionLost("connection_lost"),
    CannotConnect("cannot_connect"),
    Dns("dns"),
    Timeout("timeout"),
    Unknown("unknown"),
}

internal class TelemetryProtocolMethod private constructor(internal val wireValue: String) {
    companion object {
        fun fromMethod(method: String): TelemetryProtocolMethod =
            TelemetryProtocolMethod(
                if (method in EmbeddedCheckoutProtocol.Event.all) method else "unknown",
            )
    }
}

internal enum class TelemetryDecodeFailureType(internal val wireValue: String) {
    Envelope("envelope"),
    Params("params"),
    Serialization("serialization"),
    Unknown("unknown"),
}

internal enum class TelemetryNavigationRetryReason(internal val wireValue: String) {
    Timeout("timeout"),
    ConnectionLost("connection_lost"),
    CannotConnect("cannot_connect"),
    Dns("dns"),
    Unknown("unknown"),
}

internal enum class TelemetryNavigationRetryResult(internal val wireValue: String) {
    Started("started"),
    Failed("failed"),
    NotAttempted("not_attempted"),
}

internal enum class TelemetryNavigationDurationResult(internal val wireValue: String) {
    Success("success"),
    Failure("failure"),
}

internal enum class TelemetryProduct(internal val wireValue: String) {
    CheckoutKit("checkout_kit"),
    AcceleratedCheckouts("accelerated_checkouts"),
    CustomerAuth("customer_auth"),
}

internal enum class TelemetryPlatform(internal val wireValue: String) {
    Android("android"),
    ReactNativeAndroid("react-native-android"),
}

internal data class TelemetryErrorMetric(
    val category: TelemetryErrorCategory,
    val stage: TelemetryErrorStage,
    val code: TelemetryErrorCode,
    val retryable: Boolean,
    val isRetry: Boolean = false,
)

internal data class TelemetryProtocolDecodeErrorMetric(
    val method: TelemetryProtocolMethod,
    val failureType: TelemetryDecodeFailureType,
)

internal data class TelemetryNavigationRetryMetric(
    val reason: TelemetryNavigationRetryReason,
    val result: TelemetryNavigationRetryResult,
)

internal data class TelemetryNavigationDurationMetric(
    val milliseconds: Double,
    val result: TelemetryNavigationDurationResult,
    val preloaded: Boolean,
)

internal data class CheckoutKitTelemetryConfiguration(
    val sdkVersion: String,
    val product: TelemetryProduct = TelemetryProduct.CheckoutKit,
    val platform: TelemetryPlatform = TelemetryPlatform.Android,
    val endpoint: String = CheckoutKitTelemetry.PRODUCTION_ENDPOINT,
    val exportIntervalMillis: Long = DEFAULT_EXPORT_INTERVAL_MILLIS,
    val maxPendingMeasurements: Int = DEFAULT_MAX_PENDING_MEASUREMENTS,
)

internal class CheckoutKitTelemetry(
    sdkVersion: String,
    product: TelemetryProduct = TelemetryProduct.CheckoutKit,
    platform: TelemetryPlatform = TelemetryPlatform.Android,
) {
    private val exporter = OtlpExporter(
        CheckoutKitTelemetryConfiguration(
            sdkVersion = sdkVersion,
            product = product,
            platform = platform,
        ),
    )

    fun start(): Unit = exporter.start()

    fun recordError(metric: TelemetryErrorMetric): Unit = exporter.recordError(metric)

    fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric): Unit =
        exporter.recordProtocolDecodeError(metric)

    fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric): Unit =
        exporter.recordNavigationRetry(metric)

    fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric): Unit =
        exporter.recordNavigationDuration(metric)

    fun flush(completion: (Boolean) -> Unit = {}): Unit = exporter.flush(completion)

    fun shutdown(
        discardPending: Boolean = false,
        completion: (Boolean) -> Unit = {},
    ): Unit = exporter.shutdown(discardPending, completion)

    companion object {
        const val PRODUCTION_ENDPOINT: String =
            "https://otlp-http-production.shopifysvc.com/v1/metrics"
    }
}

private const val DEFAULT_EXPORT_INTERVAL_MILLIS = 60_000L
private const val DEFAULT_MAX_PENDING_MEASUREMENTS = 128
