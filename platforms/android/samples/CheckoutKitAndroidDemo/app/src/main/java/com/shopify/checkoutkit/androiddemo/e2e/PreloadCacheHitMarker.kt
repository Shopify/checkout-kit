package com.shopify.checkoutkit.androiddemo.e2e

import android.os.Process
import com.shopify.checkoutkit.androiddemo.accessibility.AccessibilityIdentifiers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Maps how many ready preload cache hits the SDK reported to an identifier.
 *
 * A count, rather than a flag, lets a flow tell the first presentation's hit apart from a later
 * presentation that reuses the same preloaded checkout.
 */
object PreloadCacheHitMarker {
    fun testId(hits: Int): String = "${AccessibilityIdentifiers.PRELOAD_CACHE_HIT_PREFIX}$hits"
}

/** A Logcat stream plus the resources that must be closed to stop reading it. */
class LogStream(
    val lines: Sequence<String>,
    private val closeAction: () -> Unit = {},
) {
    private val closed = AtomicBoolean(false)

    fun close() {
        if (closed.compareAndSet(false, true)) closeAction()
    }
}

/**
 * Counts the ready SDK cache hits in this app's PID-scoped Logcat.
 *
 * The SDK log sink is internal, so the sample reads its own logs instead of installing a logger.
 * A unique boundary keeps buffered lines from an earlier app process outside this observation.
 */
class PreloadCacheHitLog(
    private val observationBoundary: String = "$OBSERVATION_BOUNDARY_PREFIX${UUID.randomUUID()}",
    private val openLines: () -> LogStream = ::followOwnLogcat,
    private val writeBoundary: (String) -> Unit = { Timber.tag(OBSERVATION_TAG).d(it) },
    private val isPreloadReady: () -> Boolean = { false },
    private val onStateHeld: () -> Unit = {},
    private val reportError: (Throwable) -> Unit = {
        Timber.e(it, "Failed to observe the preload cache-hit diagnostic")
    },
) {
    companion object {
        /** Must stay in step with PreloadCache.kt, which logs this on a cache hit. */
        const val DIAGNOSTIC = "Returning cached preloaded WebView."

        /** Must stay in step with PreloadCache.kt, which logs this when it holds a presented state. */
        const val HELD_STATE_DIAGNOSTIC = "Holding preload state until checkout is dismissed."

        private const val OBSERVATION_TAG = "PreloadObservability"
        private const val OBSERVATION_BOUNDARY_PREFIX = "Observation started: "

        /** Follows this process's SDK diagnostics plus the boundary that arms this observation. */
        private fun followOwnLogcat(): LogStream {
            val process = ProcessBuilder(
                "logcat",
                "-T",
                "1",
                "--pid=${Process.myPid()}",
                "$OBSERVATION_TAG:D",
                "PreloadCache:D",
                "*:S",
            ).redirectErrorStream(true).start()
            val reader = BufferedReader(InputStreamReader(process.inputStream))

            return LogStream(reader.lineSequence()) {
                process.destroy()
                runCatching { reader.close() }
            }
        }
    }

    private val _hits = MutableStateFlow(0)
    val hits: StateFlow<Int> = _hits.asStateFlow()

    private val resourceLock = Any()
    private var stream: LogStream? = null
    private var job: Job? = null
    private var closed = false
    private var observationStarted = false

    fun start(scope: CoroutineScope, dispatcher: CoroutineDispatcher = Dispatchers.IO): Job {
        check(job == null) { "Preload cache-hit observation already started" }

        return scope.launch(dispatcher) {
            try {
                val opened = openLines()
                val shouldRead = synchronized(resourceLock) {
                    if (closed) {
                        false
                    } else {
                        stream = opened
                        true
                    }
                }

                if (!shouldRead) {
                    opened.close()
                    return@launch
                }

                writeBoundary(observationBoundary)
                opened.lines.forEach(::record)
            } catch (_: CancellationException) {
                // Closing the observer cancels its reader; that is expected and not an error.
            } catch (error: Exception) {
                if (synchronized(resourceLock) { !closed }) reportError(error)
            } finally {
                closeStream()
            }
        }.also { job = it }
    }

    fun close() {
        val opened = synchronized(resourceLock) {
            if (closed) return
            closed = true
            stream.also { stream = null }
        }

        opened?.close()
        job?.cancel()
    }

    fun record(line: String) {
        if (!observationStarted) {
            if (line.contains(observationBoundary)) observationStarted = true
            return
        }

        if (line.contains(DIAGNOSTIC) && isPreloadReady()) {
            _hits.update { it + 1 }
        }
        if (line.contains(HELD_STATE_DIAGNOSTIC)) onStateHeld()
    }

    private fun closeStream() {
        val opened = synchronized(resourceLock) {
            stream.also { stream = null }
        }
        opened?.close()
    }
}
