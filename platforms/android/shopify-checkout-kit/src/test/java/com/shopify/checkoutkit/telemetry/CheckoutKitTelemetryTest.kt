package com.shopify.checkoutkit.telemetry

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

class CheckoutKitTelemetryTest {
    @Test
    fun `aggregates counters with closed attributes`() {
        val request = RecordedRequest()
        val times = ArrayDeque(listOf(1_000_000L, 2_000_000L))
        val executor = Executors.newSingleThreadScheduledExecutor()
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(
                sdkVersion = "1.2.3",
                product = TelemetryProduct.AcceleratedCheckouts,
                platform = TelemetryPlatform.ReactNativeAndroid,
            ),
            clock = { times.removeFirst() },
            transport = TelemetryTransport { endpoint, body ->
                request.endpoint = endpoint
                request.body = body
                true
            },
            executor = executor,
        )
        val metric = TelemetryErrorMetric(
            TelemetryErrorCategory.Http,
            TelemetryErrorStage.Load,
            TelemetryErrorCode.Server,
            retryable = true,
            isRetry = true,
        )

        telemetry.recordError(metric)
        telemetry.recordError(metric)
        val result = flush(telemetry)

        assertThat(result).isTrue()
        assertThat(request.endpoint).isEqualTo(CheckoutKitTelemetry.PRODUCTION_ENDPOINT)
        assertThat(request.body).contains("\"checkout_kit_error\"")
        assertThat(request.body).contains("\"asInt\":\"2\"")
        assertThat(request.body).contains(
            "\"key\":\"service.name\",\"value\":{\"stringValue\":\"checkout-kit\"}",
            "\"key\":\"service.version\",\"value\":{\"stringValue\":\"1.2.3\"}",
            "\"key\":\"telemetry.sdk.language\",\"value\":{\"stringValue\":\"java\"}",
            "\"key\":\"telemetry.sdk.name\",\"value\":{\"stringValue\":\"checkout-kit-telemetry\"}",
            "\"key\":\"telemetry.sdk.version\",\"value\":{\"stringValue\":\"1.2.3\"}",
            "\"key\":\"platform\",\"value\":{\"stringValue\":\"react-native-android\"}",
            "\"key\":\"product\",\"value\":{\"stringValue\":\"accelerated_checkouts\"}",
            "\"key\":\"is_retry\",\"value\":{\"boolValue\":true}",
        )
        assertThat(request.body).doesNotContain("\"key\":\"integration\"")
        assertThat(request.body).doesNotContain("checkoutUrl", "error.message")
        executor.shutdownNow()
    }

    @Test
    fun `bounds pending measurements and isolates export failure`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val exportAttempts = AtomicInteger()
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(
                sdkVersion = "1.2.3",
                maxPendingMeasurements = 1,
            ),
            clock = { 1 },
            transport = TelemetryTransport { _, _ ->
                exportAttempts.incrementAndGet()
                error("unavailable")
            },
            executor = executor,
            exportClockMillis = { 1_000 },
        )

        telemetry.recordNavigationRetry(
            TelemetryNavigationRetryMetric(
                TelemetryNavigationRetryReason.Timeout,
                TelemetryNavigationRetryResult.Started,
            ),
        )
        telemetry.recordNavigationRetry(
            TelemetryNavigationRetryMetric(
                TelemetryNavigationRetryReason.Dns,
                TelemetryNavigationRetryResult.Failed,
            ),
        )

        assertThat(flush(telemetry)).isFalse()
        telemetry.recordNavigationRetry(
            TelemetryNavigationRetryMetric(
                TelemetryNavigationRetryReason.Timeout,
                TelemetryNavigationRetryResult.Failed,
            ),
        )
        assertThat(flush(telemetry)).isFalse()
        assertThat(exportAttempts).hasValue(1)
        executor.shutdownNow()
    }

    @Test
    fun `records finite non-negative durations only`() {
        val request = RecordedRequest()
        val executor = Executors.newSingleThreadScheduledExecutor()
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            clock = { 1 },
            transport = TelemetryTransport { _, body ->
                request.body = body
                true
            },
            executor = executor,
        )

        telemetry.recordNavigationDuration(
            TelemetryNavigationDurationMetric(Double.NaN, TelemetryNavigationDurationResult.Failure, false),
        )
        telemetry.recordNavigationDuration(
            TelemetryNavigationDurationMetric(450.0, TelemetryNavigationDurationResult.Success, false),
        )

        assertThat(flush(telemetry)).isTrue()
        assertThat(request.body).contains("\"count\":\"1\"", "\"sum\":450.0")
        executor.shutdownNow()
    }

    @Test
    fun `shutdown bypasses export backoff`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val exportAttempts = AtomicInteger()
        val request = RecordedRequest()
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            transport = TelemetryTransport { _, body ->
                request.body = body
                exportAttempts.incrementAndGet() > 1
            },
            executor = executor,
            exportClockMillis = { 1_000 },
        )
        val metric = TelemetryErrorMetric(
            TelemetryErrorCategory.Http,
            TelemetryErrorStage.Load,
            TelemetryErrorCode.Server,
            retryable = true,
        )
        telemetry.recordError(metric)
        assertThat(flush(telemetry)).isFalse()
        telemetry.recordError(metric)

        val latch = CountDownLatch(1)
        var result = false
        telemetry.shutdown {
            result = it
            latch.countDown()
        }

        assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(result).isTrue()
        assertThat(exportAttempts).hasValue(2)
        assertThat(request.body).contains("\"asInt\":\"2\"")
    }

    @Test
    fun `accepts methods added to the generated protocol catalog`() {
        val request = RecordedRequest()
        val executor = Executors.newSingleThreadScheduledExecutor()
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            transport = TelemetryTransport { _, body ->
                request.body = body
                true
            },
            executor = executor,
        )

        telemetry.recordProtocolDecodeError(
            TelemetryProtocolDecodeErrorMetric(
                TelemetryProtocolMethod.fromMethod("ec.buyer.change"),
                TelemetryDecodeFailureType.Params,
            ),
        )

        assertThat(flush(telemetry)).isTrue()
        assertThat(request.body).contains("ec.buyer.change")
        executor.shutdownNow()
    }

    @Test
    fun `discard shutdown cancels transport and isolates later lifecycle calls`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val cancelled = AtomicBoolean()
        val transport = object : TelemetryTransport {
            override fun post(endpoint: String, body: String): Boolean {
                while (!cancelled.get()) Thread.yield()
                return false
            }

            override fun cancel() {
                cancelled.set(true)
            }
        }
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            clock = { 1 },
            transport = transport,
            executor = executor,
        )
        telemetry.recordError(
            TelemetryErrorMetric(
                TelemetryErrorCategory.Http,
                TelemetryErrorStage.Load,
                TelemetryErrorCode.Server,
                retryable = true,
            ),
        )
        telemetry.flush()

        var shutdownResult = false
        telemetry.shutdown(discardPending = true) { shutdownResult = it }
        telemetry.start()

        assertThat(shutdownResult).isTrue()
        assertThat(cancelled).isTrue()
        assertThat(flush(telemetry)).isFalse()
        telemetry.shutdown { assertThat(it).isTrue() }
    }

    @Test
    fun `discard shutdown completes active and queued flush callbacks`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val cancelled = AtomicBoolean()
        val exportStarted = CountDownLatch(1)
        val transport = object : TelemetryTransport {
            override fun post(endpoint: String, body: String): Boolean {
                exportStarted.countDown()
                while (!cancelled.get()) Thread.yield()
                return false
            }

            override fun cancel() {
                cancelled.set(true)
            }
        }
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            clock = { 1 },
            transport = transport,
            executor = executor,
        )
        telemetry.recordError(
            TelemetryErrorMetric(
                TelemetryErrorCategory.Http,
                TelemetryErrorStage.Load,
                TelemetryErrorCode.Server,
                retryable = true,
            ),
        )
        val activeFlushLatch = CountDownLatch(1)
        var activeFlushResult = true
        telemetry.flush {
            activeFlushResult = it
            activeFlushLatch.countDown()
        }
        assertThat(exportStarted.await(5, TimeUnit.SECONDS)).isTrue()

        val queuedFlushLatch = CountDownLatch(1)
        var queuedFlushResult = true
        telemetry.flush {
            queuedFlushResult = it
            queuedFlushLatch.countDown()
        }
        val shutdownLatch = CountDownLatch(1)
        var shutdownResult = false
        telemetry.shutdown(discardPending = true) {
            shutdownResult = it
            shutdownLatch.countDown()
        }

        assertThat(shutdownLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(activeFlushLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(queuedFlushLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(shutdownResult).isTrue()
        assertThat(activeFlushResult).isFalse()
        assertThat(queuedFlushResult).isFalse()
    }

    @Test
    fun `discard shutdown prevents upload after measurements are drained`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val postEntered = CountDownLatch(1)
        val cancelled = CountDownLatch(1)
        val uploadStarted = AtomicBoolean()
        val transport = object : TelemetryTransport {
            override fun post(endpoint: String, body: String): Boolean = error("unused")

            override fun post(endpoint: String, body: String, isCancelled: () -> Boolean): Boolean {
                postEntered.countDown()
                cancelled.await(5, TimeUnit.SECONDS)
                if (!isCancelled()) uploadStarted.set(true)
                return false
            }

            override fun cancel() {
                cancelled.countDown()
            }
        }
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            clock = { 1 },
            transport = transport,
            executor = executor,
        )
        telemetry.recordError(
            TelemetryErrorMetric(
                TelemetryErrorCategory.Http,
                TelemetryErrorStage.Load,
                TelemetryErrorCode.Server,
                retryable = true,
            ),
        )
        val flushLatch = CountDownLatch(1)
        var flushResult = true
        telemetry.flush {
            flushResult = it
            flushLatch.countDown()
        }
        assertThat(postEntered.await(5, TimeUnit.SECONDS)).isTrue()

        val shutdownLatch = CountDownLatch(1)
        var shutdownResult = false
        telemetry.shutdown(discardPending = true) {
            shutdownResult = it
            shutdownLatch.countDown()
        }

        assertThat(shutdownLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(flushLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(shutdownResult).isTrue()
        assertThat(flushResult).isFalse()
        assertThat(uploadStarted).isFalse()
    }

    @Test
    fun `default transport cancellation state is scoped per exporter`() {
        val firstExecutor = Executors.newSingleThreadScheduledExecutor()
        val secondExecutor = Executors.newSingleThreadScheduledExecutor()
        val firstTelemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            executor = firstExecutor,
        )
        val secondTelemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            executor = secondExecutor,
        )

        try {
            assertThat(transportOf(firstTelemetry)).isNotSameAs(transportOf(secondTelemetry))
        } finally {
            firstExecutor.shutdownNow()
            secondExecutor.shutdownNow()
        }
    }

    @Test
    fun `queued flush respects backoff created by active export failure`() {
        val executor = Executors.newSingleThreadScheduledExecutor()
        val exportAttempts = AtomicInteger()
        val exportStarted = CountDownLatch(1)
        val releaseExport = CountDownLatch(1)
        val telemetry = OtlpExporter(
            configuration = CheckoutKitTelemetryConfiguration(sdkVersion = "1.2.3"),
            clock = { 1 },
            transport = TelemetryTransport { _, _ ->
                exportAttempts.incrementAndGet()
                exportStarted.countDown()
                releaseExport.await(5, TimeUnit.SECONDS)
                false
            },
            executor = executor,
            exportClockMillis = { 1_000 },
        )
        telemetry.recordError(
            TelemetryErrorMetric(
                TelemetryErrorCategory.Http,
                TelemetryErrorStage.Load,
                TelemetryErrorCode.Server,
                retryable = true,
            ),
        )
        val activeFlushLatch = CountDownLatch(1)
        var activeFlushResult = true
        telemetry.flush {
            activeFlushResult = it
            activeFlushLatch.countDown()
        }
        assertThat(exportStarted.await(5, TimeUnit.SECONDS)).isTrue()

        val queuedFlushLatch = CountDownLatch(1)
        var queuedFlushResult = true
        telemetry.flush {
            queuedFlushResult = it
            queuedFlushLatch.countDown()
        }
        releaseExport.countDown()

        assertThat(activeFlushLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(queuedFlushLatch.await(5, TimeUnit.SECONDS)).isTrue()
        assertThat(activeFlushResult).isFalse()
        assertThat(queuedFlushResult).isFalse()
        assertThat(exportAttempts).hasValue(1)
        executor.shutdownNow()
    }

    private fun flush(telemetry: OtlpExporter): Boolean {
        val latch = CountDownLatch(1)
        var result = false
        telemetry.flush {
            result = it
            latch.countDown()
        }
        assertThat(latch.await(5, TimeUnit.SECONDS)).isTrue()
        return result
    }

    private fun transportOf(telemetry: OtlpExporter): Any {
        val field = OtlpExporter::class.java.getDeclaredField("transport")
        field.isAccessible = true
        return requireNotNull(field.get(telemetry))
    }
}

private class RecordedRequest {
    @Volatile var endpoint: String? = null

    @Volatile var body: String? = null
}
