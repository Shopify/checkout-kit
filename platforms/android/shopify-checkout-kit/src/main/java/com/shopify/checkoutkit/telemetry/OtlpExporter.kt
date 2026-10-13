package com.shopify.checkoutkit.telemetry

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.net.HttpURLConnection
import java.net.URI
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min

internal class OtlpExporter(
    private val configuration: CheckoutKitTelemetryConfiguration,
    private val clock: () -> Long = { System.currentTimeMillis() * NANOS_PER_MILLISECOND },
    private val transport: TelemetryTransport = HttpTelemetryTransport(),
    private val executor: ScheduledExecutorService = defaultExecutor(),
    private val exportClockMillis: () -> Long = System::currentTimeMillis,
) {
    private val lock = Any()
    private val measurements = mutableListOf<Measurement>()
    private var scheduledFlush: ScheduledFuture<*>? = null
    private var consecutiveExportFailures = 0
    private var nextExportAllowedAtMillis = 0L
    private val pendingFlushes = mutableSetOf<FlushOperation>()
    private var stopped = false

    fun start() {
        if (configuration.exportIntervalMillis <= 0) return
        synchronized(lock) {
            if (stopped || scheduledFlush != null) return
            scheduledFlush = try {
                executor.scheduleWithFixedDelay(
                    { flush() },
                    configuration.exportIntervalMillis,
                    configuration.exportIntervalMillis,
                    TimeUnit.MILLISECONDS,
                )
            } catch (_: RejectedExecutionException) {
                null
            }
        }
    }

    fun recordError(metric: TelemetryErrorMetric) {
        recordCounter(
            "checkout_kit_error",
            attributes(
                "category" to AttributeValue.StringValue(metric.category.wireValue),
                "stage" to AttributeValue.StringValue(metric.stage.wireValue),
                "code" to AttributeValue.StringValue(metric.code.wireValue),
                "retryable" to AttributeValue.BooleanValue(metric.retryable),
                "is_retry" to AttributeValue.BooleanValue(metric.isRetry),
            ),
        )
    }

    fun recordProtocolDecodeError(metric: TelemetryProtocolDecodeErrorMetric) {
        recordCounter(
            "checkout_kit_protocol_decode_error",
            attributes(
                "method" to AttributeValue.StringValue(metric.method.wireValue),
                "failure_type" to AttributeValue.StringValue(metric.failureType.wireValue),
            ),
        )
    }

    fun recordNavigationRetry(metric: TelemetryNavigationRetryMetric) {
        recordCounter(
            "checkout_kit_navigation_retry",
            attributes(
                "reason" to AttributeValue.StringValue(metric.reason.wireValue),
                "result" to AttributeValue.StringValue(metric.result.wireValue),
            ),
        )
    }

    fun recordNavigationDuration(metric: TelemetryNavigationDurationMetric) {
        if (!metric.milliseconds.isFinite() || metric.milliseconds < 0) return
        record(
            Measurement(
                type = MeasurementType.Histogram,
                name = "checkout_kit_navigation_duration_ms",
                value = metric.milliseconds,
                unit = "ms",
                attributes = attributes(
                    "result" to AttributeValue.StringValue(metric.result.wireValue),
                    "preloaded" to AttributeValue.BooleanValue(metric.preloaded),
                ),
                timeUnixNano = clock(),
            ),
        )
    }

    fun flush(completion: (Boolean) -> Unit = {}) = flush(ignoreBackoff = false, completion)

    private fun flush(ignoreBackoff: Boolean, completion: (Boolean) -> Unit) {
        val operation = FlushOperation(completion)
        val shouldSubmit = synchronized(lock) {
            if (stopped) {
                false
            } else {
                pendingFlushes += operation
                true
            }
        }
        if (!shouldSubmit) {
            operation.complete(false)
            return
        }
        try {
            val future = executor.submit {
                runFlush(ignoreBackoff, operation)
            }
            var cancelled = false
            synchronized(lock) {
                operation.future = future
                if (stopped) {
                    pendingFlushes -= operation
                    future.cancel(true)
                    cancelled = true
                }
            }
            if (cancelled) operation.complete(false)
        } catch (_: RejectedExecutionException) {
            synchronized(lock) { pendingFlushes -= operation }
            operation.complete(false)
        }
    }

    fun shutdown(discardPending: Boolean = false, completion: (Boolean) -> Unit = {}) {
        var cancelledFlushes = emptyList<FlushOperation>()
        val alreadyStopped = synchronized(lock) {
            if (stopped) return@synchronized true
            scheduledFlush?.cancel(false)
            scheduledFlush = null
            if (discardPending) {
                stopped = true
                measurements.clear()
                cancelledFlushes = pendingFlushes.toList()
                pendingFlushes.clear()
                cancelledFlushes.forEach {
                    it.cancel()
                    it.future?.cancel(true)
                }
            }
            false
        }
        if (alreadyStopped) {
            completion(true)
            return
        }
        if (discardPending) {
            transport.cancel()
            executor.shutdownNow()
            cancelledFlushes.forEach { it.complete(false) }
            completion(true)
            return
        }
        flush(ignoreBackoff = true) {
            synchronized(lock) { stopped = true }
            completion(it)
            executor.shutdown()
        }
    }

    private fun runFlush(ignoreBackoff: Boolean, operation: FlushOperation) {
        try {
            val pending = synchronized(lock) {
                if (stopped || (!ignoreBackoff && exportClockMillis() < nextExportAllowedAtMillis)) {
                    null
                } else {
                    measurements.toList().also { measurements.clear() }
                }
            }
            val succeeded = when {
                pending == null -> false
                pending.isEmpty() -> true
                operation.isCancelled() -> false
                else -> {
                    val body = OtlpPayload.build(configuration, pending)
                    val exported = !operation.isCancelled() && runCatching {
                        transport.post(configuration.endpoint, body, operation::isCancelled)
                    }.getOrDefault(false)
                    synchronized(lock) {
                        if (!stopped) {
                            if (!exported) restorePendingMeasurementsLocked(pending)
                            updateExportBackoffLocked(exported)
                        }
                    }
                    exported
                }
            }
            operation.complete(succeeded)
        } finally {
            synchronized(lock) { pendingFlushes -= operation }
        }
    }

    private fun recordCounter(name: String, attributes: Map<String, AttributeValue>) {
        record(
            Measurement(
                type = MeasurementType.Counter,
                name = name,
                value = 1.0,
                unit = null,
                attributes = attributes,
                timeUnixNano = clock(),
            ),
        )
    }

    private fun attributes(vararg values: Pair<String, AttributeValue>): Map<String, AttributeValue> = mapOf(
        *values,
        "product" to AttributeValue.StringValue(configuration.product.wireValue),
        "platform" to AttributeValue.StringValue(configuration.platform.wireValue),
    )

    private fun record(measurement: Measurement) {
        synchronized(lock) {
            if (stopped) return
            val capacity = configuration.maxPendingMeasurements.coerceAtLeast(1)
            if (measurements.size < capacity) measurements += measurement
        }
    }

    private fun updateExportBackoffLocked(succeeded: Boolean) {
        if (succeeded) {
            consecutiveExportFailures = 0
            nextExportAllowedAtMillis = 0
            return
        }
        consecutiveExportFailures += 1
        val exponent = min(consecutiveExportFailures - 1, MAX_EXPORT_BACKOFF_EXPONENT)
        val backoff = min(
            configuration.exportIntervalMillis.coerceAtLeast(1) * (1L shl exponent),
            MAX_EXPORT_BACKOFF_MILLIS,
        )
        nextExportAllowedAtMillis = exportClockMillis() + backoff
    }

    private fun restorePendingMeasurementsLocked(pending: List<Measurement>) {
        val capacity = configuration.maxPendingMeasurements.coerceAtLeast(1)
        val queuedDuringExport = measurements.toList()
        measurements.clear()
        measurements += (pending + queuedDuringExport).take(capacity)
    }
}

private class FlushOperation(
    private val completion: (Boolean) -> Unit,
) {
    var future: Future<*>? = null

    private val cancelled = AtomicBoolean(false)
    private val completed = AtomicBoolean(false)

    fun cancel() {
        cancelled.set(true)
    }

    fun isCancelled(): Boolean = cancelled.get() || Thread.currentThread().isInterrupted

    fun complete(succeeded: Boolean) {
        if (completed.compareAndSet(false, true)) completion(succeeded)
    }
}

internal fun interface TelemetryTransport {
    fun post(endpoint: String, body: String): Boolean

    fun post(endpoint: String, body: String, isCancelled: () -> Boolean): Boolean =
        if (isCancelled()) false else post(endpoint, body)

    fun cancel(): Unit = Unit
}

private class HttpTelemetryTransport : TelemetryTransport {
    private val lock = Any()
    private val activeConnections = mutableSetOf<HttpURLConnection>()

    override fun post(endpoint: String, body: String): Boolean = post(endpoint, body) { false }

    override fun post(endpoint: String, body: String, isCancelled: () -> Boolean): Boolean {
        var succeeded = false
        val connection = URI(endpoint).toURL().openConnection() as HttpURLConnection
        synchronized(lock) { activeConnections += connection }
        try {
            if (!isCancelled()) {
                connection.requestMethod = "POST"
                connection.connectTimeout = HTTP_TIMEOUT_MILLIS
                connection.readTimeout = HTTP_TIMEOUT_MILLIS
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
            }
            if (!isCancelled()) {
                connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body) }
                succeeded = connection.responseCode in HTTP_SUCCESS_MIN until HTTP_SUCCESS_MAX_EXCLUSIVE
            }
        } finally {
            synchronized(lock) { activeConnections -= connection }
            connection.disconnect()
        }
        return succeeded
    }

    override fun cancel() {
        synchronized(lock) { activeConnections.toList() }.forEach { it.disconnect() }
    }
}

private object OtlpPayload {
    fun build(configuration: CheckoutKitTelemetryConfiguration, measurements: List<Measurement>): String {
        val metrics = measurements.groupBy { GroupKey(it.type, it.name, it.attributes) }
            .values
            .sortedBy { it.first().name }
            .map(::metric)
        val resource = jsonObject(
            "attributes" to attributes(
                mapOf(
                    "service.name" to AttributeValue.StringValue("checkout-kit"),
                    "service.version" to AttributeValue.StringValue(configuration.sdkVersion),
                    "telemetry.sdk.language" to AttributeValue.StringValue(TELEMETRY_SDK_LANGUAGE),
                    "telemetry.sdk.name" to AttributeValue.StringValue(INSTRUMENTATION_NAME),
                    "telemetry.sdk.version" to AttributeValue.StringValue(configuration.sdkVersion),
                ),
            ),
        )
        val scope = jsonObject(
            "name" to JsonPrimitive(INSTRUMENTATION_NAME),
            "version" to JsonPrimitive(configuration.sdkVersion),
        )
        val scopeMetric = jsonObject("scope" to scope, "metrics" to JsonArray(metrics))
        val resourceMetric = jsonObject("resource" to resource, "scopeMetrics" to JsonArray(listOf(scopeMetric)))
        return jsonObject("resourceMetrics" to JsonArray(listOf(resourceMetric))).toString()
    }

    private fun metric(group: List<Measurement>): JsonObject {
        val first = group.first()
        val startTime = group.first().timeUnixNano.toString()
        val endTime = group.last().timeUnixNano.toString()
        return if (first.type == MeasurementType.Counter) {
            counterMetric(first, group.size, startTime, endTime)
        } else {
            histogramMetric(first, group.map { it.value }, startTime, endTime)
        }
    }

    private fun counterMetric(
        measurement: Measurement,
        count: Int,
        startTime: String,
        endTime: String,
    ): JsonObject {
        val point = jsonObject(
            "attributes" to attributes(measurement.attributes),
            "asInt" to JsonPrimitive(count.toString()),
            "startTimeUnixNano" to JsonPrimitive(startTime),
            "timeUnixNano" to JsonPrimitive(endTime),
        )
        val sum = jsonObject(
            "aggregationTemporality" to JsonPrimitive(OTLP_DELTA_TEMPORALITY),
            "isMonotonic" to JsonPrimitive(true),
            "dataPoints" to JsonArray(listOf(point)),
        )
        return jsonObject("name" to JsonPrimitive(measurement.name), "sum" to sum)
    }

    private fun histogramMetric(
        measurement: Measurement,
        values: List<Double>,
        startTime: String,
        endTime: String,
    ): JsonObject {
        val bucketCounts = MutableList(HISTOGRAM_BOUNDS.size + 1) { 0L }
        values.forEach { value ->
            val found = HISTOGRAM_BOUNDS.indexOfFirst { value <= it }
            bucketCounts[if (found < 0) bucketCounts.lastIndex else found] += 1
        }
        val point = jsonObject(
            "attributes" to attributes(measurement.attributes),
            "bucketCounts" to JsonArray(bucketCounts.map { JsonPrimitive(it.toString()) }),
            "count" to JsonPrimitive(values.size.toString()),
            "explicitBounds" to JsonArray(HISTOGRAM_BOUNDS.map(::JsonPrimitive)),
            "min" to JsonPrimitive(values.min()),
            "max" to JsonPrimitive(values.max()),
            "sum" to JsonPrimitive(values.sum()),
            "startTimeUnixNano" to JsonPrimitive(startTime),
            "timeUnixNano" to JsonPrimitive(endTime),
        )
        val histogram = jsonObject(
            "aggregationTemporality" to JsonPrimitive(OTLP_DELTA_TEMPORALITY),
            "dataPoints" to JsonArray(listOf(point)),
        )
        return jsonObject(
            "name" to JsonPrimitive(measurement.name),
            "unit" to JsonPrimitive(measurement.unit ?: ""),
            "histogram" to histogram,
        )
    }

    private fun attributes(values: Map<String, AttributeValue>): JsonArray = JsonArray(
        values.toSortedMap().map { (key, value) ->
            val encodedValue = when (value) {
                is AttributeValue.BooleanValue -> jsonObject("boolValue" to JsonPrimitive(value.value))
                is AttributeValue.StringValue -> jsonObject("stringValue" to JsonPrimitive(value.value))
            }
            jsonObject("key" to JsonPrimitive(key), "value" to encodedValue)
        },
    )

    private fun jsonObject(vararg values: Pair<String, JsonElement>): JsonObject = JsonObject(mapOf(*values))
}

private enum class MeasurementType {
    Counter,
    Histogram,
}

private sealed interface AttributeValue {
    data class StringValue(val value: String) : AttributeValue
    data class BooleanValue(val value: Boolean) : AttributeValue
}

private data class Measurement(
    val type: MeasurementType,
    val name: String,
    val value: Double,
    val unit: String?,
    val attributes: Map<String, AttributeValue>,
    val timeUnixNano: Long,
)

private data class GroupKey(
    val type: MeasurementType,
    val name: String,
    val attributes: Map<String, AttributeValue>,
)

private fun defaultExecutor(): ScheduledExecutorService =
    Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "ShopifyCheckoutKit-Telemetry").apply { isDaemon = true }
    }

private const val MAX_EXPORT_BACKOFF_MILLIS = 15 * 60_000L
private const val MAX_EXPORT_BACKOFF_EXPONENT = 4
private const val HTTP_TIMEOUT_MILLIS = 5_000
private const val HTTP_SUCCESS_MIN = 200
private const val HTTP_SUCCESS_MAX_EXCLUSIVE = 300
private const val NANOS_PER_MILLISECOND = 1_000_000L
private const val OTLP_DELTA_TEMPORALITY = 1
private const val INSTRUMENTATION_NAME = "checkout-kit-telemetry"
private const val TELEMETRY_SDK_LANGUAGE = "java"
private const val HISTOGRAM_BOUND_100_MS = 100.0
private const val HISTOGRAM_BOUND_250_MS = 250.0
private const val HISTOGRAM_BOUND_500_MS = 500.0
private const val HISTOGRAM_BOUND_1_SECOND = 1_000.0
private const val HISTOGRAM_BOUND_2_5_SECONDS = 2_500.0
private const val HISTOGRAM_BOUND_5_SECONDS = 5_000.0
private const val HISTOGRAM_BOUND_10_SECONDS = 10_000.0
private const val HISTOGRAM_BOUND_30_SECONDS = 30_000.0
private val HISTOGRAM_BOUNDS = listOf(
    HISTOGRAM_BOUND_100_MS,
    HISTOGRAM_BOUND_250_MS,
    HISTOGRAM_BOUND_500_MS,
    HISTOGRAM_BOUND_1_SECOND,
    HISTOGRAM_BOUND_2_5_SECONDS,
    HISTOGRAM_BOUND_5_SECONDS,
    HISTOGRAM_BOUND_10_SECONDS,
    HISTOGRAM_BOUND_30_SECONDS,
)
