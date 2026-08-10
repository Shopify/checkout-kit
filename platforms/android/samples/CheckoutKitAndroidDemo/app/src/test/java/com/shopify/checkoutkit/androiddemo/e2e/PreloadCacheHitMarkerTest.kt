package com.shopify.checkoutkit.androiddemo.e2e

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class PreloadCacheHitMarkerTest {
    @Test
    fun `marker ids match the maestro flow assertions`() {
        assertThat(PreloadCacheHitMarker.testId(observed = true)).isEqualTo("preload-cache-hit-observed")
        assertThat(PreloadCacheHitMarker.testId(observed = false)).isEqualTo("preload-cache-hit-none")
    }

    @Test
    fun `ignores a cache hit before the current observation boundary`() {
        val log = PreloadCacheHitLog(
            observationBoundary = CURRENT_BOUNDARY,
            isPreloadReady = { true },
        )

        log.record(CACHE_HIT_LINE)

        assertThat(log.observed.value).isFalse()
    }

    @Test
    fun `ignores an old observation boundary and its cache hit`() {
        val log = PreloadCacheHitLog(
            observationBoundary = CURRENT_BOUNDARY,
            isPreloadReady = { true },
        )

        log.record(boundaryLine(OLD_BOUNDARY))
        log.record(CACHE_HIT_LINE)

        assertThat(log.observed.value).isFalse()
    }

    @Test
    fun `records the cache-hit diagnostic after the current boundary when the preload is ready`() {
        val log = PreloadCacheHitLog(
            observationBoundary = CURRENT_BOUNDARY,
            isPreloadReady = { true },
        )

        log.record(boundaryLine(CURRENT_BOUNDARY))
        assertThat(log.observed.value).isFalse()

        log.record(CACHE_HIT_LINE)

        assertThat(log.observed.value).isTrue()
    }

    @Test
    fun `ignores a cache hit after the boundary before the preload is ready`() {
        var ready = false
        val log = PreloadCacheHitLog(
            observationBoundary = CURRENT_BOUNDARY,
            isPreloadReady = { ready },
        )
        log.record(boundaryLine(CURRENT_BOUNDARY))

        log.record(CACHE_HIT_LINE)

        assertThat(log.observed.value).isFalse()

        ready = true
        assertThat(log.observed.value).isFalse()

        log.record(CACHE_HIT_LINE)

        assertThat(log.observed.value).isTrue()
    }

    @Test
    fun `ignores unrelated lines after the current boundary`() {
        val log = PreloadCacheHitLog(
            observationBoundary = CURRENT_BOUNDARY,
            isPreloadReady = { true },
        )
        log.record(boundaryLine(CURRENT_BOUNDARY))

        log.record("D PreloadCache: Preloading checkout")
        log.record("I Timber: Preload state changed to Ready")

        assertThat(log.observed.value).isFalse()
    }

    @Test
    fun `writes the boundary and reads only the current observation`() {
        runBlocking {
            val lines = listOf(
                CACHE_HIT_LINE,
                boundaryLine(CURRENT_BOUNDARY),
                "D PreloadCache: Preloading checkout",
                CACHE_HIT_LINE,
            )
            val streamClosed = AtomicBoolean(false)
            var writtenBoundary: String? = null
            val log = PreloadCacheHitLog(
                observationBoundary = CURRENT_BOUNDARY,
                openLines = {
                    LogStream(lines.asSequence()) {
                        streamClosed.set(true)
                    }
                },
                writeBoundary = { writtenBoundary = it },
                isPreloadReady = { true },
            )

            log.start(this, Dispatchers.Unconfined).join()

            assertThat(writtenBoundary).isEqualTo(CURRENT_BOUNDARY)
            assertThat(log.observed.value).isTrue()
            assertThat(streamClosed.get()).isTrue()
        }
    }

    @Test
    fun `reports a logcat reader failure`() {
        runBlocking {
            val failure = IllegalStateException("logcat unavailable")
            var reported: Throwable? = null
            val log = PreloadCacheHitLog(
                openLines = { throw failure },
                reportError = { reported = it },
            )

            log.start(this, Dispatchers.Unconfined).join()

            assertThat(reported).isSameAs(failure)
        }
    }

    @Test
    fun `close releases a blocking logcat stream`() {
        runBlocking {
            val reading = CountDownLatch(1)
            val release = CountDownLatch(1)
            val streamClosed = AtomicBoolean(false)
            val lines = sequence<String> {
                reading.countDown()
                release.await()
            }
            val log = PreloadCacheHitLog(
                openLines = {
                    LogStream(lines) {
                        streamClosed.set(true)
                        release.countDown()
                    }
                },
                writeBoundary = {},
            )
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
            val job = log.start(scope)

            try {
                assertThat(reading.await(5, TimeUnit.SECONDS)).isTrue()

                log.close()
                withTimeout(5_000) { job.join() }

                assertThat(streamClosed.get()).isTrue()
            } finally {
                log.close()
                release.countDown()
                scope.cancel()
            }
        }
    }

    private fun boundaryLine(boundary: String): String =
        "D PreloadObservability: $boundary"

    private companion object {
        const val CURRENT_BOUNDARY = "Observation started: current-run"
        const val OLD_BOUNDARY = "Observation started: old-run"
        const val CACHE_HIT_LINE =
            "08-17 18:53:55.395 5398 5398 D PreloadCache: Returning cached preloaded WebView."
    }
}
